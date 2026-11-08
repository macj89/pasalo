import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { s3 } from "@/lib/s3";

export type UploadMetadata = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string;
  recipientEmail?: string;
  notifyOnDownload: boolean;
  ready: boolean;
  downloadCount: number;
  firstDownloadedAt?: string;
  lastDownloadedAt?: string;
};

export async function writeMetadata(key: string, metadata: UploadMetadata) {
  await s3().send(new PutObjectCommand({
    Bucket: env().bucket,
    Key: key,
    Body: JSON.stringify(metadata),
    ContentType: "application/json",
  }));
}

export async function readMetadata(key: string) {
  try {
    const response = await s3().send(new GetObjectCommand({ Bucket: env().bucket, Key: key }));
    if (!response.Body) return null;
    return JSON.parse(await response.Body.transformToString()) as UploadMetadata;
  } catch {
    return null;
  }
}

export async function listTransfers() {
  const transfers: Array<UploadMetadata & { metadataKey: string }> = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3().send(new ListObjectsV2Command({
      Bucket: env().bucket,
      Prefix: "retention/",
      ContinuationToken: continuationToken,
    }));
    const keys = (response.Contents || [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key?.endsWith("/metadata.json")));
    const metadata = await Promise.all(keys.map(async (metadataKey) => {
      const value = await readMetadata(metadataKey);
      return value ? { ...value, metadataKey } : null;
    }));
    transfers.push(...metadata.filter((value): value is UploadMetadata & { metadataKey: string } => value !== null));
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return transfers.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
