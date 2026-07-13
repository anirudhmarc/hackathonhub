// AdminGetLeaderboardData — GET /hackathons/{hackathonId}/admin/leaderboard
// Multi-tenant: every query is scoped to hackathon_id and access is gated by a
// host membership (Admins bypass). Returns teams (+ presigned submissions),
// problems, scores, judging stages, and judges for the ONE hackathon.
const t = require('/opt/nodejs/tenancy');
// Use AWS SDK v3, which is built into the nodejs22.x runtime (no bundling needed).
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = new S3Client({ region: process.env.REGION || process.env.AWS_REGION || 'us-east-1' });
const SUBMISSIONS_BUCKET = process.env.S3_BUCKET_NAME;

// Turn a stored S3 URL/key into a presigned GET URL, valid 7 days. Mirrors the
// safeguards used by the judge/participant read Lambdas:
//  - pass through placeholders / non-submissions-bucket URLs untouched (e.g.
//    "https://placeholder.video/no-video-uploaded") so they are not mis-signed
//  - decode percent-encoding so keys with spaces/() match the real object key
async function presign(s3UrlOrKey) {
  if (!s3UrlOrKey || !SUBMISSIONS_BUCKET) return s3UrlOrKey || null;
  let s3Key = s3UrlOrKey;
  if (s3UrlOrKey.startsWith('https://')) {
    // Only presign URLs that actually live in the submissions bucket.
    if (!s3UrlOrKey.includes(SUBMISSIONS_BUCKET)) return s3UrlOrKey;
    try {
      const u = new URL(s3UrlOrKey);
      const rawPath = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
      s3Key = decodeURIComponent(rawPath);
    } catch (e) {
      return s3UrlOrKey;
    }
  }
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: SUBMISSIONS_BUCKET, Key: s3Key }), { expiresIn: 604800 });
  } catch (e) {
    console.error('presign failed for', s3Key, e.message);
    return s3UrlOrKey;
  }
}

// Parse the additional-materials field (JSON-array string, single URL, or array)
// into a flat array of presigned URLs.
async function presignMaterials(raw) {
  if (!raw) return [];
  let urls = [];
  if (Array.isArray(raw)) urls = raw;
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      urls = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      urls = [raw];
    }
  }
  return Promise.all(urls.filter(Boolean).map(presign));
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const caller = t.getCaller(event);
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) {
      return t.respond(400, { message: 'Missing hackathonId.' });
    }

    const connection = await t.getConnection();
    await t.assertMembership(connection, caller, hackathonId, 'host');
    console.log('Database connected; membership verified');

    // Support optional query parameters: judge_id, stage_id, team_id
    const qs = event.queryStringParameters || {};
    const filterJudgeId = qs.judge_id || null;
    const filterStageId = qs.stage_id || null;
    const filterTeamId = qs.team_id || null;

    // Fetch teams with track info (scoped to this hackathon)
    const teamQuery = `
      SELECT
        t.team_id AS id,
        t.team_name AS name,
        t.problem_id AS problem_id,
        ps.problem_title AS problem_title,
        COALESCE(tr.track_title, leader_tr.track_title) AS track_name,
        t.is_finalist
      FROM Team t
      LEFT JOIN Problem_Statement ps ON t.problem_id = ps.problem_id AND ps.hackathon_id = t.hackathon_id
      LEFT JOIN Track tr ON ps.track_id = tr.track_id AND tr.hackathon_id = t.hackathon_id
      LEFT JOIN Leader l ON t.leader_id = l.leader_id AND l.hackathon_id = t.hackathon_id
      LEFT JOIN Track leader_tr ON l.track_id = leader_tr.track_id AND leader_tr.hackathon_id = t.hackathon_id
      WHERE t.hackathon_id = ?
    `;

    const [teams] = await connection.execute(teamQuery, [hackathonId]);
    console.log(`Fetched ${teams.length} teams`);

    // Fetch each team's submission and attach presigned download URLs so the
    // admin "Manage Submissions" page can preview/download videos & materials.
    const [submissionRows] = await connection.execute(`
      SELECT
        ts.team_id,
        ts.submission_id,
        ts.submission_video_url,
        ts.github_url,
        ts.submission_project_description,
        ts.submission_additional_materials_url,
        ts.last_updated
      FROM Team_Submission ts
      WHERE ts.hackathon_id = ?
    `, [hackathonId]);
    console.log(`Fetched ${submissionRows.length} submissions`);

    const submissionByTeam = {};
    for (const sub of submissionRows) {
      submissionByTeam[sub.team_id] = {
        submission_id: sub.submission_id,
        video_url: await presign(sub.submission_video_url),
        github_url: sub.github_url || null,
        project_description: sub.submission_project_description || null,
        additional_materials: await presignMaterials(sub.submission_additional_materials_url),
        last_updated: sub.last_updated || null,
      };
    }

    // Attach submission (or null) to each team.
    for (const t of teams) {
      t.submission = submissionByTeam[t.id] || null;
      t.has_submitted = !!submissionByTeam[t.id];
    }

    // Fetch problems (scoped to this hackathon)
    const problemQuery = `
      SELECT
        problem_id AS id,
        problem_title AS title
      FROM Problem_Statement
      WHERE hackathon_id = ?
    `;

    const [problems] = await connection.execute(problemQuery, [hackathonId]);
    console.log(`Fetched ${problems.length} problems`);

    // Fetch scores with optional filtering (always scoped to this hackathon)
    let scoresQuery = `
      SELECT
        s.score_id AS id,
        s.team_id,
        s.judge_id,
        j.judge_name AS judge_name,
        s.innovation,
        s.technical_complexity,
        s.impact,
        s.presentation,
        s.feedback,
        s.strength,
        s.improvement,
        s.last_updated,
        s.stage_id
      FROM Score s
      LEFT JOIN Judge j ON s.judge_id = j.judge_id AND j.hackathon_id = s.hackathon_id
    `;

    const whereClauses = ['s.hackathon_id = ?'];
    const params = [hackathonId];

    if (filterJudgeId) {
      whereClauses.push('s.judge_id = ?');
      params.push(filterJudgeId);
    }
    if (filterStageId) {
      whereClauses.push('s.stage_id = ?');
      params.push(filterStageId);
    }
    if (filterTeamId) {
      whereClauses.push('s.team_id = ?');
      params.push(filterTeamId);
    }

    scoresQuery += ' WHERE ' + whereClauses.join(' AND ');

    const [scores] = await connection.execute(scoresQuery, params);
    console.log(`Fetched ${scores.length} scores`);

    // Fetch judging stages (scoped to this hackathon)
    const stagesQuery = `
      SELECT
        stage_id,
        stage_name
      FROM Judging_Stage
      WHERE hackathon_id = ?
      ORDER BY start_time ASC
    `;

    const [judgingStages] = await connection.execute(stagesQuery, [hackathonId]);
    console.log(`Fetched ${judgingStages.length} judging stages`);

    // Fetch judges list (scoped to this hackathon)
    const judgesQuery = `
      SELECT
        judge_id,
        judge_name,
        email_address
      FROM Judge
      WHERE hackathon_id = ?
    `;

    const [judges] = await connection.execute(judgesQuery, [hackathonId]);
    console.log(`Fetched ${judges.length} judges`);

    // Return response (the tenancy layer caches the connection — do NOT end it).
    return t.respond(200, {
      teams: teams || [],
      problems: problems || [],
      scores: scores || [],
      judgingStages: judgingStages || [],
      judges: judges || []
    });

  } catch (error) {
    console.error('Error:', error);
    if (error instanceof t.HttpError) return t.respond(error.statusCode, { message: error.message });
    return t.respond(500, { message: 'Internal Server Error', error: error.message });
  }
};
