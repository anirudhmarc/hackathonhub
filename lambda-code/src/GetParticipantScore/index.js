// GetParticipantScore — GET /hackathons/{hackathonId}/participant/feedback
// Returns judge feedback/scores for the caller's team within the hackathon.
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(403, { message: 'Forbidden. User email is missing from token claims.' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'participant');

    const [leaderRows] = await conn.execute(
      'SELECT leader_id, team_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
      [caller.email, hackathonId]
    );
    if (leaderRows.length === 0) {
      return t.respond(404, { message: 'Leader not found. Please register a team first.' });
    }
    const leaderId = leaderRows[0].leader_id;
    const memberTeamId = leaderRows[0].team_id;

    const [teamRows] = await conn.execute(
      'SELECT team_id FROM Team WHERE hackathon_id = ? AND (leader_id = ? OR team_id = ?) LIMIT 1',
      [hackathonId, leaderId, memberTeamId]
    );
    if (teamRows.length === 0) {
      return t.respond(404, { message: 'Team not found. User has not created a team.' });
    }
    const teamId = teamRows[0].team_id;

    const [rows] = await conn.execute(
      `SELECT s.score_id, s.judge_id, j.judge_name,
              s.innovation, s.technical_complexity, s.impact, s.presentation,
              s.feedback, s.strength, s.improvement, s.last_updated
       FROM Score s
       JOIN Judge j ON s.judge_id = j.judge_id
       WHERE s.team_id = ? AND s.hackathon_id = ?`,
      [teamId, hackathonId]
    );

    const parseList = (val) => {
      if (!val) return [];
      try {
        const p = JSON.parse(val);
        return Array.isArray(p) ? p : [val];
      } catch (e) { return [val]; }
    };

    const formattedFeedback = rows.map(row => ({
      id: row.score_id,
      judge: row.judge_name || 'Anonymous Judge',
      role: 'Judge',
      date: row.last_updated ? new Date(row.last_updated).toISOString() : new Date().toISOString(),
      scores: {
        innovation: row.innovation || 0,
        execution: row.technical_complexity || 0,
        impact: row.impact || 0,
        presentation: row.presentation || 0,
        technical: row.technical_complexity || 0,
      },
      comments: row.feedback || '',
      strengths: parseList(row.strength),
      improvements: parseList(row.improvement),
    }));

    return t.respond(200, { feedback: formattedFeedback });
  } catch (err) {
    console.error('GetParticipantScore error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to retrieve feedback.', error: err.message });
  }
};
