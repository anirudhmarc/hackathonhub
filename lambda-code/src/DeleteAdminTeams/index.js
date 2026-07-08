// delete-admin-teams/index.js - multi-tenant rewrite
const t = require('/opt/nodejs/tenancy');

exports.handler = async (event) => {
    let conn;
    try {
        console.log('Received event:', JSON.stringify(event));

        const caller = t.getCaller(event);
        const hackathonId = t.resolveHackathonId(event);
        if (!hackathonId) {
            return t.respond(400, { message: 'Missing hackathonId.' });
        }

        const teamId = event.pathParameters?.teamId; // Get teamId from path parameters
        if (!teamId) {
            return t.respond(400, { message: 'Missing teamId in path parameters.' });
        }

        conn = await t.getConnection();
        await t.assertMembership(conn, caller, hackathonId, 'host');

        await conn.beginTransaction();

        // CRITICAL: Handle foreign key constraints - delete dependent records first
        // Delete from Score (if it references Team), scoped by hackathon_id
        await conn.execute('DELETE FROM Score WHERE team_id = ? AND hackathon_id = ?', [teamId, hackathonId]);
        console.log(`Deleted scores for team ${teamId}.`);

        // Delete from Team_Submission (if it references Team), scoped by hackathon_id
        await conn.execute('DELETE FROM Team_Submission WHERE team_id = ? AND hackathon_id = ?', [teamId, hackathonId]);
        console.log(`Deleted submissions for team ${teamId}.`);

        // Then delete the team itself, scoped by hackathon_id
        const [result] = await conn.execute('DELETE FROM Team WHERE team_id = ? AND hackathon_id = ?', [teamId, hackathonId]);
        console.log(`Deleted team with ID: ${teamId}, Affected Rows: ${result.affectedRows}`);

        await conn.commit();

        if (result.affectedRows === 0) {
            return t.respond(404, { message: 'Team not found or already deleted.' });
        }

        return t.respond(204, { message: 'Team deleted successfully' });
    } catch (error) {
        if (conn) {
            try {
                await conn.rollback();
                console.log('Transaction rolled back due to error.');
            } catch (rollbackError) {
                console.error('Error during transaction rollback:', rollbackError);
            }
        }
        console.error('Error deleting team:', error);
        if (error instanceof t.HttpError) {
            return t.respond(error.statusCode, { message: error.message });
        }
        return t.respond(500, { message: 'Failed to delete team', error: error.message });
    }
};
