// PostJudgeScores — POST/PUT /hackathons/{hackathonId}/judge/scores
// SECURITY: the scoring judge_id is resolved from the CALLER's email within the
// hackathon — the request body's judge_id (if any) is ignored. Scores are stamped
// with hackathon_id.
const t = require('/opt/nodejs/tenancy');
const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });
    if (!event.body) return t.respond(400, { message: 'Request body is missing.' });

    const body = JSON.parse(event.body);
    const { team_id, stage_id } = body;
    if (!stage_id) return t.respond(400, { message: 'stage_id is required.' });
    if (!team_id) return t.respond(400, { message: 'team_id is required.' });
    // mysql2 rejects `undefined` binds — coalesce optional fields to null.
    const innovation = body.innovation ?? null;
    const technical_complexity = body.technical_complexity ?? null;
    const impact = body.impact ?? null;
    const presentation = body.presentation ?? null;
    const feedback = body.feedback ?? null;
    const strength = body.strength ?? null;
    const improvement = body.improvement ?? null;

    const method = event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method);

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'judge');

    // Resolve the caller's judge_id in THIS hackathon — never trust body.judge_id.
    const [judgeRows] = await conn.execute(
      'SELECT judge_id FROM Judge WHERE hackathon_id = ? AND email_address = ? LIMIT 1',
      [hackathonId, caller.email]
    );
    if (judgeRows.length === 0) {
      return t.respond(403, { message: 'You are not a registered judge in this hackathon.' });
    }
    const judgeId = judgeRows[0].judge_id;

    // Ensure the team belongs to this hackathon.
    const [teamRows] = await conn.execute(
      'SELECT 1 FROM Team WHERE team_id = ? AND hackathon_id = ? LIMIT 1',
      [team_id, hackathonId]
    );
    if (teamRows.length === 0) return t.respond(404, { message: 'Team not found in this hackathon.' });

    // Upsert semantics: if a score already exists for (hackathon, team, judge, stage), update it.
    const [existing] = await conn.execute(
      'SELECT score_id FROM Score WHERE hackathon_id = ? AND team_id = ? AND judge_id = ? AND stage_id = ? LIMIT 1',
      [hackathonId, team_id, judgeId, stage_id]
    );

    if (method === 'PUT' || existing.length > 0) {
      await conn.execute(
        `UPDATE Score SET innovation = ?, technical_complexity = ?, impact = ?, presentation = ?,
           feedback = ?, strength = ?, improvement = ?, last_updated = NOW()
         WHERE hackathon_id = ? AND team_id = ? AND judge_id = ? AND stage_id = ?`,
        [innovation, technical_complexity, impact, presentation, feedback, strength, improvement,
         hackathonId, team_id, judgeId, stage_id]
      );
      return t.respond(200, { message: 'Score updated successfully' });
    }

    const scoreId = uuid();
    await conn.execute(
      `INSERT INTO Score (score_id, hackathon_id, team_id, judge_id, innovation, technical_complexity,
         impact, presentation, feedback, strength, improvement, stage_id, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [scoreId, hackathonId, team_id, judgeId, innovation, technical_complexity, impact, presentation,
       feedback, strength, improvement, stage_id]
    );
    return t.respond(200, { message: 'Score submitted successfully', id: scoreId });
  } catch (err) {
    console.error('PostJudgeScores error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Internal Server Error', error: err.message });
  }
};
