// GetJudgeScores — GET /hackathons/{hackathonId}/judge/scores?stage_id=
// Lists scores for a stage within the hackathon.
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    const stageId = event.queryStringParameters?.stage_id;
    if (!stageId) return t.respond(400, { message: 'Missing stage_id parameter.' });

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'judge');

    const [scores] = await conn.execute(
      `SELECT score_id AS id, team_id, judge_id, innovation, technical_complexity,
              impact, presentation, feedback, strength, improvement,
              last_updated, stage_id
       FROM Score WHERE hackathon_id = ? AND stage_id = ?`,
      [hackathonId, stageId]
    );
    return t.respond(200, scores);
  } catch (err) {
    console.error('GetJudgeScores error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Internal Server Error', error: err.message });
  }
};
