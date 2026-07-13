// get-admin-judges/index.js - lists judges scoped to a hackathon
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
  try {
    const caller = t.getCaller(event);
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) {
      return t.respond(400, { message: 'Missing hackathonId in path parameters.' });
    }

    const conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'host');

    const [rows] = await conn.execute(
      `SELECT
          judge_id,
          judge_name,
          email_address
       FROM Judge
       WHERE hackathon_id = ?
       ORDER BY judge_name ASC`,
      [hackathonId]
    );

    const judgesData = rows.map((row) => ({
      judge_id: row.judge_id,
      judge_name: row.judge_name,
      email_address: row.email_address,
    }));

    return t.respond(200, judgesData);
  } catch (error) {
    console.error('Error in handler:', error);
    if (error instanceof t.HttpError) {
      return t.respond(error.statusCode, { message: error.message });
    }
    return t.respond(500, { message: 'Internal server error', error: error.message });
  }
};
