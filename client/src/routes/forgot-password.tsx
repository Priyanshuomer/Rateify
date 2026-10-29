import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Field, LoadingButton } from "@/components/common/forms";
import { Input } from "@/components/ui/input";
import { emailSchema } from "@/lib/validators";
import { authApi } from "@/api/endpoints";
import { handleApiError } from "@/lib/errors";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Rateify" },
      { name: "description", content: "Request a link to reset your Rateify password." },
      { property: "og:title", content: "Forgot password — Rateify" },
      { property: "og:description", content: "Request a link to reset your Rateify password." },
    ],
  }),
  component: Forgot,
});

const schema = z.object({ email: emailSchema });

function Forgot() {
  const [sent, setSent] = useState(false);
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await authApi.forgotPassword(v.email);
      setSent(true);
    } catch (e) {
      handleApiError(e, form.setError);
    }
  });
  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to set a new one.">
      {sent ? (
        <div className="rounded-2xl border bg-card p-6 text-center shadow-soft">
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-medium">If an account exists, we sent a link.</p>
          <p className="mt-1 text-sm text-muted-foreground">Check your inbox and spam folder.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" className="h-11" {...form.register("email")} />
          </Field>
          <LoadingButton type="submit" variant="hero" className="h-11 w-full" loading={form.formState.isSubmitting}>
            Send reset link
          </LoadingButton>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
        Back to login
      </Link>
    </AuthLayout>
  );
}
