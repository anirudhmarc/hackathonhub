// put-admin-problems/index.js - multi-tenant rewrite
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

        const body = JSON.parse(event.body);
        const { problem_title, problem_description, problem_tag, problem_max_slots, track_id } = body;

        if (!problem_title || !problem_description || !problem_max_slots || !track_id) {
            return t.respond(400, { message: 'Missing required fields: problem_title, problem_description, problem_max_slots, track_id.' });
        }

        const conn = await t.getConnection();
        await t.assertMembership(conn, caller, hackathonId, 'host');

        // Validate that the track belongs to this hackathon
        const [trackRows] = await conn.execute(
            'SELECT track_id FROM Track WHERE track_id = ? AND hackathon_id = ?',
            [track_id, hackathonId]
        );
        if (trackRows.length === 0) {
            return t.respond(400, { message: `Invalid track_id: ${track_id}. Track not found.` });
        }

        const [result] = await conn.execute(
            'UPDATE Problem_Statement SET problem_title = ?, problem_description = ?, problem_tag = ?, problem_max_slots = ?, track_id = ? WHERE problem_id = ? AND hackathon_id = ?',
            [problem_title, problem_description, problem_tag ?? null, problem_max_slots, track_id, problemId, hackathonId]
        );

        if (result.affectedRows === 0) {
            return t.respond(404, { message: 'Problem not found or no changes made.' });
        }

        return t.respond(200, { message: 'Problem updated successfully', problemId: problemId });
    } catch (error) {
        console.error('Error updating problem:', error);
        if (error instanceof t.HttpError) {
            return t.respond(error.statusCode, { message: error.message });
        }
        return t.respond(500, { message: 'Failed to update problem', error: error.message });
    }
};
