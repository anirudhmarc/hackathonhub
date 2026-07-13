// GetHackathonLogoUploadUrl — POST /hackathons/{hackathonId}/logo-url
// Host/Admin only. Returns a presigned S3 PUT URL for the hackathon's logo, plus
// the stable object key (stored on Hackathon.logo_url and re-signed for GET on read).
const t = require('/opt/nodejs/tenancy');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region: REGION });
const BUCKET = process.env.S3_BUCKET_NAME;

const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Unauthenticated' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const fileType = body.fileType || 'image/png';
    const ext = EXT_BY_TYPE[fileType.toLowerCase()];
    if (!ext) return t.respond(400, { message: `Unsupported logo type: ${fileType}. Allowed: png, jpg, svg, webp, gif.` });

    conn = await t.getConnection();
    // Only a host of this hackathon (or Admin) may set its logo.
    await t.assertMembership(conn, caller, hackathonId, 'host');

    // Stable key per hackathon (overwrites previous logo on re-upload).
    const s3Key = `hackathon-logos/${hackathonId}/logo.${ext}`;
    const presignedUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: fileType }),
      { expiresIn: 300 }
    );
    // The canonical value we persist on Hackathon.logo_url (re-signed for GET on read).
    const logoUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;

    return t.respond(200, { presignedUrl, logoUrl, key: s3Key });
  } catch (err) {
    console.error('GetHackathonLogoUploadUrl error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to get logo upload URL', error: err.message });
  }
};
