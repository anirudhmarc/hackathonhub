// UpdateHackathon — PUT /hackathons/{hackathonId}
// Edit timeline fields / flags / name / status. Admin or owning Host only.
const t = require('/opt/nodejs/tenancy');

// Columns a caller is allowed to update (whitelist — never hackathon_id/owner_email/created_at).
const EDITABLE = [
  'name', 'status',
  'hackathon_start', 'hackathon_end',
  'problems_selection_start', 'problems_selection_end',
  'submission_start', 'submission_end',
  'final_submission_start', 'final_submission_end',
  'scoring_start', 'scoring_end', 'scoring_lock',
  'feedback_release', 'finalists_announcement', 'winners_announcement',
  'logo_url',
  'is_problem_statement_selection_enabled', 'is_team_submission_enabled',
];

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    conn = await t.getConnection();
    // Authorize as host of this hackathon (Admin bypasses inside assertMembership).
    await t.assertMembership(conn, caller, hackathonId, 'host');

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const sets = [];
    const vals = [];
    for (const col of EDITABLE) {
      if (Object.prototype.hasOwnProperty.call(body, col)) {
        let v = body[col];
        if (col.startsWith('is_')) v = v ? 1 : 0;
        sets.push(`${col} = ?`);
        vals.push(v === undefined ? null : v);
      }
    }
    if (sets.length === 0) return t.respond(400, { message: 'No editable fields provided' });

    vals.push(hackathonId);
    const [res] = await conn.execute(`UPDATE Hackathon SET ${sets.join(', ')} WHERE hackathon_id = ?`, vals);
    if (res.affectedRows === 0) return t.respond(404, { message: 'Hackathon not found' });

    const [rows] = await conn.execute('SELECT * FROM Hackathon WHERE hackathon_id = ?', [hackathonId]);
    return t.respond(200, { hackathon: rows[0] });
  } catch (err) {
    console.error('UpdateHackathon error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to update hackathon', error: err.message });
  }
};
