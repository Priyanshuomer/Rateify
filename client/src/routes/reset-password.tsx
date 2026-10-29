import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Field, LoadingButton, PasswordChecklist, PasswordInput } from "@/components/common/forms";
import { passwordSchema } from "@/lib/validators";
import { authApi } from "@/api/endpoints";
import { handleApiError } from "@/lib/errors";
import { ApiError } from "@/api/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Rateify" },
      { name: "description", content: "Choose a new password for your Rateify account." },
      { property: "og:title", content: "Set a new password — Rateify" },
      { property: "og:description", content: "Choose a new password for your Rateify account." },
    ],
  }),
  component: Reset,
});

const schema = z
  .object({ newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

function Reset() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    // Only act when a token is present: StrictMode runs this twice and the 2nd run sees an empty URL
    if (t) {
      setToken(t);
      window.history.replaceState(null, "", "/reset-password"); // keep the secret out of the address bar/history
    }
  }, []);

  const form = useForm<z.input<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { newPassword: "", confirm: "" } });
  const pw = form.watch("newPassword");

  const onSubmit = form.handleSubmit(async (v) => {
    if (!token) return setExpired(true);
    try {
      await authApi.resetPassword({ token, newPassword: v.newPassword });
      toast.success("Password updated. Please log in.");
      navigate({ to: "/login" });
    } catch (e) {
      if (e instanceof ApiError && e.code === "RESET_TOKEN_INVALID") setExpired(true);
      else handleApiError(e, form.setError);
    }
  });

  if (expired)
    return (
      <AuthLayout title="Link expired" subtitle="This reset link is no longer valid.">
        <LoadingButton variant="hero" className="w-full" onClick={() => navigate({ to: "/forgot-password" })}>
          Request a new link
        </LoadingButton>
      </AuthLayout>
    );

  return (
    <AuthLayout title="Set a new password">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="New password" htmlFor="np" error={form.formState.errors.newPassword?.message}>
          <PasswordInput id="np" autoComplete="new-password" className="h-11" {...form.register("newPassword")} />
        </Field>
        <PasswordChecklist value={pw} />
        <Field label="Confirm password" htmlFor="cp" error={form.formState.errors.confirm?.message}>
          <PasswordInput id="cp" autoComplete="new-password" className="h-11" {...form.register("confirm")} />
        </Field>
        <LoadingButton type="submit" variant="hero" className="h-11 w-full" loading={form.formState.isSubmitting}>
          Update password
        </LoadingButton>
      </form>
      <Link to="/login" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
        Back to login
      </Link>
    </AuthLayout>
  );
}