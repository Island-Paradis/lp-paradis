import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { ConfiguredRetryStrategy } from "@smithy/util-retry";

export const s3Bucket = process.env.S3_BUCKET || "";

// Single source of truth for the S3 client config, shared by the Payload
// storage plugin and the `/cdn` proxy route so both behave identically.
export const s3ClientConfig: S3ClientConfig = {
  credentials: async () => ({
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  }),
  region: process.env.S3_REGION || "",
  endpoint: process.env.S3_ENDPOINT || "",
  forcePathStyle: true,
  // Explicit timeouts so a cold/hung garage connection fails fast and becomes a
  // retryable error instead of hanging until the consumer (Next/browser) gives up.
  requestHandler: {
    connectionTimeout: 3000,
    requestTimeout: 15000,
    httpAgent: { keepAlive: true, maxSockets: 100 },
    httpsAgent: { keepAlive: true, maxSockets: 100 },
  },
  // ~0.4 + 0.8 + 1.6 + 3.2 + 5 s ≈ 11 s retry window to cover the garage cold start.
  retryStrategy: new ConfiguredRetryStrategy(5, (attempt: number) =>
    Math.min(400 * 2 ** attempt, 5000),
  ),
};

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client(s3ClientConfig);
  }
  return s3Client;
}
