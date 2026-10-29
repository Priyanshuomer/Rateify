import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { AuthDivider, AuthLayout, GoogleIcon } from "@/components/layout/AuthLayout";
import { GuestOnly } from "@/components/layout/Guard";
import { CharCount } from "@/components/common/misc";
import { Field, ImageUploader, LoadingButton, PasswordChecklist, PasswordInput } from "@/components/common/forms";
import { RoleSelector } from "@/components/common/RoleSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { normalizeName, signupSchema } from "@/lib/validators";
import { authApi } from "@/api/endpoints";
import { handleApiError } from "@/lib/errors";
import { ApiError } from "@/api/client";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Rateify" },
      { name: "description", content: "Create your Rateify account and start rating stores." },
      { property: "og:title", content: "Create account — Rateify" },
      { property: "og:description", content: "Create your Rateify account and start rating stores." },
    ],
  }),
  component: () => (
    <GuestOnly>
      <SignupPage />
    </GuestOnly>
  ),
});

function SignupPage() {
  const navigate = useNavigate();
  const [ownerImage, setOwnerImage] = useState<File | null>(null);
  const [storeLogo, setStoreLogo] = useState<File | null>(null);
  const form = useForm<z.input<typeof signupSchema>, unknown, z.output<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: { role: "USER", name: "", email: "", password: "", storeName: "", adminCode: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const role = form.watch("role");
  const name = form.watch("name");
  const password = form.watch("password");

  const onSubmit = form.handleSubmit(async (v) => {
    // multipart so the owner can attach images (the account is only created after the email link is clicked)
    const fd = new FormData();
    fd.append("role", v.role);
    fd.append("name", normalizeName(v.name));
    fd.append("email", v.email);
    fd.append("password", v.password);
    if (v.role === "OWNER") {
      fd.append("storeName", (v.storeName ?? "").trim());
      if (ownerImage) fd.append("ownerImage", ownerImage);
      if (storeLogo) fd.append("storeLogo", storeLogo);
    }
    if (v.role === "ADMIN") fd.append("adminCode", (v.adminCode ?? "").trim());

    try {
      await authApi.signup(fd);
      sessionStorage.setItem("pendingEmail", v.email);
      navigate({ to: "/signup/check-email" });
    } catch (e) {
      if (e instanceof ApiError && (e.code === "EMAIL_EXISTS" || e.code === "STORE_EMAIL_EXISTS")) {
        form.setError("email", { message: e.message });
      } else if (e instanceof ApiError && (e.code === "INVALID_ADMIN_CODE" || e.code === "ADMIN_SIGNUP_DISABLED")) {
        form.setError("adminCode", { message: e.message });
      } else {
        handleApiError(e, form.setError, ["role", "name", "email", "password", "storeName", "adminCode"]);
      }
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {/* Google sign-up creates normal users only */}
      {role === "USER" && (
        <>
          <Button variant="outline" className="h-11 w-full" onClick={() => (window.location.href = authApi.googleSignupUrl())}>
            <GoogleIcon /> <span className="ml-2">Sign up with Google</span>
          </Button>
          <AuthDivider />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <RoleSelector
          label="Sign up as"
          value={role}
          onChange={(r) => {
            form.setValue("role", r);
            form.clearErrors(["storeName", "adminCode"]);
          }}
        />

        <Field
          label={role === "OWNER" ? "Owner full name" : "Full name"}
          htmlFor="name"
          error={errors.name?.message}
          right={<CharCount value={normalizeName(name).length} min={20} max={60} />}
        >
          <Input id="name" autoComplete="name" placeholder="At least 20 characters" className="h-11" {...form.register("name")} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" className="h-11" {...form.register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" className="h-11" {...form.register("password")} />
        </Field>
        <PasswordChecklist value={password} />

        {role === "OWNER" && (
          <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold">Your store</p>
            <Field label="Store name" htmlFor="storeName" error={errors.storeName?.message}>
              <Input id="storeName" placeholder="e.g. Corner Street Bakery" className="h-11" {...form.register("storeName")} />
            </Field>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Owner photo (optional)</p>
              <ImageUploader onFile={setOwnerImage} label={ownerImage ? "Change photo" : "Upload owner photo"} />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none">Store logo (optional)</p>
              <ImageUploader onFile={setStoreLogo} label={storeLogo ? "Change logo" : "Upload store logo"} />
            </div>
          </div>
        )}

        {role === "ADMIN" && (
          <Field
            label="Administrator access code"
            htmlFor="adminCode"
            error={errors.adminCode?.message}
            hint="Ask the system owner for this code. Administrator accounts can't be created without it."
          >
            <Input id="adminCode" type="password" autoComplete="off" className="h-11" {...form.register("adminCode")} />
          </Field>
        )}

        <LoadingButton type="submit" variant="hero" className="h-11 w-full" loading={isSubmitting}>
          Create account
        </LoadingButton>
        <p className="text-center text-xs text-muted-foreground">
          You can add your address after signing in. We'll email you a link to verify your address first.
        </p>
      </form>
    </AuthLayout>
  );
}