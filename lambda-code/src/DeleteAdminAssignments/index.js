// delete-admin-assignment/index.js - deletes an assignment scoped to a hackathon
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
  try {
    const caller = t.getCaller(event);
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) {
      return t.respond(400, { message: 'Missing hackathonId in path parameters.' });
    }

    const assignmentId = event.pathParameters?.assignmentId;
    if (!assignmentId) {
      return t.respond(400, { message: 'Missing assignmentId in path parameters.' });
    }

    const conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'host');

    const [result] = await conn.execute(
      'DELETE FROM Judge_Assignment WHERE assignment_id = ? AND hackathon_id = ?',
      [assignmentId, hackathonId]
    );

    if (result.affectedRows === 0) {
      return t.respond(404, { message: 'Assignment not found.' });
    }

    return t.respond(200, { message: 'Assignment deleted successfully', assignmentId: assignmentId });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    if (error instanceof t.HttpError) {
      return t.respond(error.statusCode, { message: error.message });
    }
    return t.respond(500, { message: 'Failed to delete assignment', error: error.message });
  }
};
