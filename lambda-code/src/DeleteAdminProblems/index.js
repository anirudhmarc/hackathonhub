// delete-admin-problems/index.js - multi-tenant rewrite
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
    try {
        console.log('Received event:', JSON.stringify(event));

        const caller = t.getCaller(event);
        const hackathonId = t.resolveHackathonId(event);
        if (!hackathonId) {
            return t.respond(400, { message: 'Missing hackathonId.' });
        }

        const problemId = event.pathParameters?.problemId;
        if (!problemId) {
            return t.respond(400, { message: 'Missing problemId in path parameters.' });
        }

        const conn = await t.getConnection();
        await t.assertMembership(conn, caller, hackathonId, 'host');

        const [result] = await conn.execute(
            'DELETE FROM Problem_Statement WHERE problem_id = ? AND hackathon_id = ?',
            [problemId, hackathonId]
        );

        if (result.affectedRows === 0) {
            return t.respond(404, { message: 'Problem not found.' });
        }

        return t.respond(200, { message: 'Problem deleted successfully', problemId: problemId });
    } catch (error) {
        console.error('Error deleting problem:', error);
        if (error instanceof t.HttpError) {
            return t.respond(error.statusCode, { message: error.message });
        }
        return t.respond(500, { message: 'Failed to delete problem', error: error.message });
    }
};
