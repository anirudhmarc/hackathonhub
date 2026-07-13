// post-admin-assignments/index.js - creates an assignment scoped to a hackathon
const t = require('/opt/nodejs/tenancy');
const crypto = require('crypto');

exports.handler = async (event) => {
  try {
    const caller = t.getCaller(event);
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) {
      return t.respond(400, { message: 'Missing hackathonId in path parameters.' });
    }

    const body = JSON.parse(event.body);
    const { judgeId, teamId, stageId } = body;

    if (!judgeId || !teamId || !stageId) {
      return t.respond(400, { message: 'Missing required fields: judgeId, teamId, or stageId.' });
    }

    const conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'host');

    // Validate judge, team, and stage all belong to this hackathon
    const [judgeExists] = await conn.execute(
      'SELECT judge_id FROM Judge WHERE judge_id = ? AND hackathon_id = ?',
      [judgeId, hackathonId]
    );
    if (judgeExists.length === 0) {
      return t.respond(400, { message: 'Judge not found.' });
    }

    const [teamExists] = await conn.execute(
      'SELECT team_id FROM Team WHERE team_id = ? AND hackathon_id = ?',
      [teamId, hackathonId]
    );
    if (teamExists.length === 0) {
      return t.respond(400, { message: 'Team not found.' });
    }

    const [stageExists] = await conn.execute(
      'SELECT stage_id FROM Judging_Stage WHERE stage_id = ? AND hackathon_id = ?',
      [stageId, hackathonId]
    );
    if (stageExists.length === 0) {
      return t.respond(400, { message: 'Judging stage not found.' });
    }

    const assignmentId = crypto.randomUUID();
    try {
      await conn.execute(
        'INSERT INTO Judge_Assignment (assignment_id, hackathon_id, judge_id, team_id, stage_id) VALUES (?, ?, ?, ?, ?)',
        [assignmentId, hackathonId, judgeId, teamId, stageId]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return t.respond(409, { message: 'Assignment already exists for this judge, team, and stage combination.' });
      }
      throw error;
    }

    return t.respond(201, { message: 'Assignment created successfully', assignmentId: assignmentId });
  } catch (error) {
    console.error('Error creating assignment:', error);
    if (error instanceof t.HttpError) {
      return t.respond(error.statusCode, { message: error.message });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return t.respond(409, { message: 'Assignment already exists for this judge, team, and stage combination.' });
    }
    return t.respond(500, { message: 'Failed to create assignment', error: error.message });
  }
};
