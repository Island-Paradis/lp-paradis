import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, s3Bucket } from "@/service/s3";

export const runtime = "nodejs";
// Served on demand; HTTP caching is controlled via the Cache-Control header below.
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e.name === "NoSuchKey" ||
    e.name === "NotFound" ||
    e.$metadata?.httpStatusCode === 404
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join("/");
  const client = getS3Client();

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const object = await client.send(
        new GetObjectCommand({ Bucket: s3Bucket, Key: key }),
      );
      if (!object.Body) {
        return new Response(null, { status: 404 });
      }
      // Buffer the whole object so a mid-stream connection drop throws here and
      // is retried with a fresh request, instead of forwarding a truncated body.
      const bytes = await object.Body.transformToByteArray();
      const body = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;

      const headers = new Headers();
      if (object.ContentType) headers.set("Content-Type", object.ContentType);
      if (object.ETag) headers.set("ETag", object.ETag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");

      return new Response(body, { status: 200, headers });
    } catch (err) {
      if (isNotFound(err)) {
        return new Response(null, { status: 404 });
      }
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  console.error(
    `[cdn] failed to fetch "${key}" after ${MAX_ATTEMPTS} attempts`,
    lastError,
  );
  return new Response("Bad Gateway", { status: 502 });
}
