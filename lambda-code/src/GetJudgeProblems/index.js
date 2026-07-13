// GetJudgeProblems — GET /hackathons/{hackathonId}/judge/problems
// Lists problem statements for the hackathon.
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

    const [problemStatements] = await conn.execute(
      `SELECT problem_id AS id, problem_title AS name, problem_description,
              problem_tag, problem_max_slots, track_id
       FROM Problem_Statement WHERE hackathon_id = ?`,
      [hackathonId]
    );
    return t.respond(200, problemStatements);
  } catch (err) {
    console.error('GetJudgeProblems error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Internal Server Error', error: err.message });
  }
};
