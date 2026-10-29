import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/lib/constants";
import { FullScreenLoader } from "@/components/common/misc";
import { Button } from "@/components/ui/button";
import { authApi } from "@/api/endpoints";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/oauth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — Rateify" },
      { name: "description", content: "Completing Google sign-in for Rateify." },
      { property: "og:title", content: "Signing you in — Rateify" },
      { property: "og:description", content: "Completing Google sign-in for Rateify." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OAuthCallback,
});

const MESSAGES: Record<string, string> = {
  ACCOUNT_NOT_FOUND: "No account is linked to this Google profile yet.",
  ACCOUNT_SUSPENDED: "Your account is suspended. Contact an administrator.",
  ACCOUNT_INACTIVE: "Your account is inactive. Contact an administrator.",
  EMAIL_NOT_VERIFIED: "Your Google email isn't verified.",
  NO_EMAIL: "Google didn't share an email address.",
  ACCESS_DENIED: "Google sign-in was cancelled.",
  AUTH_FAILED: "Google sign-in failed. Please try again.",
};

function OAuthCallback() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const q = new URLSearchParams(window.location.search);
    const errCode = q.get("error");
    if (errCode) {
      setError({ code: errCode, message: MESSAGES[errCode] ?? q.get("message") ?? "Sign-in failed." });
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const h = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
    const a = h.get("accessToken");
    const r = h.get("refreshToken");
    if (!a || !r) {
      setError({ code: "AUTH_FAILED", message: MESSAGES.AUTH_FAILED });
      return;
    }
    startSession(a, r)
      .then((b) => {
        if (h.get("isNew") === "1") navigate({ to: "/profile", search: { onboarding: 1 } as never, replace: true });
        else navigate({ to: ROLE_HOME[b.user.role], replace: true });
      })
      .catch((e) => setError({ code: "AUTH_FAILED", message: errorMessage(e) }));
  }, [startSession, navigate]);

  if (!error) return <FullScreenLoader label="Signing you in…" />;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-soft">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">Couldn't sign you in</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-col gap-2">
          {error.code === "ACCOUNT_NOT_FOUND" && (
            <Button variant="hero" onClick={() => (window.location.href = authApi.googleSignupUrl())}>
              Sign up with Google
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
