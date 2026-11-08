const requiredNames = [
  "UPLOAD_PASSWORD",
  "AUTH_SECRET",
  "SHARE_SECRET",
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
] as const;

export function env() {
  for (const name of requiredNames) {
    if (!process.env[name]) throw new Error(`Falta la variable de entorno ${name}`);
  }

  return {
    appUrl: process.env.APP_URL?.replace(/\/$/, ""),
    uploadPassword: process.env.UPLOAD_PASSWORD!,
    authSecret: process.env.AUTH_SECRET!,
    shareSecret: process.env.SHARE_SECRET!,
    endpoint: process.env.S3_ENDPOINT!,
    region: process.env.S3_REGION || "auto",
    bucket: process.env.S3_BUCKET!,
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    maxFileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 20 * 1024 ** 3),
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    mailFrom: process.env.MAIL_FROM || "Files <noreply@example.com>",
    notificationEmail: process.env.NOTIFICATION_EMAIL,
  };
}
