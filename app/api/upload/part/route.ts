import { cookies } from "next/headers";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, readShareToken, validSession } from "@/lib/crypto";
import { s3 } from "@/lib/s3";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!validSession(cookieStore.get(AUTH_COOKIE)?.value)) {
    return NextResponse.json({ error: "Sesión caducada. Vuelve a entrar." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const payload = typeof body.token === "string" ? readShareToken(body.token) : null;
  const partNumber = Number(body.partNumber);
  if (!payload || typeof body.uploadId !== "string" || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
    return NextResponse.json({ error: "Datos de subida no válidos." }, { status: 400 });
  }
  const uploadUrl = await getSignedUrl(s3(), new UploadPartCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: payload.key,
    UploadId: body.uploadId,
    PartNumber: partNumber,
  }), { expiresIn: 60 * 60 });
  return NextResponse.json({ uploadUrl });
}
