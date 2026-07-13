// delete-admin-judges/index.js - Deletes judge from DB (scoped to hackathon) + Cognito
const t = require('/opt/nodejs/tenancy');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: process.env.REGION || 'ap-southeast-2' });

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_MANAGER_FUNCTION = process.env.COGNITO_MANAGER_FUNCTION || 'hackhub-test-13-prod-CognitoUserManager';

exports.handler = async (event) => {
  try {
    const caller = t.getCaller(event);
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) {
      return t.respond(400, { message: 'Missing hackathonId in path parameters.' });
    }

    const judgeId = event.pathParameters?.judgeId;
    if (!judgeId) {
      return t.respond(400, { message: 'Missing judgeId in path parameters.' });
    }

    const conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'host');

    // Step 1: Get judge email before deleting (needed for Cognito cleanup)
    const [judgeRows] = await conn.execute(
      'SELECT email_address FROM Judge WHERE judge_id = ? AND hackathon_id = ?',
      [judgeId, hackathonId]
    );
    const judgeEmail = judgeRows[0]?.email_address;

    // Step 2: Delete related records first to avoid foreign key constraint errors
    const [scoresResult] = await conn.execute(
      'DELETE FROM Score WHERE judge_id = ? AND hackathon_id = ?',
      [judgeId, hackathonId]
    );
    console.log(`Deleted ${scoresResult.affectedRows} scores for judge ${judgeId}`);

    const [assignmentsResult] = await conn.execute(
      'DELETE FROM Judge_Assignment WHERE judge_id = ? AND hackathon_id = ?',
      [judgeId, hackathonId]
    );
    console.log(`Deleted ${assignmentsResult.affectedRows} assignments for judge ${judgeId}`);

    // Step 3: Delete the judge from DB (scoped to hackathon)
    const [result] = await conn.execute(
      'DELETE FROM Judge WHERE judge_id = ? AND hackathon_id = ?',
      [judgeId, hackathonId]
    );

    if (result.affectedRows === 0) {
      return t.respond(404, { message: 'Judge not found.' });
    }

    // Step 4: Delete from Cognito via CognitoUserManager
    let cognitoResult = {};
    if (judgeEmail) {
      try {
        const response = await lambdaClient.send(new InvokeCommand({
          FunctionName: COGNITO_MANAGER_FUNCTION,
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify({
            action: 'delete',
            userPoolId: COGNITO_USER_POOL_ID,
            username: judgeEmail,
          }),
        }));
        cognitoResult = JSON.parse(new TextDecoder().decode(response.Payload));
        console.log('Cognito delete result:', JSON.stringify(cognitoResult));
      } catch (cognitoError) {
        console.error('Cognito delete failed:', cognitoError);
        cognitoResult = { warning: `Cognito delete failed: ${cognitoError.message}` };
      }
    }

    return t.respond(200, {
      message: 'Judge deleted successfully',
      judgeId: judgeId,
      deletedScores: scoresResult.affectedRows,
      deletedAssignments: assignmentsResult.affectedRows,
      cognito: cognitoResult,
    });
  } catch (error) {
    console.error('Error deleting judge:', error);
    if (error instanceof t.HttpError) {
      return t.respond(error.statusCode, { message: error.message });
    }
    return t.respond(500, { message: 'Failed to delete judge', error: error.message });
  }
};
