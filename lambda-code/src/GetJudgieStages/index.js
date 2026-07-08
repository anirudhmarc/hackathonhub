// GetJudgieStages — GET /hackathons/{hackathonId}/judge/stages (and /admin/judging-stages)
// Lists judging stages for the hackathon. Allowed for judges OR hosts/admins of it.
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    conn = await t.getConnection();
    // Judges, hosts, and admins may read stages. Try judge first, fall back to host.
    if (!t.isAdmin(caller)) {
      try {
        await t.assertMembership(conn, caller, hackathonId, 'judge');
      } catch (e) {
        await t.assertMembership(conn, caller, hackathonId, 'host');
      }
    }

    const [stages] = await conn.execute(
      `SELECT stage_id, stage_name, description, start_time, end_time
       FROM Judging_Stage WHERE hackathon_id = ? ORDER BY start_time ASC`,
      [hackathonId]
    );
    return t.respond(200, stages);
  } catch (err) {
    console.error('GetJudgieStages error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Internal Server Error', error: err.message });
  }
};
