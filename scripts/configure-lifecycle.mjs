import { GetBucketLifecycleConfigurationCommand, PutBucketLifecycleConfigurationCommand, S3Client } from "@aws-sdk/client-s3";

const required = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Falta ${name}. Carga primero el archivo .env.`);
}

const client = new S3Client({
  endpoint: process.env.S3_ADMIN_ENDPOINT || process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "auto",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

let existingRules = [];
try {
  const current = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: process.env.S3_BUCKET }));
  existingRules = (current.Rules || []).filter((rule) => !rule.ID?.startsWith("pasalo-delete-"));
} catch (error) {
  if (error?.name !== "NoSuchLifecycleConfiguration") throw error;
}

await client.send(new PutBucketLifecycleConfigurationCommand({
  Bucket: process.env.S3_BUCKET,
  LifecycleConfiguration: {
    Rules: [...existingRules, ...[1, 3, 7, 14, 30].map((days) => ({
      ID: `pasalo-delete-${days}d`,
      Status: "Enabled",
      Filter: { Prefix: `retention/${days}d/` },
      Expiration: { Days: days },
    }))],
  },
}));

console.log("Configuradas las caducidades de 1, 3, 7, 14 y 30 días.");
