// GetJudgeTeams — GET /hackathons/{hackathonId}/judge/teams?stage_id=
// Returns all teams in the hackathon (finalists only for stage-2) with presigned
// submission URLs. Scoped by hackathon_id.
const t = require('/opt/nodejs/tenancy');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region: REGION });
const BUCKET = process.env.S3_BUCKET_NAME;

async function presign(s3UrlOrKey) {
  if (!s3UrlOrKey || !BUCKET) return s3UrlOrKey;
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
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), { expiresIn: 604800 });
  } catch (e) {
    console.error('presign failed:', s3Key, e.message);
    return s3UrlOrKey;
  }
}

// Presign each element of the additional-materials value; return a JSON-array string
// (the judge frontend JSON.parses this).
async function presignMaterials(raw) {
  if (!raw) return raw;
  let urls = [];
  if (Array.isArray(raw)) urls = raw;
  else if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); urls = Array.isArray(p) ? p : [p]; }
    catch (e) { urls = [raw]; }
  }
  return JSON.stringify(await Promise.all(urls.filter(Boolean).map(presign)));
}

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'judge');

    const stageId = event.queryStringParameters?.stage_id;
    const params = [hackathonId];
    let sql = `
      SELECT t.team_id AS id, t.team_name AS name, t.is_finalist,
             ps.problem_id, ps.problem_title AS problem_statement,
             track.track_title AS track,
             ts.submission_video_url, ts.submission_project_description, ts.github_url,
             ts.submission_additional_materials_url, ts.last_updated, ts.submission_id
      FROM Team t
      LEFT JOIN Team_Submission ts ON t.team_id = ts.team_id AND ts.hackathon_id = t.hackathon_id
      LEFT JOIN Leader l ON t.leader_id = l.leader_id
      LEFT JOIN Track track ON l.track_id = track.track_id
      LEFT JOIN Problem_Statement ps ON t.problem_id = ps.problem_id
      WHERE t.hackathon_id = ?`;
    if (stageId && stageId.includes('stage-2')) {
      sql += ' AND t.is_finalist = ?';
      params.push(1);
    }
    sql += ' ORDER BY t.team_name ASC';

    const [teams] = await conn.execute(sql, params);

    const formatted = await Promise.all(teams.map(async (team) => ({
      id: team.id,
      name: team.name,
      is_finalist: team.is_finalist === 1,
      problem_id: team.problem_id,
      problem_statement: team.problem_statement,
      track: team.track || 'unknown',
      submission_video_url: await presign(team.submission_video_url),
      submission_project_description: team.submission_project_description || null,
      github_url: team.github_url || null,
      submission_additional_materials_url: await presignMaterials(team.submission_additional_materials_url),
      last_updated: team.last_updated ? team.last_updated.toISOString() : null,
    })));

    return t.respond(200, formatted);
  } catch (err) {
    console.error('GetJudgeTeams error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { error: 'Failed to fetch teams', details: err.message });
  }
};
