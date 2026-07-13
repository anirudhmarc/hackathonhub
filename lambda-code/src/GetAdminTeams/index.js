// get-admin-teams/index.js - multi-tenant rewrite
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

        console.log('Executing SQL query to fetch teams...');
        const [teamsRows] = await conn.execute(`
            SELECT
                t.team_id AS id,
                t.team_name AS name,
                l.email_address AS leader_email,
                ps.problem_id,
                ps.problem_title,
                ps.problem_description,
                tr.track_title AS track_name_from_db,
                tr.track_id AS track_id_from_db,
                (ts.submission_id IS NOT NULL) AS has_submitted_from_db,
                t.is_finalist
            FROM
                Team t
            LEFT JOIN
                Leader l ON t.leader_id = l.leader_id AND l.hackathon_id = t.hackathon_id
            LEFT JOIN
                Problem_Statement ps ON t.problem_id = ps.problem_id AND ps.hackathon_id = t.hackathon_id
            LEFT JOIN
                Track tr ON l.track_id = tr.track_id AND tr.hackathon_id = t.hackathon_id
            LEFT JOIN
                Team_Submission ts ON t.team_id = ts.team_id
            WHERE
                t.hackathon_id = ?
        `, [hackathonId]);
        console.log('SQL query for teams executed successfully.');

        const teamsData = teamsRows.map(row => ({
            id: row.id,
            name: row.name,
            leader_email: row.leader_email,
            problem_id: row.problem_id,
            problem_title: row.problem_title,
            problem_description: row.problem_description,
            track: row.track_name_from_db || null,
            track_id: row.track_id_from_db,
            has_submitted: !!row.has_submitted_from_db,
            is_finalist: !!row.is_finalist
        }));

        console.log('Executing SQL query to fetch problem statements with slot count...');
        const [problemsRows] = await conn.execute(`
            SELECT
                ps.problem_id AS id,
                ps.problem_title AS title,
                ps.problem_max_slots AS max_slots,
                ps.track_id,
                COUNT(t.team_id) AS current_slots
            FROM
                Problem_Statement ps
            LEFT JOIN
                Team t ON ps.problem_id = t.problem_id AND t.hackathon_id = ps.hackathon_id
            WHERE
                ps.hackathon_id = ?
            GROUP BY
                ps.problem_id, ps.problem_title, ps.problem_max_slots, ps.track_id
            ORDER BY ps.problem_title ASC
        `, [hackathonId]);
        console.log('SQL query for problems executed successfully.');

        const problemsData = problemsRows.map(row => ({
            id: row.id,
            title: row.title,
            trackId: row.track_id,
            maxSlots: row.max_slots,
            currentSlots: row.current_slots,
            isAvailable: row.current_slots < row.max_slots
        }));

        console.log('Executing SQL query to fetch tracks...');
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
        console.log('SQL query for tracks executed successfully.');

        const tracksData = tracksRows.map(row => ({
            id: row.id,
            title: row.title
        }));

        console.log('Returning successful response with all data.');
        return t.respond(200, { teams: teamsData, problems: problemsData, tracks: tracksData });
    } catch (error) {
        console.error('Error in handler:', error);
        if (error instanceof t.HttpError) {
            return t.respond(error.statusCode, { message: error.message });
        }
        return t.respond(500, { message: 'Internal server error', error: error.message });
    }
};
