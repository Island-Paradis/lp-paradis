import {
  GetObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
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

// Copy a view into a standalone ArrayBuffer so it is a valid BodyInit.
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(
    view.byteOffset,
    view.byteOffset + view.byteLength,
  ) as ArrayBuffer;
}

// Parse a single `bytes=start-end` range against the object size.
function parseRange(
  rangeHeader: string,
  size: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start: number;
  let end: number;
  if (rawStart === "") {
    // Suffix range: last N bytes.
    const suffix = Number(rawEnd);
    if (suffix <= 0) return null;
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (start > end || start >= size) return null;
  return { start, end };
}

// Build the response, honouring a Range request by slicing the buffered bytes
// locally — we never forward Range to garage, which rejects Range-signed requests.
function buildResponse(
  object: GetObjectCommandOutput,
  bytes: Uint8Array,
  rangeHeader: string | null,
): Response {
  const headers = new Headers();
  if (object.ContentType) headers.set("Content-Type", object.ContentType);
  if (object.ETag) headers.set("ETag", object.ETag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Accept-Ranges", "bytes");

  const size = bytes.byteLength;

  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);
    if (!range) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    const slice = bytes.subarray(range.start, range.end + 1);
    return new Response(toArrayBuffer(slice), { status: 206, headers });
  }

  return new Response(toArrayBuffer(bytes), { status: 200, headers });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join("/");
  const rangeHeader = request.headers.get("range");
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
      return buildResponse(object, bytes, rangeHeader);
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
