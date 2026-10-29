import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoadingButton } from "@/components/common/forms";
import { authApi } from "@/api/endpoints";
import { handleApiError } from "@/lib/errors";

export const Route = createFileRoute("/signup_/check-email")({
  head: () => ({
    meta: [
      { title: "Check your inbox — Rateify" },
      { name: "description", content: "Confirm your email address to finish creating your Rateify account." },
      { property: "og:title", content: "Check your inbox — Rateify" },
      { property: "og:description", content: "Confirm your email address to finish creating your Rateify account." },
    ],
  }),
  component: CheckEmail,
});

function CheckEmail() {
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [sending, setSending] = useState(false);
  useEffect(() => setEmail(sessionStorage.getItem("pendingEmail") ?? ""), []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification(email);
      toast.success("If a signup is pending, we've sent a new link.");
      setCooldown(60);
    } catch (e) {
      handleApiError(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout title="Check your inbox">
      <div className="rounded-2xl border bg-card p-6 text-center shadow-soft">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </span>
        <p className="mt-4 text-muted-foreground">We sent a verification link to</p>
        <p className="font-semibold">{email || "your email"}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Click the link within 30 minutes to activate your account.
        </p>
        <LoadingButton variant="outline" className="mt-6 w-full" loading={sending} disabled={cooldown > 0 || !email} onClick={resend}>
          {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
        </LoadingButton>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
