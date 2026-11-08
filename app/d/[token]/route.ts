import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { readShareToken } from "@/lib/crypto";
import { env } from "@/lib/env";
import { s3 } from "@/lib/s3";
import { readMetadata, writeMetadata } from "@/lib/metadata";
import { sendDownloadNotice } from "@/lib/mail";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const payload = readShareToken(token);
  if (!payload) {
    return new NextResponse("Este enlace ha caducado o no es válido.", {
      status: 410,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const metadata = await readMetadata(payload.metaKey);
  if (!metadata?.ready || metadata.id !== payload.id) {
    return new NextResponse("El archivo no está disponible.", { status: 404 });
  }

  const downloadedAt = new Date().toISOString();
  const isFirstDownload = metadata.downloadCount === 0;
  metadata.downloadCount += 1;
  metadata.firstDownloadedAt ||= downloadedAt;
  metadata.lastDownloadedAt = downloadedAt;
  await writeMetadata(payload.metaKey, metadata);

  if (isFirstDownload && metadata.notifyOnDownload) {
    try { await sendDownloadNotice(metadata.name, downloadedAt); } catch { /* La descarga no debe fallar por el email. */ }
  }

  const downloadUrl = await getSignedUrl(s3(), new GetObjectCommand({
    Bucket: env().bucket,
    Key: payload.key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(payload.name)}`,
  }), { expiresIn: 15 * 60 });

  return NextResponse.redirect(downloadUrl, 307);
}
