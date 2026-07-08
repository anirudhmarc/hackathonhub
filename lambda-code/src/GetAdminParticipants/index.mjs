// get-participants/index.js - multi-tenant: filters registrations by hackathon_id
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'HackathonRegistrations';

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Hackathon-Id',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

const resolveHackathonId = (event) => {
  const pp = event.pathParameters || {};
  if (pp.hackathonId) return pp.hackathonId;
  const h = event.headers || {};
  return h['X-Hackathon-Id'] || h['x-hackathon-id'] || event.queryStringParameters?.hackathonId || null;
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ message: 'ok' }) };

  try {
    const hackathonId = resolveHackathonId(event);
    if (!hackathonId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing hackathon id' }) };

    // Filter registrations to this hackathon.
    const data = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'hackathon_id = :h',
      ExpressionAttributeValues: { ':h': hackathonId },
    }));

    const parseMaybe = (v, fallback) => {
      if (typeof v === 'string' && v.trim() !== '') {
        try { return JSON.parse(v); } catch (e) { return fallback; }
      }
      return v ?? fallback;
    };

    const participants = (data.Items || []).map(item => {
      const leaderData = (() => { const p = parseMaybe(item.leader, null); return p && typeof p === 'object' ? p : null; })();
      const membersData = (() => { const p = parseMaybe(item.members, []); return Array.isArray(p) ? p : []; })();
      const emailsData = (() => { const p = parseMaybe(item.emails, []); return Array.isArray(p) ? p : []; })();
      const pid = item.participant_id || item.id;
      return {
        id: pid,
        participant_id: pid,
        hackathon_id: item.hackathon_id,
        agreeEmailCommunications: item.agreeEmailCommunications || false,
        agreeMarketingEmails: item.agreeMarketingEmails || false,
        agreeTermsConditions: item.agreeTermsConditions || false,
        emails: emailsData,
        leader: leaderData,
        memberCount: item.memberCount || 0,
        members: membersData,
        status: item.status || 'PENDING_APPROVAL',
        submittedAt: item.submittedAt || new Date().toISOString(),
        teamName: item.teamName || '',
        track: item.track || '',
      };
    });

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(participants) };
  } catch (error) {
    console.error('Error fetching participants:', error);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) };
  }
};
