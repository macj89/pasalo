import nodemailer from "nodemailer";
import { env } from "@/lib/env";

let transport: nodemailer.Transporter | undefined;

function mailer() {
  const config = env();
  if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: { user: config.smtpUser, pass: config.smtpPassword },
    });
  }
  return transport;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

export async function sendShareEmail(to: string, name: string, url: string, expiresAt: string) {
  const client = mailer();
  if (!client) return false;
  await client.sendMail({
    from: env().mailFrom,
    to,
    subject: `Te han enviado ${name}`,
    text: `Puedes descargar ${name} aquí:\n\n${url}\n\nEl enlace caduca el ${formatDate(expiresAt)}.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;color:#242923"><h1 style="font-size:24px">Te han enviado un archivo</h1><p><strong>${escapeHtml(name)}</strong></p><p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#235c43;color:#fff;text-decoration:none;border-radius:6px">Descargar archivo</a></p><p style="color:#626a61">El enlace caduca el ${formatDate(expiresAt)}.</p></div>`,
  });
  return true;
}

export async function sendDownloadNotice(name: string, downloadedAt: string) {
  const client = mailer();
  const to = env().notificationEmail;
  if (!client || !to) return false;
  await client.sendMail({
    from: env().mailFrom,
    to,
    subject: `Han descargado ${name}`,
    text: `Se ha iniciado la descarga de ${name} el ${formatDate(downloadedAt)}.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;color:#242923"><h1 style="font-size:24px">Archivo descargado</h1><p>Se ha iniciado la descarga de <strong>${escapeHtml(name)}</strong>.</p><p>${formatDate(downloadedAt)}</p></div>`,
  });
  return true;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}
