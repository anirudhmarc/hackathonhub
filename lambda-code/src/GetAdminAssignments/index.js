// get-admin-assignments/index.js - lists assignments scoped to a hackathon
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
  try {
    const caller = t.getCaller(event);
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) {
      return t.respond(400, { message: 'Missing hackathonId in path parameters.' });
    }

    const conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'host');

    const [rows] = await conn.execute(
      `SELECT
          ja.assignment_id AS id,
          ja.judge_id,
          j.judge_name,
          j.email_address AS judge_email,
          ja.team_id,
          t.team_name,
          ja.assigned_at,
          ja.stage_id,
          js.stage_name
       FROM Judge_Assignment ja
       JOIN Judge j ON ja.judge_id = j.judge_id
       JOIN Team t ON ja.team_id = t.team_id
       JOIN Judging_Stage js ON ja.stage_id = js.stage_id
       WHERE ja.hackathon_id = ?
       ORDER BY j.judge_name, t.team_name ASC`,
      [hackathonId]
    );

    const assignmentsData = rows.map((row) => ({
      id: row.id,
      judgeId: row.judge_id,
      judgeName: row.judge_name,
      judgeEmail: row.judge_email,
      teamId: row.team_id,
      teamName: row.team_name,
      assignedAt: row.assigned_at,
      stageId: row.stage_id,
      stageName: row.stage_name,
    }));

    return t.respond(200, assignmentsData);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    if (error instanceof t.HttpError) {
      return t.respond(error.statusCode, { message: error.message });
    }
    return t.respond(500, { message: 'Failed to fetch assignments', error: error.message });
  }
};
