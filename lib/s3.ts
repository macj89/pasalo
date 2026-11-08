import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

let client: S3Client | undefined;

export function s3() {
  if (!client) {
    const config = env();
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}
