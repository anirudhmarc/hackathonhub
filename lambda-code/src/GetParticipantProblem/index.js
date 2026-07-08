// GetParticipantProblem — GET /hackathons/{hackathonId}/participant/problems
// Lists problem statements for the caller's track within the hackathon, with slot counts.
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Authorization token missing.' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'participant');

    const [leaderRows] = await conn.execute(
      'SELECT leader_id, track_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
      [caller.email, hackathonId]
    );
    if (leaderRows.length === 0) {
      return t.respond(404, { message: 'Leader not found. Please register a team first.' });
    }
    const { leader_id: leaderId, track_id: userTrackId } = leaderRows[0];

    const [teamRows] = await conn.execute(
      'SELECT team_id, problem_id FROM Team WHERE leader_id = ? AND hackathon_id = ?',
      [leaderId, hackathonId]
    );
    const userSelectedProblemId = teamRows.length > 0 ? teamRows[0].problem_id : null;

    const [rows] = await conn.execute(
      `SELECT
         ps.problem_id, ps.problem_title, ps.problem_description, ps.problem_tag,
         ps.problem_max_slots,
         COALESCE(COUNT(tm.team_id), 0) AS current_slots_taken,
         tr.track_title AS track_name
       FROM Problem_Statement ps
       LEFT JOIN Team tm ON ps.problem_id = tm.problem_id AND tm.hackathon_id = ps.hackathon_id
       JOIN Track tr ON ps.track_id = tr.track_id
       WHERE ps.hackathon_id = ? AND ps.track_id = ?
       GROUP BY ps.problem_id, ps.problem_title, ps.problem_description, ps.problem_tag, ps.problem_max_slots, tr.track_title
       ORDER BY ps.problem_title ASC`,
      [hackathonId, userTrackId]
    );

    const problemStatements = rows.map(row => ({
      problem_id: row.problem_id,
      problem_title: row.problem_title,
      problem_description: row.problem_description,
      problem_tag: row.problem_tag,
      problem_max_slots: row.problem_max_slots,
      current_slots_taken: row.current_slots_taken,
      track_name: row.track_name,
      selected: row.problem_id === userSelectedProblemId,
      remainingSlots: row.problem_max_slots - row.current_slots_taken,
    }));

    return t.respond(200, problemStatements);
  } catch (err) {
    console.error('GetParticipantProblem error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to retrieve problem statements', error: err.message });
  }
};
