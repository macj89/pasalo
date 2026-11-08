import { cookies } from "next/headers";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, validSession } from "@/lib/crypto";
import { env } from "@/lib/env";
import { readMetadata } from "@/lib/metadata";
import { s3 } from "@/lib/s3";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  if (!validSession(cookieStore.get(AUTH_COOKIE)?.value)) {
    return NextResponse.json({ error: "Sesión caducada." }, { status: 401 });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.metadataKey !== "string" || !body.metadataKey.startsWith("retention/") || !body.metadataKey.endsWith("/metadata.json")) {
    return NextResponse.json({ error: "Transferencia no válida." }, { status: 400 });
  }
  const metadata = await readMetadata(body.metadataKey);
  if (!metadata || metadata.id !== id) return NextResponse.json({ error: "No se encontró la transferencia." }, { status: 404 });

  await s3().send(new DeleteObjectsCommand({
    Bucket: env().bucket,
    Delete: { Objects: [{ Key: metadata.key }, { Key: body.metadataKey }], Quiet: true },
  }));
  return NextResponse.json({ ok: true });
}
