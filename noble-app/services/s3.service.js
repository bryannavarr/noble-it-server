// Read-only S3 helper: generates presigned URLs the admin frontend can use
// to view / download invoice PDFs. No-op when AWS credentials are absent
// (typical for local dev) — callers get back null and should hide the
// download/preview actions in the UI.

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const enabled = !!(region && bucket && accessKeyId && secretAccessKey);

const client = enabled
  ? new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

const isEnabled = () => enabled;

// Returns a presigned URL for GET, valid for `expiresInSeconds`. Returns null
// when S3 isn't configured.
const getSignedViewUrl = async (s3Key, expiresInSeconds = 300) => {
  if (!enabled || !client) return null;
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
    { expiresIn: expiresInSeconds },
  );
};

module.exports = { isEnabled, getSignedViewUrl };
