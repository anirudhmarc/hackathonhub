// put-admin-judges/index.js - updates a judge scoped to a hackathon
const t = require('/opt/nodejs/tenancy');

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

    const body = JSON.parse(event.body);
    const { judge_name, email_address } = body;

    if (!judge_name || !email_address) {
      return t.respond(400, { message: 'Missing required fields: judge_name, email_address.' });
    }

    const conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'host');

    const [result] = await conn.execute(
      'UPDATE Judge SET judge_name = ?, email_address = ? WHERE judge_id = ? AND hackathon_id = ?',
      [judge_name, email_address, judgeId, hackathonId]
    );

    if (result.affectedRows === 0) {
      return t.respond(404, { message: 'Judge not found or no changes made.' });
    }

    return t.respond(200, { message: 'Judge updated successfully', judgeId: judgeId });
  } catch (error) {
    console.error('Error updating judge:', error);
    if (error instanceof t.HttpError) {
      return t.respond(error.statusCode, { message: error.message });
    }
    return t.respond(500, { message: 'Failed to update judge', error: error.message });
  }
};
