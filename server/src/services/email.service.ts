import { env } from "../config/env";
import { sendMailInBackground } from "../lib/mailer";
import { escapeHtml as e } from "../utils/html";

const layout = (title: string, body: string) => `<!doctype html>
<html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#374151;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:32px;max-width:100%;">
<tr><td>
<h2 style="margin:0 0 16px;color:#111827;">${e(title)}</h2>
${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
<p style="font-size:12px;color:#6b7280;margin:0;">— The ${e(env.APP_NAME)} Team</p>
</td></tr></table></td></tr></table></body></html>`;

const button = (url: string, label: string) =>
  `<p style="margin:24px 0;"><a href="${e(url)}" style="background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">${e(label)}</a></p>
   <p style="font-size:12px;color:#6b7280;word-break:break-all;">Or copy this link: ${e(url)}</p>`;

const stars = (v: number) => "★".repeat(v) + "☆".repeat(5 - v);

interface Meta {
  ip?: string;
  userAgent?: string;
}

export function sendVerificationEmail(to: string, name: string, url: string) {
  sendMailInBackground(
    {
      to,
      subject: "Verify your email address",
      html: layout(
        "Verify your email",
        `<p>Hi ${e(name)},</p><p>Thanks for signing up. Please confirm your email to finish creating your account. This link expires in 30 minutes.</p>${button(url, "Verify email")}`,
      ),
    },
    { flow: "verify-email", to },
  );
}

export function sendWelcomeEmail(to: string, name: string) {
  sendMailInBackground(
    {
      to,
      subject: `Welcome to ${env.APP_NAME}`,
      html: layout("Welcome aboard 🎉", `<p>Hi ${e(name)},</p><p>Your email has been verified and your account is ready. You can now log in.</p>`),
    },
    { flow: "welcome", to },
  );
}

export function sendLoginAlertEmail(to: string, name: string, meta: Meta, method: "password" | "google") {
  sendMailInBackground(
    {
      to,
      subject: "New login to your account",
      html: layout(
        "Login successful",
        `<p>Hi ${e(name)},</p>
         <p>Your account was just signed in to using <strong>${method === "google" ? "Google" : "your password"}</strong>.</p>
         <ul>
           <li>Time: ${e(new Date().toUTCString())}</li>
           <li>IP address: ${e(meta.ip ?? "unknown")}</li>
           <li>Device: ${e(meta.userAgent ?? "unknown")}</li>
         </ul>
         <p>If this wasn't you, change your password immediately.</p>`,
      ),
    },
    { flow: "login-alert", to },
  );
}

export function sendPasswordChangedEmail(to: string, name: string, meta: Meta) {
  sendMailInBackground(
    {
      to,
      subject: "Your password was changed",
      html: layout(
        "Password changed",
        `<p>Hi ${e(name)},</p>
         <p>The password for your account was changed on ${e(new Date().toUTCString())} (IP: ${e(meta.ip ?? "unknown")}).</p>
         <p>All other devices have been signed out. If you didn't do this, reset your password right away and contact support.</p>`,
      ),
    },
    { flow: "password-changed", to },
  );
}

export function sendPasswordResetEmail(to: string, name: string, url: string) {
  sendMailInBackground(
    {
      to,
      subject: "Reset your password",
      html: layout(
        "Reset your password",
        `<p>Hi ${e(name)},</p><p>We received a request to reset your password. This link expires in 30 minutes. If you didn't request it, ignore this email.</p>${button(url, "Reset password")}`,
      ),
    },
    { flow: "password-reset", to },
  );
}

export function sendAccountCreatedByAdminEmail(to: string, name: string, role: string) {
  sendMailInBackground(
    {
      to,
      subject: `Your ${env.APP_NAME} account has been created`,
      html: layout(
        "Your account is ready",
        `<p>Hi ${e(name)},</p><p>An administrator created a <strong>${e(role)}</strong> account for you. Log in with the email address this message was sent to and the password provided by your administrator, then change it from your profile.</p>`,
      ),
    },
    { flow: "account-created", to },
  );
}

/** Admin created a store together with its owner account (one email instead of two). */
export function sendStoreOwnerAccountEmail(to: string, ownerName: string, storeName: string) {
  sendMailInBackground(
    {
      to,
      subject: `Your store "${storeName}" is ready on ${env.APP_NAME}`,
      html: layout(
        "Your store owner account is ready",
        `<p>Hi ${e(ownerName)},</p>
         <p>An administrator registered the store <strong>${e(storeName)}</strong> and created a store owner account for you.</p>
         <p>Log in with this email address and the password your administrator gave you, then change it from your profile.</p>
         <p>Tip: add your store's address under Profile → Address (choose type “Store”) so customers can find you.</p>`,
      ),
    },
    { flow: "store-owner-created", to },
  );
}

export function sendStoreCreatedEmail(to: string | string[], storeName: string, ownerName: string) {
  sendMailInBackground(
    {
      to,
      subject: `Store "${storeName}" is now live`,
      html: layout(
        "Your store has been registered",
        `<p>Hi ${e(ownerName)},</p><p>The store <strong>${e(storeName)}</strong> has been registered on ${e(env.APP_NAME)}. Customers can now find and rate it.</p>`,
      ),
    },
    { flow: "store-created", to },
  );
}

export function sendRatingConfirmationToUser(
  to: string,
  userName: string,
  storeName: string,
  value: number,
  isUpdate: boolean,
) {
  sendMailInBackground(
    {
      to,
      subject: isUpdate ? `You updated your rating for ${storeName}` : `Thanks for rating ${storeName}`,
      html: layout(
        isUpdate ? "Rating updated" : "Rating submitted",
        `<p>Hi ${e(userName)},</p>
         <p>Your ${isUpdate ? "updated " : ""}rating for <strong>${e(storeName)}</strong> was saved:</p>
         <p style="font-size:22px;color:#f59e0b;margin:8px 0;">${stars(value)} <span style="font-size:14px;color:#374151;">(${value}/5)</span></p>`,
      ),
    },
    { flow: "rating-user", to },
  );
}

export function sendRatingReceivedToStore(
  to: string | string[],
  params: {
    storeName: string;
    raterName: string;
    value: number;
    average: number;
    count: number;
    isUpdate: boolean;
    comment?: string | null;
  },
) {
  sendMailInBackground(
    {
      to,
      subject: params.isUpdate
        ? `A rating for ${params.storeName} was updated`
        : `New rating for ${params.storeName}`,
      html: layout(
        params.isUpdate ? "A customer updated their rating" : "You received a new rating",
        `<p><strong>${e(params.raterName)}</strong> ${params.isUpdate ? "updated their rating for" : "rated"} <strong>${e(params.storeName)}</strong>:</p>
         <p style="font-size:22px;color:#f59e0b;margin:8px 0;">${stars(params.value)} <span style="font-size:14px;color:#374151;">(${params.value}/5)</span></p>
         ${params.comment ? `<p style="background:#f9fafb;padding:12px;border-radius:6px;">“${e(params.comment)}”</p>` : ""}
         <p>Current average: <strong>${params.average.toFixed(2)}</strong> from ${params.count} rating${params.count === 1 ? "" : "s"}.</p>`,
      ),
    },
    { flow: "rating-store", to },
  );
}