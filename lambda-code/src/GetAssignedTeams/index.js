// GetAssignedTeams — GET /hackathons/{hackathonId}/judge/assignments/{judgeId}/teams?stage_id=
// Returns the teams assigned to a judge for a stage, with the judge's existing
// scores and presigned submission URLs. Scoped by hackathon_id. The path judgeId
// must match the caller's own judge_id in this hackathon (unless Admin).
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
  } catch (e) { return s3UrlOrKey; }
}

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
    const judgeId = event.pathParameters?.judgeId;
    const stageId = event.queryStringParameters?.stage_id;
    if (!judgeId || !stageId) return t.respond(400, { message: 'Missing judgeId or stage_id.' });

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'judge');

    // The path judgeId must be the caller's own judge record in this hackathon (Admin bypasses).
    if (!t.isAdmin(caller)) {
      const [jr] = await conn.execute(
        'SELECT judge_id FROM Judge WHERE hackathon_id = ? AND email_address = ? LIMIT 1',
        [hackathonId, caller.email]
      );
      if (jr.length === 0 || jr[0].judge_id !== judgeId) {
        return t.respond(403, { message: 'You may only view your own assignments.' });
      }
    }

    const params = [hackathonId, judgeId, stageId];
    let sql = `
      SELECT t.team_id AS id, t.team_name AS name, t.is_finalist,
             ps.problem_id, ps.problem_title AS problem_statement,
             ts.submission_video_url, ts.submission_project_description, ts.github_url,
             ts.submission_additional_materials_url, track.track_title AS track
      FROM Judge_Assignment ja
      JOIN Team t ON ja.team_id = t.team_id
      LEFT JOIN Leader l ON t.leader_id = l.leader_id
      LEFT JOIN Track track ON l.track_id = track.track_id
      LEFT JOIN Problem_Statement ps ON t.problem_id = ps.problem_id
      LEFT JOIN Team_Submission ts ON t.team_id = ts.team_id AND ts.hackathon_id = t.hackathon_id
      WHERE ja.hackathon_id = ? AND ja.judge_id = ? AND ja.stage_id = ?`;
    if (stageId.includes('stage-2')) { sql += ' AND t.is_finalist = ?'; params.push(1); }
    sql += ' ORDER BY t.team_name ASC';

    const [rows] = await conn.execute(sql, params);

    // Scores for these teams by this judge in this stage.
    const scoresMap = {};
    if (rows.length > 0) {
      const teamIds = rows.map(r => r.id);
      const placeholders = teamIds.map(() => '?').join(',');
      const [scoreRows] = await conn.execute(
        `SELECT score_id AS id, team_id, innovation, technical_complexity, impact, presentation,
                feedback, strength, improvement, last_updated
         FROM Score
         WHERE hackathon_id = ? AND judge_id = ? AND stage_id = ? AND team_id IN (${placeholders})`,
        [hackathonId, judgeId, stageId, ...teamIds]
      );
      for (const s of scoreRows) {
        scoresMap[s.team_id] = {
          id: s.id, innovation: s.innovation, technical_complexity: s.technical_complexity,
          impact: s.impact, presentation: s.presentation,
          feedback: s.feedback, strength: s.strength, improvement: s.improvement, last_updated: s.last_updated,
        };
      }
    }

    const teamsData = await Promise.all(rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      is_finalist: !!row.is_finalist,
      problem_id: row.problem_id,
      problem_statement: row.problem_statement,
      track: row.track,
      submission_video_url: await presign(row.submission_video_url),
      submission_project_description: row.submission_project_description,
      github_url: row.github_url,
      submission_additional_materials_url: await presignMaterials(row.submission_additional_materials_url),
      score: scoresMap[row.id] || null,
    })));

    return t.respond(200, teamsData);
  } catch (err) {
    console.error('GetAssignedTeams error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Internal server error', error: err.message });
  }
};
