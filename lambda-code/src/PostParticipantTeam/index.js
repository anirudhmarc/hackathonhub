// PostParticipantTeam — POST /hackathons/{hackathonId}/participant/teams
// Registers a team for the caller within a hackathon. Looks up the hackathon's
// track (replacing the old hardcoded track UUID) and stamps hackathon_id everywhere.
const t = require('/opt/nodejs/tenancy');
const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Authorization token missing.' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const teamName = (body.teamName || '').trim();
    if (!teamName) return t.respond(400, { message: 'Missing required field: teamName.' });

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'participant');
    await conn.beginTransaction();
    try {
      // Existing leader for this hackathon?
      const [existingLeader] = await conn.execute(
        'SELECT leader_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
        [caller.email, hackathonId]
      );
      if (existingLeader.length > 0) {
        const [existingTeam] = await conn.execute(
          'SELECT team_name FROM Team WHERE leader_id = ? AND hackathon_id = ?',
          [existingLeader[0].leader_id, hackathonId]
        );
        if (existingTeam.length > 0) {
          await conn.rollback();
          return t.respond(409, { message: 'You have already registered a team.' });
        }
      }

      // Resolve the hackathon's track (first track for this hackathon).
      const [trackRows] = await conn.execute(
        'SELECT track_id FROM Track WHERE hackathon_id = ? ORDER BY track_title ASC LIMIT 1',
        [hackathonId]
      );
      if (trackRows.length === 0) {
        await conn.rollback();
        return t.respond(400, { message: 'Hackathon has no track configured.' });
      }
      const trackId = trackRows[0].track_id;

      const leaderId = existingLeader.length > 0 ? existingLeader[0].leader_id : uuid();
      const teamId = uuid();

      if (existingLeader.length === 0) {
        await conn.execute(
          'INSERT INTO Leader (leader_id, hackathon_id, email_address, track_id) VALUES (?, ?, ?, ?)',
          [leaderId, hackathonId, caller.email, trackId]
        );
      }
      await conn.execute(
        'INSERT INTO Team (team_id, hackathon_id, leader_id, team_name) VALUES (?, ?, ?, ?)',
        [teamId, hackathonId, leaderId, teamName]
      );
      // Link leader row to their team (used for member lookups).
      await conn.execute(
        'UPDATE Leader SET team_id = ? WHERE leader_id = ? AND hackathon_id = ?',
        [teamId, leaderId, hackathonId]
      );

      await conn.commit();
      return t.respond(201, { message: 'Team created successfully', teamId, teamName });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('PostParticipantTeam error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to create team', error: err.message });
  }
};
