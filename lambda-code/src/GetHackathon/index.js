// GetHackathon — GET /hackathons/{hackathonId}
// Returns a single hackathon (with its full timeline) if the caller may see it.
const t = require('/opt/nodejs/tenancy');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region: REGION });
const BUCKET = process.env.S3_BUCKET_NAME;

// Turn a stored logo S3 URL into a presigned GET (bucket is not public).
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
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    conn = await t.getConnection();
    const [rows] = await conn.execute('SELECT * FROM Hackathon WHERE hackathon_id = ?', [hackathonId]);
    if (rows.length === 0) return t.respond(404, { message: 'Hackathon not found' });
    const hackathon = rows[0];
    hackathon.logo_url = await presignLogo(hackathon.logo_url);

    // Authorization: Admin, owner, or any membership in this hackathon.
    if (!t.isAdmin(caller) && hackathon.owner_email !== caller.email) {
      const [m] = await conn.execute(
        'SELECT 1 FROM Hackathon_Membership WHERE hackathon_id = ? AND email_address = ? LIMIT 1',
        [hackathonId, caller.email]
      );
      if (m.length === 0) return t.respond(403, { message: 'Not a member of this hackathon' });
    }

    return t.respond(200, { hackathon });
  } catch (err) {
    console.error('GetHackathon error:', err);
    return t.respond(500, { message: 'Failed to get hackathon', error: err.message });
  }
};
