import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, Circle, LogOut, PartyPopper, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireRole } from "@/components/layout/Guard";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CharCount, PageFade, ProgressRing, RoleBadge, UserAvatar } from "@/components/common/misc";
import { ConfirmDialog, Field, LoadingButton, PasswordChecklist, PasswordInput, validateImage } from "@/components/common/forms";
import { AddressesPanel } from "@/components/profile/AddressesPanel";
import { authApi, profileApi, type ProfilePatch } from "@/api/endpoints";
import { tokenStore } from "@/api/client";
import { normalizeName, passwordSchema, phoneRegex } from "@/lib/validators";
import { handleApiError } from "@/lib/errors";
import { IMAGE_TYPES } from "@/lib/constants";
import type { ProfileBundle, PublicUser } from "@/types/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Rateify" },
      { name: "description", content: "Manage your personal details, addresses and security settings." },
      { property: "og:title", content: "Your profile — Rateify" },
      { property: "og:description", content: "Manage your personal details, addresses and security settings." },
    ],
  }),
  component: () => (
    <RequireRole>
      <AppShell>
        <ProfilePage />
      </AppShell>
    </RequireRole>
  ),
});

const FIELD_TAB: Record<string, string> = {
  name: "personal", phone: "personal", dob: "personal", gender: "personal", bio: "personal",
  profilePicture: "photo", profilePictureUrl: "photo", address: "address", addressDetails: "address",
};

function ProfilePage() {
  const { user, addresses, completion, setBundle } = useAuth();
  const [tab, setTab] = useState("personal");
  const [onboarding, setOnboarding] = useState(false);
  const [addSignal, setAddSignal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("onboarding") === "1") setOnboarding(true);
    const t = p.get("tab");
    if (t) setTab(t);
    if (p.get("add") === "1") {
      setTab("address");
      setAddSignal((n) => n + 1); // opens the "Add address" dialog (used by the reminder banner)
    }
    profileApi.get().then(setBundle).catch(() => {});
  }, [setBundle]);

  if (!user) return null;
  const pct = completion?.percentage ?? 0;

  const focusField = (field: string) => {
    const t = FIELD_TAB[field] ?? (field.toLowerCase().includes("address") ? "address" : "personal");
    if (t === "photo") return fileRef.current?.click();
    setTab(t);
    if (t === "address") {
      setAddSignal((n) => n + 1);
      return;
    }
    setTimeout(() => {
      const el = document.getElementById(`f-${field}`) ?? document.getElementById(`tab-${t}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
    }, 80);
  };

  const onPick = async (f: File) => {
    if (!validateImage(f)) return;
    setPreview(URL.createObjectURL(f));
    setUploading(true);
    try {
      setBundle(await profileApi.uploadPicture(f));
      toast.success("Profile photo updated");
    } catch (e) {
      setPreview(null);
      handleApiError(e);
    } finally {
      setUploading(false);
    }
  };
  const removePic = async () => {
    try {
      setBundle(await profileApi.deletePicture());
      setPreview(null);
      toast.success("Photo removed");
    } catch (e) {
      handleApiError(e);
    }
  };

  return (
    <PageFade>
      {onboarding && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-sm"><span className="font-semibold">Welcome aboard!</span> Complete your profile to get the most out of the app.</p>
        </motion.div>
      )}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 text-center shadow-soft">
            <div className="group relative mx-auto h-28 w-28">
              <UserAvatar name={user.fullName} src={preview ?? user.profilePictureUrl} className="h-28 w-28 text-2xl" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 grid place-items-center rounded-full bg-foreground/50 text-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="Change profile photo"
              >
                <Camera className="h-6 w-6" />
              </button>
              {uploading && <div className="absolute inset-0 animate-pulse rounded-full bg-background/60" />}
            </div>
            <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPick(f); }} />
            <div className="mt-2 flex justify-center gap-2">
              <button className="text-xs font-medium text-primary hover:underline" onClick={() => fileRef.current?.click()}>
                {user.profilePictureUrl ? "Change" : "Upload"}
              </button>
              {user.profilePictureUrl && (
                <button className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline" onClick={removePic}>
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            <h2 className="mt-4 text-lg font-semibold">{user.fullName}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2"><RoleBadge role={user.role} /></div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-5">
              <ProgressRing value={pct} size={104}>
                <span className="text-2xl font-bold tabular-nums">{pct}%</span>
              </ProgressRing>
              <div>
                <p className="font-semibold">{completion?.isComplete ? "All set!" : "Profile strength"}</p>
                <p className="text-sm text-muted-foreground">
                  {completion?.isComplete ? "Your profile is complete." : "Fill in the missing pieces below."}
                </p>
              </div>
            </div>
            {completion?.isComplete ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-5 flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
                <PartyPopper className="h-5 w-5" /> Nice work — 100% complete!
              </motion.div>
            ) : (
              <ul className="mt-5 space-y-1">
                {completion?.missing.map((m) => (
                  <li key={m.field}>
                    <button onClick={() => focusField(m.field)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{m.label}</span>
                      <span className="text-xs font-semibold text-primary">+{m.weight}%</span>
                    </button>
                  </li>
                ))}
                {completion?.completed.map((c) => (
                  <li key={c} className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="capitalize">{c.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList className="mb-4">
            <TabsTrigger value="personal" id="tab-personal">Personal info</TabsTrigger>
            <TabsTrigger value="address" id="tab-address">Addresses</TabsTrigger>
            <TabsTrigger value="security" id="tab-security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="personal"><PersonalForm user={user} onSaved={setBundle} /></TabsContent>
          <TabsContent value="address">
            <AddressesPanel addresses={addresses} role={user.role} onSaved={setBundle} addSignal={addSignal} />
          </TabsContent>
          <TabsContent value="security"><SecurityPanel user={user} /></TabsContent>
        </Tabs>
      </div>
    </PageFade>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

/**
 * The 20–60 character rule is only enforced when the name is actually being changed.
 * Otherwise Google users (whose Google name may be short) couldn't save their phone, bio, etc.
 */
const buildPersonalSchema = (initialName: string) =>
  z.object({
    name: z.string().refine((v) => {
      const n = normalizeName(v);
      if (n === normalizeName(initialName)) return true;
      return n.length >= 20 && n.length <= 60;
    }, "Name must be between 20 and 60 characters"),
    phone: z.string().refine((v) => v === "" || phoneRegex.test(v), "Use 7–15 digits, optionally starting with +"),
    dob: z.string().refine((v) => v === "" || new Date(v) <= new Date(), "Date can't be in the future"),
    gender: z.string(),
    bio: z.string().max(500, "At most 500 characters"),
  });

function PersonalForm({ user, onSaved }: { user: PublicUser; onSaved: (b: ProfileBundle) => void }) {
  const initial = {
    name: user.fullName ?? "",
    phone: user.phone ?? "",
    dob: user.dob ? user.dob.slice(0, 10) : "",
    gender: user.gender ?? "",
    bio: user.bio ?? "",
  };
  const schema = useMemo(() => buildPersonalSchema(user.fullName ?? ""), [user.fullName]);
  const form = useForm<z.infer<ReturnType<typeof buildPersonalSchema>>>({ resolver: zodResolver(schema), defaultValues: initial, mode: "onTouched" });
  useEffect(() => form.reset(initial), [user.id, user.fullName, user.phone, user.dob, user.gender, user.bio]); // eslint-disable-line react-hooks/exhaustive-deps
  const { errors, isSubmitting, dirtyFields } = form.formState;
  const name = form.watch("name");
  const bio = form.watch("bio");

  const onSubmit = form.handleSubmit(async (v) => {
    const body: ProfilePatch = {};
    if (dirtyFields.name) body.name = normalizeName(v.name);
    if (dirtyFields.phone) body.phone = v.phone || null;
    if (dirtyFields.dob) body.dob = v.dob || null;
    if (dirtyFields.gender) body.gender = (v.gender || null) as PublicUser["gender"];
    if (dirtyFields.bio) body.bio = v.bio || null;
    if (Object.keys(body).length === 0) return toast("Nothing to save");
    try {
      onSaved(await profileApi.update(body));
      toast.success("Profile saved");
    } catch (e) {
      handleApiError(e, form.setError, ["name", "phone", "dob", "gender", "bio"]);
    }
  });

  return (
    <Card title="Personal info" description="How you appear across the platform.">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Field label="Full name" htmlFor="f-name" error={errors.name?.message} right={<CharCount value={normalizeName(name).length} min={20} max={60} />}>
            <Input id="f-name" {...form.register("name")} />
          </Field>
        </div>
        <Field label="Phone" htmlFor="f-phone" error={errors.phone?.message}>
          <Input id="f-phone" type="tel" placeholder="+919876543210" {...form.register("phone")} />
        </Field>
        <Field label="Date of birth" htmlFor="f-dob" error={errors.dob?.message}>
          <Input id="f-dob" type="date" max={new Date().toISOString().slice(0, 10)} {...form.register("dob")} />
        </Field>
        <Field label="Gender" htmlFor="f-gender">
          <Select value={form.watch("gender") || "none"} onValueChange={(v) => form.setValue("gender", v === "none" ? "" : v, { shouldDirty: true })}>
            <SelectTrigger id="f-gender"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
              <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Bio" htmlFor="f-bio" error={errors.bio?.message} right={<CharCount value={bio.length} max={500} />}>
            <Textarea id="f-bio" rows={4} {...form.register("bio")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <LoadingButton type="submit" variant="hero" loading={isSubmitting}>Save changes</LoadingButton>
        </div>
      </form>
    </Card>
  );
}

function SecurityPanel({ user }: { user: PublicUser }) {
  const { logout, setBundle } = useAuth();
  // Google accounts that never set a password don't have a "current password"
  const noPasswordYet = !user.hasPassword;
  const schema = z
    .object({ currentPassword: z.string(), newPassword: passwordSchema, confirm: z.string() })
    .refine((v) => noPasswordYet || v.currentPassword.length > 0, { path: ["currentPassword"], message: "Enter your current password" })
    .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "New password must be different" })
    .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const pw = form.watch("newPassword");
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const t = await authApi.changePassword({ ...(noPasswordYet ? {} : { currentPassword: v.currentPassword }), newPassword: v.newPassword });
      // The backend revoked every old token: store the new pair right away or the next refresh would log us out
      tokenStore.setTokens(t.accessToken, t.refreshToken);
      form.reset();
      toast.success("Password changed", { description: "Other devices have been signed out." });
      profileApi.get().then(setBundle).catch(() => {}); // refresh `hasPassword`
    } catch (e) {
      handleApiError(e, form.setError, ["currentPassword", "newPassword"]);
    }
  });

  return (
    <div className="space-y-6">
      <Card title={noPasswordYet ? "Set a password" : "Change password"} description={noPasswordYet ? "You signed up with Google. Add a password to also log in with email." : undefined}>
        <form onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
          {!noPasswordYet && (
            <Field label="Current password" htmlFor="cur" error={errors.currentPassword?.message}>
              <PasswordInput id="cur" autoComplete="current-password" {...form.register("currentPassword")} />
            </Field>
          )}
          <Field label="New password" htmlFor="np" error={errors.newPassword?.message}>
            <PasswordInput id="np" autoComplete="new-password" {...form.register("newPassword")} />
          </Field>
          <PasswordChecklist value={pw} />
          <Field label="Confirm new password" htmlFor="cnp" error={errors.confirm?.message}>
            <PasswordInput id="cnp" autoComplete="new-password" {...form.register("confirm")} />
          </Field>
          <LoadingButton type="submit" variant="hero" loading={isSubmitting}>Update password</LoadingButton>
        </form>
      </Card>
      <Card title="Sessions" description="Signed in somewhere you don't recognise? Sign out everywhere.">
        <LoadingButton variant="outline" onClick={() => setConfirmAll(true)}>
          <LogOut className="h-4 w-4" /> Log out of all devices
        </LoadingButton>
      </Card>
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Log out of all devices?"
        description="You'll be signed out here and on every other device."
        confirmLabel="Log out everywhere"
        destructive
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await authApi.logoutAll();
          } catch (e) {
            // Don't pretend it worked: the other sessions are still alive
            handleApiError(e);
            setBusy(false);
            return;
          }
          await logout(); // route guards redirect to /login
        }}
      />
    </div>
  );
}