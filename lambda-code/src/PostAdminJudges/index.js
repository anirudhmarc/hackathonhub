// post-admin-judges/index.js - Creates judge in DB (scoped to hackathon) + invokes CognitoUserManager
import t from '/opt/nodejs/tenancy.js';
import crypto from 'crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// maxAttempts: 1 — no SDK retries; the Cognito user creation is fire-and-forget so a
// slow/unreachable Lambda endpoint must never block the judge-creation response
// (we also Promise.race it against a short timeout below).
const lambdaClient = new LambdaClient({ region: process.env.REGION || 'us-east-1', maxAttempts: 1 });

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
// Function name is injected by Terraform (COGNITO_MANAGER_FUNCTION). Fallback derives
// it from the platform naming convention using PROJECT_NAME + ENVIRONMENT.
const COGNITO_MANAGER_FUNCTION = process.env.COGNITO_MANAGER_FUNCTION
  || `${process.env.PROJECT_NAME || 'hackhub'}-${process.env.ENVIRONMENT || 'dev'}-CognitoUserManager`;

async function invokeCognitoManager(email, name, groupName) {
  const payload = {
    userPoolId: COGNITO_USER_POOL_ID,
    username: email,
    name: name,
    groupName: groupName,
  };

  // Fire-and-forget: the DB judge row + membership are the source of truth; the
  // Cognito login is provisioning that can complete out-of-band. Async invoke
  // (Event) avoids blocking the request on CognitoUserManager cold starts.
  // Race the async invoke against a hard 4s cap so we never block on networking.
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('cognito-invoke-timeout')), 4000));
  await Promise.race([
    lambdaClient.send(new InvokeCommand({
      FunctionName: COGNITO_MANAGER_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload),
    })),
    timeout,
  ]);
  return { queued: true };
}

export const handler = async (event) => {
  try {
    const caller = t.getCaller(event);
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) {
      return t.respond(400, { message: 'Missing hackathonId in path parameters.' });
    }

    const body = JSON.parse(event.body);
    const { judge_name, email_address } = body;

    if (!judge_name || !email_address) {
      return t.respond(400, { message: 'Missing required fields: judge_name, email_address.' });
    }

    const conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'host');

    // Step 1: Insert into database (scoped to hackathon)
    let judgeId;
    let dbResult = 'created';
    try {
      judgeId = crypto.randomUUID();
      await conn.execute(
        'INSERT INTO Judge (judge_id, hackathon_id, judge_name, email_address) VALUES (?, ?, ?, ?)',
        [judgeId, hackathonId, judge_name, email_address]
      );
    } catch (dbError) {
      if (dbError.code === 'ER_DUP_ENTRY') {
        console.warn(`Judge with email ${email_address} already exists in this hackathon, proceeding to Cognito creation`);
        const [rows] = await conn.execute(
          'SELECT judge_id FROM Judge WHERE hackathon_id = ? AND email_address = ?',
          [hackathonId, email_address]
        );
        judgeId = rows[0]?.judge_id;
        dbResult = 'already_exists';
      } else {
        throw dbError;
      }
    }

    // Step 1b: Ensure a judge membership row so this judge can act on the hackathon.
    try {
      await conn.execute(
        'INSERT INTO Hackathon_Membership (membership_id, hackathon_id, email_address, role) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), hackathonId, email_address, 'judge']
      );
    } catch (memErr) {
      if (memErr.code !== 'ER_DUP_ENTRY') throw memErr;
    }

    // Step 2: Invoke CognitoUserManager (non-VPC Lambda) for Cognito account creation
    let cognitoResult = {};
    try {
      cognitoResult = await invokeCognitoManager(email_address, judge_name, 'Judges');
      console.log('Cognito account ensured for judge:', judge_name);
    } catch (cognitoError) {
      console.error('CognitoUserManager invocation failed:', cognitoError);
      cognitoResult = { warning: `Cognito creation failed: ${cognitoError.message}` };
    }

    return t.respond(dbResult === 'created' ? 201 : 200, {
      message: dbResult === 'created' ? 'Judge created successfully' : 'Judge already exists, Cognito account ensured',
      judgeId: judgeId,
      cognito: cognitoResult,
    });
  } catch (error) {
    console.error('Error creating judge:', error);
    if (error instanceof t.HttpError) {
      return t.respond(error.statusCode, { message: error.message });
    }
    return t.respond(500, { message: 'Failed to create judge', error: error.message });
  }
};
