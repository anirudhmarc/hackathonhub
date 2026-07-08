// UpdateSubmissionDetails — PUT /hackathons/{hackathonId}/participant/submissions
// Creates/updates the team's submission within a hackathon. Accepts any team
// member (leader_id OR Leader.team_id match), stamps hackathon_id.
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
    const { videoUrl, gitlabUrl, projectDescription, additionalMaterialsUrls, teamId, problemId } = body;
    if (!teamId || !videoUrl || !gitlabUrl || !projectDescription || !problemId || !Array.isArray(additionalMaterialsUrls)) {
      return t.respond(400, { message: 'Missing required fields: teamId, videoUrl, gitlabUrl, projectDescription, problemId, additionalMaterialsUrls.' });
    }

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'participant');
    await conn.beginTransaction();
    try {
      const [leaderRows] = await conn.execute(
        'SELECT leader_id, team_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
        [caller.email, hackathonId]
      );
      if (leaderRows.length === 0) {
        await conn.rollback();
        return t.respond(404, { message: 'Leader not found.' });
      }
      const leaderId = leaderRows[0].leader_id;
      const memberTeamId = leaderRows[0].team_id;

      // Caller must belong to the team (as leader or member) within this hackathon.
      const [teamRows] = await conn.execute(
        'SELECT team_id FROM Team WHERE team_id = ? AND hackathon_id = ? AND (leader_id = ? OR team_id = ?)',
        [teamId, hackathonId, leaderId, memberTeamId]
      );
      if (teamRows.length === 0) {
        await conn.rollback();
        return t.respond(403, { message: 'Team ID mismatch for this user.' });
      }

      const [existing] = await conn.execute(
        'SELECT submission_id FROM Team_Submission WHERE team_id = ? AND hackathon_id = ?',
        [teamId, hackathonId]
      );
      const submissionId = existing.length > 0 ? existing[0].submission_id : uuid();
      const lastUpdated = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const materialsJson = JSON.stringify(additionalMaterialsUrls);

      if (existing.length > 0) {
        await conn.execute(
          `UPDATE Team_Submission SET
             last_updated = ?, submission_video_url = ?, github_url = ?,
             submission_project_description = ?, submission_additional_materials_url = ?
           WHERE submission_id = ? AND hackathon_id = ?`,
          [lastUpdated, videoUrl, gitlabUrl, projectDescription, materialsJson, submissionId, hackathonId]
        );
      } else {
        await conn.execute(
          `INSERT INTO Team_Submission
             (submission_id, hackathon_id, team_id, last_updated, submission_video_url,
              github_url, submission_project_description, submission_additional_materials_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [submissionId, hackathonId, teamId, lastUpdated, videoUrl, gitlabUrl, projectDescription, materialsJson]
        );
      }

      await conn.commit();
      return t.respond(200, { message: 'Submission confirmed successfully', submissionId, teamId });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('UpdateSubmissionDetails error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to confirm submission', error: err.message });
  }
};
