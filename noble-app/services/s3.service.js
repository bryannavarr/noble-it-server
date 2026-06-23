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

// S3 is enabled when we know which region + bucket to talk to. Credentials are
// resolved by the SDK itself: env vars → ~/.aws/credentials → EC2 instance
// role (IMDS), in that order. Only pass explicit credentials when they're in
// env; otherwise let the SDK auto-discover from the instance role.
const enabled = !!(region && bucket);

const client = enabled
  ? new S3Client({
      region,
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    })
  : null;

const isEnabled = () => enabled;

// Returns a presigned URL for GET, valid for `expiresInSeconds`. Returns null
// when S3 isn't configured.
const getSignedViewUrl = async (s3Key, expiresInSeconds = 300) => {
  if (!enabled || !client) return null;
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: s3Key }), {
    expiresIn: expiresInSeconds,
  });
};

module.exports = { isEnabled, getSignedViewUrl };
