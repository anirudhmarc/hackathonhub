// ApproveParticipant — POST /hackathons/{hackathonId}/admin/participants/{id}/approve
// Reads a DynamoDB registration, provisions RDS Leader/Team scoped to the
// registration's hackathon, writes participant memberships, fires Cognito user
// creation (async), and marks the registration APPROVED.
import { createRequire } from 'module';
import mysql from 'mysql2/promise';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import crypto from 'crypto';

// Bridge the CommonJS tenancy layer (/opt/nodejs/tenancy.js) into this ES module.
const require = createRequire(import.meta.url);
const t = require('/opt/nodejs/tenancy');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'HackathonRegistrations';
const COGNITO_MANAGER_FUNCTION = process.env.COGNITO_MANAGER_FUNCTION
  || `${process.env.PROJECT_NAME || 'hackhub'}-${process.env.ENVIRONMENT || 'dev'}-CognitoUserManager`;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const secrets = new SecretsManagerClient({ region: REGION });
const lambda = new LambdaClient({ region: REGION, maxAttempts: 1 });

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Hackathon-Id',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const resp = (statusCode, obj) => ({ statusCode, headers: HEADERS, body: JSON.stringify(obj) });

async function dbCreds() {
  const d = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  return JSON.parse(d.SecretString);
}

// Fire-and-forget Cognito user creation (raced against a short cap).
async function ensureCognito(email, name, groupName) {
  const payload = { userPoolId: COGNITO_USER_POOL_ID, username: email, name, groupName };
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('cognito-timeout')), 4000));
  try {
    await Promise.race([
      lambda.send(new InvokeCommand({ FunctionName: COGNITO_MANAGER_FUNCTION, InvocationType: 'Event', Payload: JSON.stringify(payload) })),
      timeout,
    ]);
  } catch (e) {
    console.warn('Cognito invoke (non-fatal):', email, e.message);
  }
}

export const handler = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method;
  if (method === 'OPTIONS') return resp(200, { message: 'ok' });

  let connection;
  try {
    const participantId = event.pathParameters?.id;
    if (!participantId) return resp(400, { message: 'Participant ID is required.' });

    // Tenant scope comes from the PATH only — never the fetched record.
    const hackathonId = event.pathParameters?.hackathonId;
    if (!hackathonId) return resp(400, { message: 'Missing hackathon id' });

    // Authorize: caller must be a host of THIS hackathon (Admins bypass).
    const caller = t.getCaller(event);
    const authConn = await t.getConnection();
    await t.assertMembership(authConn, caller, hackathonId, 'host');

    // Registrations are keyed by `id`.
    const getResult = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { participant_id: participantId } }));
    if (!getResult.Item) return resp(404, { message: 'Participant not found.' });
    const participant = getResult.Item;

    // Prevent split-brain: the registration MUST belong to the authorized hackathon.
    // Otherwise a host of hackathon A could approve a registration in hackathon B.
    if (participant.hackathon_id && participant.hackathon_id !== hackathonId) {
      return resp(404, { message: 'Participant not found.' });
    }

    const leaderInfo = typeof participant.leader === 'string' ? JSON.parse(participant.leader) : participant.leader;
    const membersInfo = typeof participant.members === 'string' ? JSON.parse(participant.members) : (participant.members || []);
    const leaderEmail = leaderInfo.email;
    const teamName = participant.teamName;
    const allEmails = Array.isArray(participant.emails) ? participant.emails : [leaderEmail];

    const creds = await dbCreds();
    connection = await mysql.createConnection({
      host: process.env.DB_HOST, user: creds.username, password: creds.password,
      database: process.env.DB_DATABASE, port: parseInt(process.env.DB_PORT || '3306', 10),
    });

    // Resolve the hackathon's track (per-tenant, not by global title).
    const [trackRows] = await connection.execute(
      'SELECT track_id FROM Track WHERE hackathon_id = ? ORDER BY track_title ASC LIMIT 1',
      [hackathonId]
    );
    if (trackRows.length === 0) throw new Error('Hackathon has no track configured.');
    const trackId = trackRows[0].track_id;

    // Leader (scoped by hackathon + email).
    const [existingLeaders] = await connection.execute(
      'SELECT leader_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
      [leaderEmail, hackathonId]
    );
    let leaderId;
    if (existingLeaders.length > 0) {
      leaderId = existingLeaders[0].leader_id;
    } else {
      leaderId = crypto.randomUUID();
      await connection.execute(
        'INSERT INTO Leader (leader_id, hackathon_id, email_address, track_id) VALUES (?, ?, ?, ?)',
        [leaderId, hackathonId, leaderEmail, trackId]
      );
    }

    // Team (scoped by hackathon).
    const [existingTeams] = await connection.execute(
      'SELECT team_id FROM Team WHERE leader_id = ? AND hackathon_id = ?',
      [leaderId, hackathonId]
    );
    let teamId;
    if (existingTeams.length > 0) {
      teamId = existingTeams[0].team_id;
      await connection.execute('UPDATE Team SET team_name = ? WHERE team_id = ? AND hackathon_id = ?', [teamName, teamId, hackathonId]);
    } else {
      teamId = crypto.randomUUID();
      await connection.execute(
        'INSERT INTO Team (team_id, hackathon_id, leader_id, team_name) VALUES (?, ?, ?, ?)',
        [teamId, hackathonId, leaderId, teamName]
      );
    }
    await connection.execute('UPDATE Leader SET team_id = ? WHERE leader_id = ? AND hackathon_id = ?', [teamId, leaderId, hackathonId]);

    // Build email→name map (leader + members).
    const emailNameMap = new Map();
    emailNameMap.set(leaderEmail.toLowerCase(), leaderInfo.name || leaderEmail);
    const nonLeader = allEmails.filter(e => e.toLowerCase() !== leaderEmail.toLowerCase());
    for (let i = 0; i < nonLeader.length; i++) {
      emailNameMap.set(nonLeader[i].toLowerCase(), (Array.isArray(membersInfo) ? membersInfo[i]?.name : null) || nonLeader[i]);
    }

    // Participant membership rows (so each teammate can act on the hackathon) + Cognito.
    for (const [email, name] of emailNameMap) {
      try {
        await connection.execute(
          'INSERT INTO Hackathon_Membership (membership_id, hackathon_id, email_address, role) VALUES (?, ?, ?, ?)',
          [crypto.randomUUID(), hackathonId, email, 'participant']
        );
      } catch (e) { if (e.code !== 'ER_DUP_ENTRY') throw e; }
      await ensureCognito(email, name, 'Participants');
    }

    // Mark registration APPROVED.
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { participant_id: participantId },
      UpdateExpression: 'SET #status = :approved',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':approved': 'APPROVED' },
    }));

    return resp(200, {
      message: 'Participant approved successfully',
      hackathon_id: hackathonId,
      rds: { leader_id: leaderId, team_id: teamId, track_id: trackId },
    });
  } catch (error) {
    if (error && error.statusCode) {
      return resp(error.statusCode, { message: error.message });
    }
    console.error('ApproveParticipant error:', error);
    return resp(500, { message: 'Failed to approve participant', error: error.message });
  } finally {
    if (connection) { try { await connection.end(); } catch (e) { /* ignore */ } }
  }
};
