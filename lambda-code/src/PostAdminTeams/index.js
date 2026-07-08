// post-admin-teams/index.js - multi-tenant rewrite
const t = require('/opt/nodejs/tenancy');
const crypto = require('crypto');

exports.handler = async (event) => {
    let conn;
    try {
        console.log('Received event:', JSON.stringify(event));

        const caller = t.getCaller(event);
        const hackathonId = t.resolveHackathonId(event);
        if (!hackathonId) {
            return t.respond(400, { message: 'Missing hackathonId.' });
        }

        const body = JSON.parse(event.body);
        const { team_name, leader_email, problem_id, track_id } = body;

        if (!team_name || !leader_email || !track_id) {
            return t.respond(400, { message: 'Missing required fields: team_name, leader_email, track_id.' });
        }

        conn = await t.getConnection();
        await t.assertMembership(conn, caller, hackathonId, 'host');

        await conn.beginTransaction();
        console.log('Transaction started.');

        const [trackRows] = await conn.execute(
            'SELECT track_id FROM Track WHERE track_id = ? AND hackathon_id = ?',
            [track_id, hackathonId]
        );
        if (trackRows.length === 0) {
            await conn.rollback();
            console.error(`Error: Invalid track_id: ${track_id}. Track not found.`);
            return t.respond(400, { message: `Invalid track_id: ${track_id}. Track not found.` });
        }

        let problemIdToInsert = problem_id ?? null;
        if (problemIdToInsert) {
            console.log(`Checking slots for problem_id: ${problemIdToInsert}`);
            const [problemInfoRows] = await conn.execute(
                `SELECT problem_title, problem_max_slots FROM Problem_Statement WHERE problem_id = ? AND hackathon_id = ?`,
                [problemIdToInsert, hackathonId]
            );

            if (problemInfoRows.length === 0) {
                await conn.rollback();
                return t.respond(400, { message: `Problem with ID ${problemIdToInsert} not found.` });
            }

            const problemInfo = problemInfoRows[0];
            const [currentSlotsRows] = await conn.execute(
                `SELECT COUNT(*) AS current_teams FROM Team WHERE problem_id = ? AND hackathon_id = ?`,
                [problemIdToInsert, hackathonId]
            );
            const currentTeams = currentSlotsRows[0].current_teams;

            if (currentTeams >= problemInfo.problem_max_slots) {
                await conn.rollback();
                return t.respond(400, { message: `The problem "${problemInfo.problem_title}" is full. Max slots: ${problemInfo.problem_max_slots}.` });
            }
            console.log(`Problem "${problemInfo.problem_title}" has ${currentTeams}/${problemInfo.problem_max_slots} slots filled.`);
        }

        let leaderId;
        const [leaderRows] = await conn.execute(
            'SELECT leader_id FROM Leader WHERE email_address = ? AND hackathon_id = ?',
            [leader_email, hackathonId]
        );
        if (leaderRows.length === 0) {
            leaderId = crypto.randomUUID();
            console.log(`Leader not found. Creating new leader with ID: ${leaderId} and email: ${leader_email}`);
            await conn.execute(
                'INSERT INTO Leader (leader_id, hackathon_id, email_address, track_id) VALUES (?, ?, ?, ?)',
                [leaderId, hackathonId, leader_email, track_id]
            );
        } else {
            leaderId = leaderRows[0].leader_id;
            console.log(`Found existing leader with ID: ${leaderId} and email: ${leader_email}`);
        }

        const teamId = `hackhub-2025-team-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        console.log(`Generated new team ID: ${teamId}`);

        await conn.execute(
            'INSERT INTO Team (team_id, hackathon_id, leader_id, problem_id, team_name, problem_selection_id) VALUES (?, ?, ?, ?, ?, ?)',
            [teamId, hackathonId, leaderId, problemIdToInsert, team_name, crypto.randomUUID()]
        );
        console.log(`Created new team with ID: ${teamId}, Name: ${team_name}`);

        await conn.commit();
        console.log('Transaction committed successfully.');

        return t.respond(201, { message: 'Team created successfully', teamId: teamId, teamName: team_name });
    } catch (error) {
        if (conn) {
            try {
                await conn.rollback();
                console.log('Transaction rolled back due to error.');
            } catch (rollbackError) {
                console.error('Error during transaction rollback:', rollbackError);
            }
        }
        console.error('Error creating team:', error);
        if (error instanceof t.HttpError) {
            return t.respond(error.statusCode, { message: error.message });
        }
        return t.respond(500, { message: 'Failed to create team', error: error.message });
    }
};
