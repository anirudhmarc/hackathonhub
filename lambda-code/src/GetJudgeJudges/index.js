// GetJudgeJudges — GET /hackathons/{hackathonId}/judge/judges
// Lists judges for the hackathon.
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'judge');

    const [judges] = await conn.execute(
      'SELECT judge_id AS id, judge_name AS name, email_address AS email FROM Judge WHERE hackathon_id = ?',
      [hackathonId]
    );
    return t.respond(200, judges);
  } catch (err) {
    console.error('GetJudgeJudges error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Internal Server Error', error: err.message });
  }
};
