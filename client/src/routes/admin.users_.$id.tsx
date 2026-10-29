import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ArrowLeft, BadgeCheck, Mail, Pencil, Phone, Star, Store } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CharCount, ErrorState, PageFade, RoleBadge, StatusBadge, UserAvatar } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";
import { Field, LoadingButton } from "@/components/common/forms";
import { AddressesPanel, type AddressApi } from "@/components/profile/AddressesPanel";
import { adminApi, type AdminUserPatch } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { emailSchema, normalizeName, phoneRegex, roleSchema } from "@/lib/validators";
import { errorMessage, handleApiError } from "@/lib/errors";
import type { AdminUserDetail, Gender, Role } from "@/types/api";

export const Route = createFileRoute("/admin/users_/$id")({
  head: () => ({
    meta: [
      { title: "User details — Rateify" },
      { name: "description", content: "View and edit a user's details and addresses." },
      { property: "og:title", content: "User details — Rateify" },
      { property: "og:description", content: "View and edit a user's details and addresses." },
    ],
  }),
  component: UserDetail,
});

const GENDER: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-sm">{children}</dd>
    </div>
  );
}

function UserDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const [editOpen, setEditOpen] = useState(false);
  const q = useQuery({ queryKey: ["admin", "users", "detail", id], queryFn: () => adminApi.user(id) });

  // ?edit=1 (from the users list menu) opens the edit dialog, then the param is removed
  useEffect(() => {
    if (!search.edit) return;
    setEditOpen(true);
    navigate({
      to: ".",
      search: ((prev: Record<string, unknown>) => {
        const { edit: _edit, ...rest } = prev;
        return rest;
      }) as never,
      replace: true,
    });
  }, [search.edit, navigate]);

  const addressApi: AddressApi = {
    add: (v) => adminApi.addUserAddress(id, v),
    update: (addressId, v) => adminApi.updateUserAddress(id, addressId, v),
    setPrimary: (addressId) => adminApi.setUserPrimaryAddress(id, addressId),
    remove: (addressId) => adminApi.deleteUserAddress(id, addressId),
  };

  return (
    <PageFade>
      <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All users
      </Link>

      {q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        (() => {
          const u = q.data;
          return (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-soft sm:flex-row sm:items-center">
                <UserAvatar name={u.fullName} src={u.profilePictureUrl} className="h-20 w-20 text-xl" />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-2xl font-bold tracking-tight">{u.fullName}</h1>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" /> {u.email}
                    {u.emailVerified && <BadgeCheck className="h-4 w-4 text-success" aria-label="Email verified" />}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <RoleBadge role={u.role} />
                    <StatusBadge status={u.status} />
                    <Badge variant="outline" className="rounded-full">{u.authProvider === "GOOGLE" ? "Google" : "Email & password"}</Badge>
                  </div>
                </div>
                <Button variant="hero" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Edit details
                </Button>
              </div>

              {/* Store owners: show their rating */}
              {u.role === "OWNER" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border bg-card p-6 text-center shadow-soft">
                    <p className="text-sm text-muted-foreground">Owner rating</p>
                    <p className="mt-1 text-5xl font-bold tabular-nums">{u.rating && u.rating > 0 ? u.rating.toFixed(1) : "—"}</p>
                    <StarRating value={u.rating ?? 0} size="lg" className="mt-2" />
                    <p className="mt-1 text-xs text-muted-foreground">Average across all their stores, weighted by number of ratings</p>
                  </div>
                  <div className="rounded-2xl border bg-card p-6 shadow-soft lg:col-span-2">
                    <h2 className="flex items-center gap-2 font-semibold"><Store className="h-4 w-4" /> Stores</h2>
                    {u.stores && u.stores.length > 0 ? (
                      <ul className="mt-4 divide-y">
                        {u.stores.map((s) => (
                          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <Link to="/admin/stores" search={{ search: s.name } as never} className="truncate font-medium hover:text-primary">
                                {s.name}
                              </Link>
                              <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={s.status} />
                              <span className="flex items-center gap-1 text-sm tabular-nums">
                                <Star className="h-4 w-4 fill-star text-star" />
                                {s.averageRating > 0 ? s.averageRating.toFixed(1) : "—"}
                                <span className="text-xs text-muted-foreground">({s.ratingCount})</span>
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">This owner has no stores yet.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border bg-card p-6 shadow-soft">
                <h2 className="mb-4 font-semibold">Details</h2>
                <dl className="space-y-3">
                  <Row label="Name">{u.fullName}</Row>
                  <Row label="Email">{u.email}</Row>
                  <Row label="Phone">
                    {u.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {u.phone}</span> : "—"}
                  </Row>
                  <Row label="Role"><RoleBadge role={u.role} /></Row>
                  <Row label="Date of birth">{u.dob ? format(new Date(u.dob), "d MMM yyyy") : "—"}</Row>
                  <Row label="Gender">{u.gender ? GENDER[u.gender] : "—"}</Row>
                  <Row label="Bio">{u.bio || "—"}</Row>
                  <Row label="Joined">{format(new Date(u.createdAt), "d MMM yyyy, p")}</Row>
                  <Row label="Last login">{u.lastLoginAt ? format(new Date(u.lastLoginAt), "d MMM yyyy, p") : "Never"}</Row>
                </dl>
              </div>

              <AddressesPanel
                addresses={u.addresses}
                role={u.role}
                api={addressApi}
                description="This user's saved addresses. Add or edit them as street, city, PIN code, country and so on."
                onSaved={() => qc.invalidateQueries({ queryKey: ["admin"] })}
              />

              {editOpen && <EditUserDialog key={u.id ?? u.id} user={u} onClose={() => setEditOpen(false)} />}
            </div>
          );
        })()
      )}
    </PageFade>
  );
}

const buildEditSchema = (initialName: string) =>
  z.object({
    // the 20–60 rule only applies when the name is actually changed (Google users may have short names)
    name: z.string().refine((v) => {
      const n = normalizeName(v);
      return n === normalizeName(initialName) || (n.length >= 20 && n.length <= 60);
    }, "Name must be between 20 and 60 characters"),
    email: emailSchema,
    phone: z.string().trim().refine((v) => v === "" || phoneRegex.test(v), "Use 7–15 digits, optionally starting with +"),
    dob: z.string().refine((v) => v === "" || new Date(v) <= new Date(), "Date can't be in the future"),
    gender: z.string(),
    bio: z.string().max(500, "At most 500 characters"),
    role: roleSchema,
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  });
type EditSchema = ReturnType<typeof buildEditSchema>;

function EditUserDialog({ user, onClose }: { user: AdminUserDetail & { updatedKey?: string }; onClose: () => void }) {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const isSelf = me?.id === user.id;
  const googleAccount = user.authProvider === "GOOGLE";
  const schema = buildEditSchema(user.fullName);

  const form = useForm<z.input<EditSchema>, unknown, z.output<EditSchema>>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: user.fullName,
      email: user.email,
      phone: user.phone ?? "",
      dob: user.dob ? user.dob.slice(0, 10) : "",
      gender: user.gender ?? "",
      bio: user.bio ?? "",
      role: user.role,
      status: (user.status === "DELETED" ? "INACTIVE" : user.status) as "ACTIVE" | "INACTIVE" | "SUSPENDED",
    },
  });
  const { errors, isSubmitting, dirtyFields } = form.formState;
  const name = form.watch("name");
  const bio = form.watch("bio");
  const role = form.watch("role");
  const status = form.watch("status");

  const onSubmit = form.handleSubmit(async (v) => {
    // send only what changed
    const body: AdminUserPatch = {};
    if (dirtyFields.name) body.name = normalizeName(v.name);
    if (dirtyFields.email) body.email = v.email;
    if (dirtyFields.phone) body.phone = v.phone || null;
    if (dirtyFields.dob) body.dob = v.dob || null;
    if (dirtyFields.gender) body.gender = (v.gender || null) as Gender | null;
    if (dirtyFields.bio) body.bio = v.bio || null;
    if (dirtyFields.role) body.role = v.role as Role;
    if (dirtyFields.status) body.status = v.status;
    if (Object.keys(body).length === 0) {
      toast("Nothing to save");
      return;
    }
    try {
      await adminApi.updateUser(user.id, body);
      toast.success("User updated", { description: user.fullName });
      qc.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    } catch (e) {
      handleApiError(e, form.setError, ["name", "email", "phone", "dob", "gender", "bio", "role", "status"]);
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="eu-name" error={errors.name?.message} right={<CharCount value={normalizeName(name ?? "").length} min={20} max={60} />}>
            <Input id="eu-name" {...form.register("name")} />
          </Field>
          <Field
            label="Email"
            htmlFor="eu-email"
            error={errors.email?.message}
            hint={googleAccount ? "This account signs in with Google, so its email can't be changed." : "Changing the email signs the user out everywhere."}
          >
            <Input id="eu-email" type="email" disabled={googleAccount} {...form.register("email")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="eu-phone" error={errors.phone?.message}>
              <Input id="eu-phone" type="tel" placeholder="+919876543210" {...form.register("phone")} />
            </Field>
            <Field label="Date of birth" htmlFor="eu-dob" error={errors.dob?.message}>
              <Input id="eu-dob" type="date" max={new Date().toISOString().slice(0, 10)} {...form.register("dob")} />
            </Field>
            <Field label="Gender" htmlFor="eu-gender">
              <Select value={form.watch("gender") || "none"} onValueChange={(v) => form.setValue("gender", v === "none" ? "" : v, { shouldDirty: true })}>
                <SelectTrigger id="eu-gender"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Role" htmlFor="eu-role" error={errors.role?.message}>
              <Select value={role} disabled={isSelf} onValueChange={(v) => form.setValue("role", v as Role, { shouldDirty: true })}>
                <SelectTrigger id="eu-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Normal user</SelectItem>
                  <SelectItem value="OWNER">Store owner</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field
            label="Status"
            htmlFor="eu-status"
            hint={isSelf ? "You can't change your own role or status." : "Suspending or deactivating signs the user out everywhere."}
          >
            <Select value={status} disabled={isSelf} onValueChange={(v) => form.setValue("status", v as "ACTIVE" | "INACTIVE" | "SUSPENDED", { shouldDirty: true })}>
              <SelectTrigger id="eu-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Bio" htmlFor="eu-bio" error={errors.bio?.message} right={<CharCount value={(bio ?? "").length} max={500} />}>
            <Textarea id="eu-bio" rows={3} {...form.register("bio")} />
          </Field>
          <LoadingButton type="submit" variant="hero" className="w-full" loading={isSubmitting}>
            Save changes
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}