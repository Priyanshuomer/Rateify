import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthDivider, AuthLayout, GoogleIcon } from "@/components/layout/AuthLayout";
import { GuestOnly } from "@/components/layout/Guard";
import { Field, LoadingButton, PasswordInput } from "@/components/common/forms";
import { RoleSelector } from "@/components/common/RoleSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginSchema } from "@/lib/validators";
import { authApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/lib/constants";
import { ApiError } from "@/api/client";
import { errorMessage, handleApiError } from "@/lib/errors";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Rateify" },
      { name: "description", content: "Log in to Rateify to rate stores and manage your account." },
      { property: "og:title", content: "Log in — Rateify" },
      { property: "og:description", content: "Log in to Rateify to rate stores and manage your account." },
    ],
  }),
  component: () => (
    <GuestOnly>
      <LoginPage />
    </GuestOnly>
  ),
});

type Banner = { tone: "ok" | "err"; text: string } | null;

function LoginPage() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<Banner>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", role: "USER" },
  });
  const role = form.watch("role") ?? "USER";

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get("verified");
    if (v === "1") setBanner({ tone: "ok", text: "Email verified! You can now log in." });
    else if (v === "0") {
      const reason = p.get("reason");
      setBanner({
        tone: "err",
        text:
          reason === "ALREADY_VERIFIED"
            ? "This email is already verified. Please log in."
            : "This link is invalid or expired. Please sign up again.",
      });
    }
    if (v !== null) window.history.replaceState(null, "", "/login");
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await authApi.login(values);
      const b = await startSession(res.accessToken, res.refreshToken);
      toast.success(`Welcome back, ${b.user.firstName}!`);
      navigate({ to: ROLE_HOME[b.user.role], replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code !== "VALIDATION_ERROR") setFormError(errorMessage(e));
      else handleApiError(e, form.setError);
    }
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          New here?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {banner && (
        <Alert className={banner.tone === "ok" ? "mb-6 border-success/30 bg-success/10 text-success" : "mb-6 border-destructive/30 bg-destructive/10 text-destructive"}>
          {banner.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <AlertDescription className="text-current">{banner.text}</AlertDescription>
        </Alert>
      )}
      <Button variant="outline" className="h-11 w-full" onClick={() => (window.location.href = authApi.googleLoginUrl())}>
        <GoogleIcon /> <span className="ml-2">Continue with Google</span>
      </Button>
      <AuthDivider />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <RoleSelector label="Log in as" value={role} onChange={(r) => form.setValue("role", r)} />
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-11" {...form.register("email")} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          right={
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput id="password" autoComplete="current-password" className="h-11" {...form.register("password")} />
        </Field>
        {formError && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
        <LoadingButton type="submit" variant="hero" className="h-11 w-full" loading={isSubmitting}>
          Log in
        </LoadingButton>
      </form>
    </AuthLayout>
  );
}