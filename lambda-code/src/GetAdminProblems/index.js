// get-admin-problems/index.js - multi-tenant rewrite
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
    try {
        console.log('Received event:', JSON.stringify(event));

        const caller = t.getCaller(event);
        const hackathonId = t.resolveHackathonId(event);
        if (!hackathonId) {
            return t.respond(400, { message: 'Missing hackathonId.' });
        }

        const conn = await t.getConnection();
        await t.assertMembership(conn, caller, hackathonId, 'host');

        // --- Fetch Problems Data ---
        console.log('Executing SQL query to fetch problems...');

        const trackIdFilter = event.queryStringParameters?.track_id;
        console.log('Filtering by track_id:', trackIdFilter);

        let problemsQuery = `
            SELECT
                ps.problem_id AS id,
                ps.problem_title AS title,
                ps.problem_description AS description,
                ps.problem_tag AS tag,
                ps.problem_max_slots AS max_slots,
                ps.track_id AS track_id, -- Keep original track_id for mapping
                t.track_title AS track_title -- Get track title directly here
            FROM
                Problem_Statement ps
            LEFT JOIN
                Track t ON ps.track_id = t.track_id AND t.hackathon_id = ps.hackathon_id
            WHERE
                ps.hackathon_id = ?
        `;
        const problemsQueryParams = [hackathonId];

        if (trackIdFilter && trackIdFilter !== 'all' && trackIdFilter !== 'admin') {
            problemsQuery += ` AND ps.track_id = ?`;
            problemsQueryParams.push(trackIdFilter);
        }

        problemsQuery += ` ORDER BY ps.problem_title ASC`;

        const [problemsRows] = await conn.execute(problemsQuery, problemsQueryParams);

        const problemsData = problemsRows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            tag: row.tag,
            max_slots: row.max_slots, // snake_case from DB
            trackTitle: row.track_title, // from join
            trackId: row.track_id // from DB
        }));
        console.log('Problems data fetched successfully.');

        // --- Fetch Tracks Data ---
        console.log('Executing SQL query to fetch all tracks...');
        const [tracksRows] = await conn.execute(`
            SELECT
                track_id AS id,
                track_title AS title
            FROM
                Track
            WHERE
                hackathon_id = ?
            ORDER BY track_title ASC
        `, [hackathonId]);
        const tracksData = tracksRows.map(row => ({ id: row.id, title: row.title }));
        console.log('Tracks data fetched successfully.');

        console.log('Returning successful response with problems and tracks data.');
        return t.respond(200, {
            problems: problemsData,
            tracks: tracksData
        });
    } catch (error) {
        console.error('Error in handler:', error);
        if (error instanceof t.HttpError) {
            return t.respond(error.statusCode, { message: error.message });
        }
        return t.respond(500, { message: 'Internal server error', error: error.message });
    }
};
