import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { format } from "date-fns";
import { Eye, MoreHorizontal, Pencil, Trash2, UserCog, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, Pagination, nextSort, type Column } from "@/components/common/DataTable";
import { FilterInput } from "@/components/common/FilterInput";
import { CharCount, EmptyState, PageFade, PageHeader, RoleBadge, StatusBadge, UserAvatar } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";
import { ConfirmDialog, Field, LoadingButton, PasswordChecklist, PasswordInput } from "@/components/common/forms";
import { AddressFields } from "@/components/address/AddressFields";
import { adminApi, type AdminUserQuery } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useUrlState } from "@/hooks/useUrlState";
import { ADDRESS_FIELD_NAMES, EMPTY_ADDRESS, joinAddress, MAX_FULL_ADDRESS } from "@/lib/address";
import { createUserSchema, normalizeName } from "@/lib/validators";
import { errorMessage, handleApiError } from "@/lib/errors";
import type { AccountStatus, AdminUserRow, Role } from "@/types/api";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin users — Rateify" },
      { name: "description", content: "Create, filter and manage users, owners and admins." },
      { property: "og:title", content: "Admin users — Rateify" },
      { property: "og:description", content: "Create, filter and manage users, owners and admins." },
    ],
  }),
  component: AdminUsers,
});

const DEFAULTS = { name: "", email: "", address: "", role: "", status: "", sortBy: "name", order: "asc", page: 1, limit: 10 };

function AdminUsers() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const [s, set] = useUrlState(DEFAULTS);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null);

  // ?create=1 (from the dashboard's "Add user" button) opens the dialog, then the param is removed
  useEffect(() => {
    if (!search.create) return;
    setCreateOpen(true);
    navigate({
      to: ".",
      search: ((prev: Record<string, unknown>) => {
        const { create: _create, ...rest } = prev;
        return rest;
      }) as never,
      replace: true,
    });
  }, [search.create, navigate]);

  const params: AdminUserQuery = {
    name: s.name || undefined,
    email: s.email || undefined,
    address: s.address || undefined,
    role: (s.role || undefined) as Role | undefined,
    status: (s.status || undefined) as AdminUserQuery["status"],
    sortBy: s.sortBy,
    order: s.order as "asc" | "desc",
    page: s.page,
    limit: s.limit,
  };
  const q = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => adminApi.users(params),
    placeholderData: keepPreviousData,
  });

  const hasFilters = !!(s.name || s.email || s.address || s.role || s.status);
  const clearFilters = () => set({ name: "", email: "", address: "", role: "", status: "" });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("User deleted");
      setDeleting(null);
    },
    onError: (e) => {
      handleApiError(e);
      setDeleting(null);
    },
  });

  const cols: Column<AdminUserRow>[] = [
    {
      key: "name",
      header: "Name",
      sortKey: "name",
      hideMobile: true,
      cell: (r) => (
        <Link to="/admin/users/$id" params={{ id: r.id }} className="flex items-center gap-3 font-medium hover:text-primary">
          <UserAvatar name={r.name} src={r.profilePictureUrl} />
          <span className="truncate">{r.name}</span>
        </Link>
      ),
    },
    { key: "email", header: "Email", sortKey: "email", cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
    {
      key: "address",
      header: "Address",
      className: "max-w-[220px]",
      cell: (r) => (
        <span className="block truncate text-muted-foreground" title={r.address ?? ""}>
          {r.address ?? "—"}
        </span>
      ),
    },
    { key: "role", header: "Role", sortKey: "role", cell: (r) => <RoleBadge role={r.role} /> },
    {
      key: "rating",
      header: "Rating",
      // Only store owners have a rating; everyone else shows a dash
      cell: (r) =>
        r.role !== "OWNER" ? (
          <span className="text-muted-foreground">—</span>
        ) : r.rating && r.rating > 0 ? (
          <div className="flex items-center gap-2">
            <StarRating value={r.rating} size="sm" />
            <span className="tabular-nums">{r.rating.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">No ratings</span>
        ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "created",
      header: "Joined",
      sortKey: "createdAt",
      cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{format(new Date(r.createdAt), "d MMM yyyy")}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => {
        const isSelf = r.id === me?.id;
        return (
          // modal={false} avoids the "page stuck unclickable" bug when a dialog opens from a menu item
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${r.name}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/admin/users/$id" params={{ id: r.id }}>
                  <Eye className="h-4 w-4" /> View details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/users/$id" params={{ id: r.id }} search={{ edit: 1 } as never}>
                  <UserCog className="h-4 w-4" /> Edit details &amp; addresses
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isSelf} onSelect={() => setEditing(r)}>
                <Pencil className="h-4 w-4" /> Change role / status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={isSelf} className="text-destructive focus:text-destructive" onSelect={() => setDeleting(r)}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <PageFade>
      <PageHeader
        title="Users"
        description="Normal users, store owners and administrators."
        actions={
          <Button variant="hero" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add user
          </Button>
        }
      />

      <Tabs value={s.role || "ALL"} onValueChange={(v) => set({ role: v === "ALL" ? "" : v })} className="mb-4">
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="ADMIN">Admins</TabsTrigger>
          <TabsTrigger value="USER">Users</TabsTrigger>
          <TabsTrigger value="OWNER">Owners</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-col flex-wrap gap-2 sm:flex-row">
        <FilterInput value={s.name} onChange={(v) => set({ name: v })} placeholder="Name" />
        <FilterInput value={s.email} onChange={(v) => set({ email: v })} placeholder="Email" />
        <FilterInput value={s.address} onChange={(v) => set({ address: v })} placeholder="Address" className="h-9 w-full sm:w-56" />
        <Select value={s.status || "ALL"} onValueChange={(v) => set({ status: v === "ALL" ? "" : v })}>
          <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <DataTable
        columns={cols}
        rows={q.data?.data}
        loading={q.isFetching}
        error={q.isError ? errorMessage(q.error) : null}
        onRetry={() => q.refetch()}
        sortBy={s.sortBy}
        order={s.order as "asc" | "desc"}
        onSort={(k) => set(nextSort({ sortBy: s.sortBy, order: s.order as "asc" | "desc" }, k))}
        mobileTitle={(r) => (
          <Link to="/admin/users/$id" params={{ id: r.id }} className="flex items-center gap-3 font-semibold">
            <UserAvatar name={r.name} src={r.profilePictureUrl} />
            <span className="truncate">{r.name}</span>
          </Link>
        )}
        empty={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={hasFilters ? "No users match these filters" : "No users yet"}
            description={hasFilters ? "Try different filters." : "Add the first user to get started."}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
              ) : (
                <Button variant="hero" onClick={() => setCreateOpen(true)}>Add user</Button>
              )
            }
          />
        }
      />
      <Pagination meta={q.data?.meta} onPage={(p) => set({ page: p })} onLimit={(l) => set({ limit: l })} />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editing && <EditRoleStatusDialog key={editing.id} user={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "user"}?`}
        description="They will no longer be able to log in. Their existing ratings stay on the platform."
        confirmLabel="Delete user"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </PageFade>
  );
}

const CREATE_FIELDS = [
  "name",
  "email",
  "password",
  "role",
  ...ADDRESS_FIELD_NAMES.map((f) => `address.${f}`),
];

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const form = useForm<z.input<typeof createUserSchema>, unknown, z.output<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", password: "", role: "USER", address: { ...EMPTY_ADDRESS } },
  });
  const { errors, isSubmitting } = form.formState;
  const name = form.watch("name");
  const password = form.watch("password");
  const role = form.watch("role");
  const address = form.watch("address");
  const preview = joinAddress(address ?? {});

  useEffect(() => {
    if (!open) form.reset({ name: "", email: "", password: "", role: "USER", address: { ...EMPTY_ADDRESS } });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await adminApi.createUser(v);
      toast.success("User created", { description: `${v.email} · ${v.role.toLowerCase()}` });
      qc.invalidateQueries({ queryKey: ["admin"] });
      onOpenChange(false);
    } catch (e) {
      handleApiError(e, form.setError, CREATE_FIELDS);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>Create a normal user, a store owner or another administrator.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="cu-name" error={errors.name?.message} right={<CharCount value={normalizeName(name ?? "").length} min={20} max={60} />}>
            <Input id="cu-name" placeholder="At least 20 characters" {...form.register("name")} />
          </Field>
          <Field label="Email" htmlFor="cu-email" error={errors.email?.message}>
            <Input id="cu-email" type="email" autoComplete="off" {...form.register("email")} />
          </Field>
          <Field label="Role" htmlFor="cu-role" error={errors.role?.message}>
            <Select value={role} onValueChange={(v) => form.setValue("role", v as Role, { shouldValidate: true })}>
              <SelectTrigger id="cu-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Normal user</SelectItem>
                <SelectItem value="OWNER">Store owner</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Password" htmlFor="cu-password" error={errors.password?.message}>
            <PasswordInput id="cu-password" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <PasswordChecklist value={password ?? ""} />

          <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold">Address</p>
            <AddressFields register={form.register as never} errors={errors.address as never} prefix="address." idPrefix="cu" />
            <div className="rounded-xl bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Saved as</p>
                <CharCount value={preview.length} max={MAX_FULL_ADDRESS} />
              </div>
              <p className="mt-1 wrap-break-word text-sm">{preview || "—"}</p>
            </div>
          </div>

          <LoadingButton type="submit" variant="hero" className="w-full" loading={isSubmitting}>
            Create user
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Quick role / status change from the table menu (full editing lives on the user page) */
function EditRoleStatusDialog({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<Role>(user.role);
  const [status, setStatus] = useState<AccountStatus>(user.status);

  const body: { role?: Role; status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" } = {
    ...(role !== user.role ? { role } : {}),
    ...(status !== user.status ? { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" } : {}),
  };
  const changed = Object.keys(body).length > 0;

  const m = useMutation({
    mutationFn: () => adminApi.updateUser(user.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("User updated", { description: user.name });
      onClose();
    },
    onError: (e) => handleApiError(e),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change role / status</DialogTitle>
          <DialogDescription>{user.name} · {user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Role" htmlFor="eu-role" hint={user.role === "OWNER" ? "An owner with stores can't change role until their stores are reassigned." : undefined}>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="eu-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Normal user</SelectItem>
                <SelectItem value="OWNER">Store owner</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status" htmlFor="eu-status" hint="Suspending or deactivating signs the user out everywhere.">
            <Select value={status} onValueChange={(v) => setStatus(v as AccountStatus)}>
              <SelectTrigger id="eu-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <LoadingButton variant="hero" className="w-full" disabled={!changed} loading={m.isPending} onClick={() => m.mutate()}>
            Save changes
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}