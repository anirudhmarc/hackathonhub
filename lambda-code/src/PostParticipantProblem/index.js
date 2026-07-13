// PostParticipantProblem — POST/PUT /hackathons/{hackathonId}/participant/problems
// Selects a problem statement for the caller's team within the hackathon.
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Authorization token missing.' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const problemId = body.problemId;
    if (!problemId) return t.respond(400, { message: 'Missing required field: problemId.' });

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'participant');
    await conn.beginTransaction();
    try {
      const [leaderRows] = await conn.execute(
        'SELECT leader_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
        [caller.email, hackathonId]
      );
      if (leaderRows.length === 0) {
        await conn.rollback();
        return t.respond(404, { message: 'Leader not found. Please register a team first.' });
      }
      const leaderId = leaderRows[0].leader_id;

      const [teamRows] = await conn.execute(
        'SELECT team_id, problem_id FROM Team WHERE leader_id = ? AND hackathon_id = ?',
        [leaderId, hackathonId]
      );
      if (teamRows.length === 0) {
        await conn.rollback();
        return t.respond(404, { message: 'Team not found for this leader. Please register a team first.' });
      }
      const teamId = teamRows[0].team_id;
      if (teamRows[0].problem_id) {
        await conn.rollback();
        return t.respond(409, { message: 'Your team has already selected a problem statement.' });
      }

      const [problemInfoRows] = await conn.execute(
        'SELECT problem_title, problem_max_slots FROM Problem_Statement WHERE problem_id = ? AND hackathon_id = ?',
        [problemId, hackathonId]
      );
      if (problemInfoRows.length === 0) {
        await conn.rollback();
        return t.respond(404, { message: `Problem with ID ${problemId} not found.` });
      }
      const problemInfo = problemInfoRows[0];

      const [slotRows] = await conn.execute(
        'SELECT COUNT(*) AS current_teams FROM Team WHERE problem_id = ? AND hackathon_id = ?',
        [problemId, hackathonId]
      );
      if (slotRows[0].current_teams >= problemInfo.problem_max_slots) {
        await conn.rollback();
        return t.respond(400, { message: `The problem "${problemInfo.problem_title}" is full. Max slots: ${problemInfo.problem_max_slots}.` });
      }

      await conn.execute(
        'UPDATE Team SET problem_id = ? WHERE team_id = ? AND hackathon_id = ?',
        [problemId, teamId, hackathonId]
      );
      await conn.commit();
      return t.respond(200, { message: 'Problem selected successfully', problemId, teamId });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('PostParticipantProblem error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to select problem', error: err.message });
  }
};
