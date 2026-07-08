// put-admin-teams/index.js - multi-tenant rewrite
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

        const teamId = event.pathParameters?.teamId;
        if (!teamId) {
            return t.respond(400, { message: 'Missing teamId in path parameters.' });
        }

        const body = JSON.parse(event.body);
        const { team_name, leader_email, problem_id, track_id, has_submitted, is_finalist } = body;

        if (!team_name || !leader_email || !track_id) {
            // Check for required fields for a full update, but allow a partial update for is_finalist
            if (is_finalist === undefined) {
                return t.respond(400, { message: 'Missing required fields: team_name, leader_email, track_id.' });
            }
        }

        conn = await t.getConnection();
        await t.assertMembership(conn, caller, hackathonId, 'host');

        await conn.beginTransaction();

        // Handle full team update logic
        if (team_name && leader_email && track_id) {
            const [trackRows] = await conn.execute(
                'SELECT track_id FROM Track WHERE track_id = ? AND hackathon_id = ?',
                [track_id, hackathonId]
            );
            if (trackRows.length === 0) {
                await conn.rollback();
                return t.respond(400, { message: `Invalid track_id: ${track_id}. Track not found.` });
            }

            if (problem_id) {
                console.log(`Checking slots for problem_id: ${problem_id}`);
                const [problemInfoRows] = await conn.execute(
                    `SELECT problem_title, problem_max_slots FROM Problem_Statement WHERE problem_id = ? AND hackathon_id = ?`,
                    [problem_id, hackathonId]
                );

                if (problemInfoRows.length === 0) {
                    await conn.rollback();
                    return t.respond(400, { message: `Problem with ID ${problem_id} not found.` });
                }

                const problemInfo = problemInfoRows[0];
                const [currentSlotsRows] = await conn.execute(
                    `SELECT COUNT(*) AS current_teams FROM Team WHERE problem_id = ? AND hackathon_id = ? AND team_id != ?`,
                    [problem_id, hackathonId, teamId]
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
                await conn.execute(
                    'INSERT INTO Leader (leader_id, hackathon_id, email_address, track_id) VALUES (?, ?, ?, ?)',
                    [leaderId, hackathonId, leader_email, track_id]
                );
                console.log(`Created new leader with ID: ${leaderId}`);
            } else {
                leaderId = leaderRows[0].leader_id;
                await conn.execute(
                    'UPDATE Leader SET track_id = ? WHERE leader_id = ? AND hackathon_id = ?',
                    [track_id, leaderId, hackathonId]
                );
                console.log(`Updated existing leader trackId for ID: ${leaderId}`);
            }

            await conn.execute(
                `UPDATE Team SET
                    leader_id = ?,
                    problem_id = ?,
                    team_name = ?
                WHERE team_id = ? AND hackathon_id = ?`,
                [leaderId, problem_id ?? null, team_name, teamId, hackathonId]
            );

            if (has_submitted !== undefined) {
                if (has_submitted === true) {
                    const [subExists] = await conn.execute('SELECT submission_id FROM Team_Submission WHERE team_id = ?', [teamId]);
                    if (subExists.length === 0) {
                        await conn.execute(
                            `INSERT INTO Team_Submission (submission_id, team_id, last_updated, submission_video_url, github_url, submission_project_description)
                            VALUES (?, ?, NOW(), ?, ?, ?)`,
                            [crypto.randomUUID(), teamId, 'placeholder_url', 'placeholder_github', 'Admin-set submitted status']
                        );
                        console.log(`Created placeholder submission for team ${teamId}.`);
                    } else {
                        console.log(`Submission already exists for team ${teamId}.`);
                    }
                } else if (has_submitted === false) {
                    const [deleteResult] = await conn.execute('DELETE FROM Team_Submission WHERE team_id = ?', [teamId]);
                    if (deleteResult.affectedRows > 0) {
                        console.log(`Deleted submission(s) for team ${teamId}.`);
                    } else {
                        console.log(`No submission found to delete for team ${teamId}.`);
                    }
                }
            }
        }

        // Handle standalone finalist update
        if (is_finalist !== undefined) {
            console.log(`Updating finalist status for team ${teamId} to ${is_finalist}`);
            const [updateFinalistResult] = await conn.execute(
                `UPDATE Team SET is_finalist = ? WHERE team_id = ? AND hackathon_id = ?`,
                [is_finalist ?? null, teamId, hackathonId]
            );
            console.log(`Finalist status updated, affected rows: ${updateFinalistResult.affectedRows}`);
        }

        await conn.commit();

        return t.respond(200, { message: 'Team updated successfully', teamId: teamId });
    } catch (error) {
        if (conn) {
            try {
                await conn.rollback();
                console.log('Transaction rolled back due to error.');
            } catch (rollbackError) {
                console.error('Error during transaction rollback:', rollbackError);
            }
        }
        console.error('Error updating team:', error);
        if (error instanceof t.HttpError) {
            return t.respond(error.statusCode, { message: error.message });
        }
        return t.respond(500, { message: 'Failed to update team', error: error.message });
    }
};
