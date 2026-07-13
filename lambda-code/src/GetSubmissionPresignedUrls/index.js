// GetSubmissionPresignedUrls — POST /hackathons/{hackathonId}/participant/submission-urls
// Returns S3 PUT presigned URLs for a team's submission files, keyed under the
// hackathon + team so objects are isolated per tenant.
const t = require('/opt/nodejs/tenancy');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';
const s3 = new S3Client({ region: REGION });
const BUCKET = process.env.S3_BUCKET_NAME;

exports.handler = async (event) => {
  let conn;
  try {
    const caller = t.getCaller(event);
    if (!caller.email) return t.respond(401, { message: 'Authorization token missing.' });
    const hackathonId = t.resolveHackathonId(event);
    if (!hackathonId) return t.respond(400, { message: 'Missing hackathon id' });

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const { teamId, files } = body;
    if (!teamId || !Array.isArray(files) || files.length === 0) {
      return t.respond(400, { message: 'Missing required fields: teamId, files (array of {fileName, fileType, category}).' });
    }

    conn = await t.getConnection();
    await t.assertMembership(conn, caller, hackathonId, 'participant');

    const generatedUrls = await Promise.all(files.map(async (file) => {
      let prefix;
      if (file.category === 'video') prefix = `submissions/${hackathonId}/${teamId}/video`;
      else if (file.category === 'additional') prefix = `submissions/${hackathonId}/${teamId}/additional-materials`;
      else throw new t.HttpError(400, `Invalid file category: ${file.category}`);

      const s3Key = `${prefix}/${file.fileName}`;
      const presignedUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: file.fileType }),
        { expiresIn: 300 }
      );
      const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;
      return { fileName: file.fileName, category: file.category, presignedUrl, fileUrl };
    }));

    return t.respond(200, { urls: generatedUrls });
  } catch (err) {
    console.error('GetSubmissionPresignedUrls error:', err);
    if (err instanceof t.HttpError) return t.respond(err.statusCode, { message: err.message });
    return t.respond(500, { message: 'Failed to get presigned URLs', error: err.message });
  }
};
