import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { CreateMultipartUploadCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, createShareToken, validSession } from "@/lib/crypto";
import { env } from "@/lib/env";
import { s3 } from "@/lib/s3";
import { writeMetadata } from "@/lib/metadata";

const ALLOWED_DAYS = new Set([1, 3, 7, 14, 30]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PART_SIZE = 50 * 1024 * 1024;

function safeName(name: string) {
  return name.normalize("NFKC").replaceAll("\r", "-").replaceAll("\n", "-").replace(/[\\/\0]/g, "-").slice(0, 180) || "archivo";
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!validSession(cookieStore.get(AUTH_COOKIE)?.value)) {
    return NextResponse.json({ error: "Sesión caducada. Vuelve a entrar." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const config = env();
  if (typeof body.name !== "string" || typeof body.size !== "number" || body.size <= 0) {
    return NextResponse.json({ error: "El archivo no es válido." }, { status: 400 });
  }
  if (body.size > config.maxFileSize) {
    return NextResponse.json({ error: "El archivo supera el tamaño máximo permitido." }, { status: 413 });
  }

  const days = Number(body.days);
  if (!ALLOWED_DAYS.has(days)) {
    return NextResponse.json({ error: "La caducidad elegida no es válida." }, { status: 400 });
  }
  const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim().toLowerCase() : "";
  if (recipientEmail && (!EMAIL_PATTERN.test(recipientEmail) || recipientEmail.length > 254)) {
    return NextResponse.json({ error: "El email del destinatario no es válido." }, { status: 400 });
  }

  const name = safeName(body.name);
  const id = randomUUID();
  const prefix = `retention/${days}d/${id}`;
  const key = `${prefix}/files/${name}`;
  const metaKey = `${prefix}/metadata.json`;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const contentType = typeof body.type === "string" && body.type ? body.type : "application/octet-stream";
  const multipart = body.size > PART_SIZE;
  const uploadId = multipart
    ? (await s3().send(new CreateMultipartUploadCommand({ Bucket: config.bucket, Key: key, ContentType: contentType }))).UploadId
    : undefined;
  if (multipart && !uploadId) throw new Error("No se pudo iniciar la subida por partes.");
  const uploadUrl = multipart ? undefined : await getSignedUrl(s3(), new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  }), { expiresIn: 60 * 60 });

  await writeMetadata(metaKey, {
    id,
    name,
    key,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    recipientEmail: recipientEmail || undefined,
    notifyOnDownload: body.notifyOnDownload === true,
    ready: false,
    downloadCount: 0,
  });

  const token = createShareToken({
    id,
    key,
    metaKey,
    name,
    exp: expiresAt.getTime(),
  });
  const incomingHeaders = await headers();
  const origin = config.appUrl || `${incomingHeaders.get("x-forwarded-proto") || "http"}://${incomingHeaders.get("host")}`;

  return NextResponse.json({
    uploadUrl,
    uploadId,
    multipart,
    partSize: PART_SIZE,
    shareUrl: `${origin}/d/${token}`,
    completionToken: token,
  });
}
