import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
});

interface MailInput {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Fire-and-forget: an SMTP outage must never fail an API request.
 * Failures are logged with context instead.
 */
export function sendMailInBackground(mail: MailInput, context: Record<string, unknown> = {}) {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    logger.warn({ ...context, subject: mail.subject }, "Email skipped: EMAIL_USER/EMAIL_PASS not configured");
    return;
  }

  transporter
    .sendMail({
      from: env.EMAIL_FROM ?? `"${env.APP_NAME}" <${env.EMAIL_USER}>`,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
    })
    .then((info) => {
      if (!info.accepted?.length) logger.warn({ ...context, rejected: info.rejected }, "Email not accepted");
    })
    .catch((err) => logger.error({ ...context, err: err.message }, "Email send failed"));
}