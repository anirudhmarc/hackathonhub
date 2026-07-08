// GetHackathons — GET /hackathons
// Admin -> all hackathons; Host -> owned or host-membership; Judge/Participant -> by membership.
const t = require('/opt/nodejs/tenancy');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region: REGION });
const BUCKET = process.env.S3_BUCKET_NAME;

async function presignLogo(url) {
  if (!url || !BUCKET || !url.includes(BUCKET)) return url || null;
  try {
    const u = new URL(url);
    const key = decodeURIComponent(u.pathname.replace(/^\//, ''));
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 604800 });
  } catch (e) { return url; }
}

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    conn = await t.getConnection();

    let rows;
    if (t.isAdmin(caller)) {
      [rows] = await conn.execute('SELECT * FROM Hackathon ORDER BY created_at DESC');
    } else {
      // Any hackathon the caller owns OR has any membership in.
      [rows] = await conn.execute(
        `SELECT DISTINCT h.* FROM Hackathon h
         LEFT JOIN Hackathon_Membership m ON m.hackathon_id = h.hackathon_id AND m.email_address = ?
         WHERE h.owner_email = ? OR m.membership_id IS NOT NULL
         ORDER BY h.created_at DESC`,
        [caller.email, caller.email]
      );
    }
    await Promise.all(rows.map(async (h) => { h.logo_url = await presignLogo(h.logo_url); }));
    return t.respond(200, { hackathons: rows });
  } catch (err) {
    console.error('GetHackathons error:', err);
    return t.respond(500, { message: 'Failed to list hackathons', error: err.message });
  }
};
