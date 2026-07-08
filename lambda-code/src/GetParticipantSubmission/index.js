// GetParticipantSubmission — GET /hackathons/{hackathonId}/participant/submissions
// Returns the caller's team submission (scoped to the hackathon) with presigned URLs.
const t = require('/opt/nodejs/tenancy');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region: REGION });
const BUCKET = process.env.S3_BUCKET_NAME;

async function presign(s3UrlOrKey) {
  if (!s3UrlOrKey || !BUCKET) return s3UrlOrKey || null;
  let s3Key = s3UrlOrKey;
  if (s3UrlOrKey.startsWith('https://')) {
    if (!s3UrlOrKey.includes(BUCKET)) return s3UrlOrKey;
    try {
      const u = new URL(s3UrlOrKey);
      const raw = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
      s3Key = decodeURIComponent(raw);
    } catch (e) { return s3UrlOrKey; }
  }
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), { expiresIn: 3600 });
  } catch (e) {
    console.error('presign failed:', s3Key, e.message);
    return s3UrlOrKey;
  }
}

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
      'SELECT leader_id, team_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
      [caller.email, hackathonId]
    );
    if (leaderRows.length === 0) {
      return t.respond(200, { submission: null, message: 'Leader not found, no submission possible.' });
    }
    const leaderId = leaderRows[0].leader_id;
    const memberTeamId = leaderRows[0].team_id;

    const [teamRows] = await conn.execute(
      'SELECT team_id, problem_id FROM Team WHERE hackathon_id = ? AND (leader_id = ? OR team_id = ?) LIMIT 1',
      [hackathonId, leaderId, memberTeamId]
    );
    if (teamRows.length === 0) {
      return t.respond(200, { submission: null, message: 'Team not found for this leader.' });
    }
    const teamId = teamRows[0].team_id;
    const problemId = teamRows[0].problem_id;

    const [rows] = await conn.execute(
      `SELECT submission_id, team_id, last_updated, submission_video_url, github_url,
              submission_project_description, submission_additional_materials_url
       FROM Team_Submission
       WHERE team_id = ? AND hackathon_id = ?
       ORDER BY last_updated DESC LIMIT 1`,
      [teamId, hackathonId]
    );

    let submission = null;
    if (rows.length > 0) {
      submission = rows[0];
      if (submission.submission_video_url) {
        submission.submission_video_url = await presign(submission.submission_video_url);
      }
      const raw = submission.submission_additional_materials_url;
      let materialUrls = [];
      if (Array.isArray(raw)) materialUrls = raw;
      else if (raw && typeof raw === 'string') {
        try { const p = JSON.parse(raw); materialUrls = Array.isArray(p) ? p : [p]; }
        catch (e) { materialUrls = [raw]; }
      }
      submission.submission_additional_materials_url = await Promise.all(materialUrls.filter(Boolean).map(presign));
    }

    return t.respond(200, { submission, teamId, problemId });
  } catch (err) {
    console.error('GetParticipantSubmission error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to retrieve submission', error: err.message });
  }
};
