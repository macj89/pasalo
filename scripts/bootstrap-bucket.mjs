import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";

const required = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Falta ${name}. Carga primero el archivo .env.production.`);
}

const client = new S3Client({
  endpoint: process.env.S3_ADMIN_ENDPOINT || process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

try {
  await client.send(new CreateBucketCommand({ Bucket: process.env.S3_BUCKET }));
} catch (error) {
  if (error?.name !== "BucketAlreadyOwnedByYou" && error?.name !== "BucketAlreadyExists") throw error;
}

console.log(`Bucket ${process.env.S3_BUCKET} preparado.`);
