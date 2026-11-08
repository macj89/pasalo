import { cookies } from "next/headers";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, readShareToken, validSession } from "@/lib/crypto";
import { readMetadata, writeMetadata } from "@/lib/metadata";
import { sendShareEmail } from "@/lib/mail";
import { env } from "@/lib/env";
import { s3 } from "@/lib/s3";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!validSession(cookieStore.get(AUTH_COOKIE)?.value)) {
    return NextResponse.json({ error: "Sesión caducada. Vuelve a entrar." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const payload = typeof body.token === "string" ? readShareToken(body.token) : null;
  if (!payload) return NextResponse.json({ error: "La subida no es válida." }, { status: 400 });

  const metadata = await readMetadata(payload.metaKey);
  if (!metadata || metadata.id !== payload.id) {
    return NextResponse.json({ error: "No se encontraron los datos de la subida." }, { status: 404 });
  }
  if (body.uploadId) {
    if (!Array.isArray(body.parts) || body.parts.length === 0 || body.parts.length > 10_000) {
      return NextResponse.json({ error: "Faltan partes de la subida." }, { status: 400 });
    }
    const parts = body.parts.map((part: unknown, index: number) => {
      if (!part || typeof part !== "object") throw new Error(`Parte ${index + 1} no válida.`);
      const value = part as { ETag?: unknown; PartNumber?: unknown };
      if (typeof value.ETag !== "string" || !Number.isInteger(value.PartNumber)) throw new Error(`Parte ${index + 1} no válida.`);
      return { ETag: value.ETag, PartNumber: value.PartNumber };
    });
    try {
      await s3().send(new CompleteMultipartUploadCommand({
        Bucket: env().bucket,
        Key: payload.key,
        UploadId: body.uploadId,
        MultipartUpload: { Parts: parts },
      }));
    } catch {
      return NextResponse.json({ error: "No se pudo terminar la subida por partes." }, { status: 502 });
    }
  }
  metadata.ready = true;
  await writeMetadata(payload.metaKey, metadata);

  let emailSent = false;
  if (metadata.recipientEmail) {
    try {
      emailSent = await sendShareEmail(metadata.recipientEmail, metadata.name, body.shareUrl, metadata.expiresAt);
    } catch {
      emailSent = false;
    }
  }
  return NextResponse.json({ ok: true, emailSent, emailRequested: Boolean(metadata.recipientEmail) });
}
