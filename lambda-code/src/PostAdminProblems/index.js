// post-admin-problems/index.js - multi-tenant rewrite
const t = require('/opt/nodejs/tenancy');
const crypto = require('crypto');

exports.handler = async (event) => {
    try {
        console.log('Received event:', JSON.stringify(event));

        const caller = t.getCaller(event);
        const hackathonId = t.resolveHackathonId(event);
        if (!hackathonId) {
            return t.respond(400, { message: 'Missing hackathonId.' });
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

        const problemId = crypto.randomUUID();
        await conn.execute(
            'INSERT INTO Problem_Statement (problem_id, hackathon_id, problem_title, problem_description, problem_tag, problem_max_slots, track_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [problemId, hackathonId, problem_title, problem_description, problem_tag ?? null, problem_max_slots, track_id]
        );

        return t.respond(201, { message: 'Problem created successfully', problemId: problemId });
    } catch (error) {
        console.error('Error creating problem:', error);
        if (error instanceof t.HttpError) {
            return t.respond(error.statusCode, { message: error.message });
        }
        return t.respond(500, { message: 'Failed to create problem', error: error.message });
    }
};
