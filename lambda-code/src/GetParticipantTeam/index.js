// GetParticipantTeam — GET /hackathons/{hackathonId}/participant/teams
// Returns the caller's team + submission (scoped to the hackathon), plus the
// hackathon's available tracks. Uses the shared tenancy layer.
const t = require('/opt/nodejs/tenancy');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region: REGION });
const SUBMISSIONS_BUCKET = process.env.S3_BUCKET_NAME;

// Presign a stored S3 URL/key to a temporary GET url. Passes through
// placeholders / non-submissions-bucket URLs; decodes percent-encoding so keys
// with spaces/() match the real object key.
async function presign(s3UrlOrKey) {
  if (!s3UrlOrKey || !SUBMISSIONS_BUCKET) return s3UrlOrKey || null;
  let s3Key = s3UrlOrKey;
  if (s3UrlOrKey.startsWith('https://')) {
    if (!s3UrlOrKey.includes(SUBMISSIONS_BUCKET)) return s3UrlOrKey;
    try {
      const u = new URL(s3UrlOrKey);
      const raw = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
      s3Key = decodeURIComponent(raw);
    } catch (e) { return s3UrlOrKey; }
  }
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: SUBMISSIONS_BUCKET, Key: s3Key }), { expiresIn: 3600 });
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
    // Participant (or Admin) of this hackathon.
    await t.assertMembership(conn, caller, hackathonId, 'participant');

    let teamInfo = null;
    let hasTeamRegistered = false;

    const [leaderRows] = await conn.execute(
      'SELECT leader_id, track_id, team_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
      [caller.email, hackathonId]
    );
    if (leaderRows.length > 0) {
      const leaderId = leaderRows[0].leader_id;
      const memberTeamId = leaderRows[0].team_id;

      const [teamRows] = await conn.execute(`
        SELECT
          t.team_id, t.team_name, t.problem_id,
          ts.submission_video_url, ts.github_url, ts.submission_project_description,
          ts.submission_additional_materials_url, ts.last_updated,
          CASE WHEN ts.submission_id IS NOT NULL THEN TRUE ELSE FALSE END as has_submitted,
          tr.track_title as track_name
        FROM Team t
        LEFT JOIN Team_Submission ts ON t.team_id = ts.team_id AND ts.hackathon_id = t.hackathon_id
        LEFT JOIN Leader l ON t.leader_id = l.leader_id
        LEFT JOIN Track tr ON l.track_id = tr.track_id
        WHERE t.hackathon_id = ? AND (t.leader_id = ? OR t.team_id = ?)
      `, [hackathonId, leaderId, memberTeamId]);

      if (teamRows.length > 0) {
        hasTeamRegistered = true;
        const row = teamRows[0];
        const presignedVideoUrl = await presign(row.submission_video_url);

        let parsedAdditionalUrls = [];
        const raw = row.submission_additional_materials_url;
        if (raw && typeof raw === 'string') {
          try {
            const urls = JSON.parse(raw);
            parsedAdditionalUrls = Array.isArray(urls)
              ? await Promise.all(urls.map(presign))
              : [await presign(raw)];
          } catch (e) {
            parsedAdditionalUrls = [await presign(raw)];
          }
        } else if (Array.isArray(raw)) {
          parsedAdditionalUrls = await Promise.all(raw.map(presign));
        }

        teamInfo = {
          teamId: row.team_id,
          teamName: row.team_name,
          problemId: row.problem_id,
          track: row.track_name || null,
          videoUrl: presignedVideoUrl,
          hasSubmitted: row.has_submitted === 1,
          gitlabUrl: row.github_url,
          submissionProjectDescription: row.submission_project_description,
          submissionAdditionalMaterialsUrls: parsedAdditionalUrls,
          lastSubmitted: row.last_updated ? new Date(row.last_updated).toISOString() : null,
        };
      }
    }

    const [tracksRows] = await conn.execute(
      'SELECT track_id AS id, track_title AS title FROM Track WHERE hackathon_id = ? ORDER BY track_title ASC',
      [hackathonId]
    );

    return t.respond(200, {
      hasTeamRegistered,
      teamInfo,
      availableTracks: tracksRows.map(r => ({ id: r.id, title: r.title })),
    });
  } catch (err) {
    console.error('GetParticipantTeam error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Internal server error', error: err.message });
  }
};
