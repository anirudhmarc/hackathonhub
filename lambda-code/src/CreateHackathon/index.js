// CreateHackathon — POST /hackathons
// Creates a hackathon owned by the caller and provisions tenant defaults
// (one Track, the __SYSTEM__ problem, 2 judging stages, 4 rubric rows), plus a
// host membership row — all stamped with the new hackathon_id, in one transaction.
const t = require('/opt/nodejs/tenancy');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

// Rubric criteria seeded per hackathon (mirrors the former global db_seed rubric).
const RUBRIC = [
  ['Innovation', 'Originality and novelty of the solution. Scored 1-10.'],
  ['Impact', 'Real-world significance and scale of impact. Scored 1-10.'],
  ['Feasibility', 'Practicality and technical feasibility. Scored 1-10.'],
  ['Working Solution', 'Completeness and functionality of the build. Scored 1-10.'],
];

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    // Only platform Admins or Hosts may create hackathons.
    if (!t.isAdmin(caller) && !(caller.groups || []).includes('Hosts')) {
      return t.respond(403, { message: 'Only Hosts or Admins may create hackathons' });
    }

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const name = (body.name || '').trim();
    if (!name) return t.respond(400, { message: 'name is required' });

    const hackathonId = uuid();
    const trackId = uuid();
    conn = await t.getConnection();
    await conn.beginTransaction();
    try {
      // 1. Hackathon row (timeline fields optional; owner = caller)
      await conn.execute(
        `INSERT INTO Hackathon
          (hackathon_id, name, owner_email, status,
           hackathon_start, hackathon_end,
           problems_selection_start, problems_selection_end,
           submission_start, submission_end,
           final_submission_start, final_submission_end,
           scoring_start, scoring_end, scoring_lock,
           feedback_release, finalists_announcement, winners_announcement,
           logo_url,
           is_problem_statement_selection_enabled, is_team_submission_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          hackathonId, name, caller.email, body.status || 'draft',
          body.hackathon_start || null, body.hackathon_end || null,
          body.problems_selection_start || null, body.problems_selection_end || null,
          body.submission_start || null, body.submission_end || null,
          body.final_submission_start || null, body.final_submission_end || null,
          body.scoring_start || null, body.scoring_end || null, body.scoring_lock || null,
          body.feedback_release || null, body.finalists_announcement || null, body.winners_announcement || null,
          body.logo_url || null,
          body.is_problem_statement_selection_enabled === false ? 0 : 1,
          body.is_team_submission_enabled === false ? 0 : 1,
        ]
      );

      // 2. Host membership for the creator
      await conn.execute(
        'INSERT INTO Hackathon_Membership (membership_id, hackathon_id, email_address, role) VALUES (?, ?, ?, ?)',
        [uuid(), hackathonId, caller.email, 'host']
      );

      // 3. Default track
      await conn.execute(
        'INSERT INTO Track (track_id, hackathon_id, track_title) VALUES (?, ?, ?)',
        [trackId, hackathonId, body.track_title || 'General']
      );

      // 4. System problem (satisfies the non-null problem_id submission contract)
      await conn.execute(
        `INSERT INTO Problem_Statement
          (problem_id, hackathon_id, problem_title, problem_description, problem_tag, problem_max_slots, track_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), hackathonId, 'General Submission',
         'System placeholder. Teams enter their own problem statement on the submission form.',
         '__SYSTEM__', 99999, trackId]
      );

      // 5. Two judging stages
      for (const [sName, sDesc] of [['Initial Review', 'First round of judging'], ['Final Round', 'Final judging round']]) {
        await conn.execute(
          'INSERT INTO Judging_Stage (stage_id, hackathon_id, stage_name, description) VALUES (?, ?, ?, ?)',
          [uuid(), hackathonId, sName, sDesc]
        );
      }

      // 6. Rubric rows (tagged __RUBRIC__ Problem_Statement rows, per hackathon)
      for (const [title, desc] of RUBRIC) {
        await conn.execute(
          `INSERT INTO Problem_Statement
            (problem_id, hackathon_id, problem_title, problem_description, problem_tag, problem_max_slots, track_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), hackathonId, title, desc, '__RUBRIC__', 10, trackId]
        );
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }

    return t.respond(201, { hackathon_id: hackathonId, name, owner_email: caller.email, track_id: trackId });
  } catch (err) {
    console.error('CreateHackathon error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to create hackathon', error: err.message });
  }
};
