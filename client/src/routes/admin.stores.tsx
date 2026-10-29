import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Check, ChevronsUpDown, ImagePlus, MapPin, MoreHorizontal, Pencil, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
import { CharCount, EmptyState, PageFade, PageHeader, StatusBadge, UserAvatar } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";
import { ConfirmDialog, Field, LoadingButton, PasswordChecklist, PasswordInput, validateImage } from "@/components/common/forms";
import { AddressDialog } from "@/components/address/AddressDialog";
import { adminApi, type AdminStoreQuery } from "@/api/endpoints";
import { useUrlState } from "@/hooks/useUrlState";
import { useDebounce } from "@/hooks/useDebounce";
import { createStoreSchema, emailSchema, normalizeName, phoneRegex, storeNameSchema } from "@/lib/validators";
import { IMAGE_TYPES } from "@/lib/constants";
import { errorMessage, handleApiError } from "@/lib/errors";
import type { AdminStore, StoreStatus } from "@/types/api";

export const Route = createFileRoute("/admin/stores")({
  head: () => ({
    meta: [
      { title: "Admin stores — Rateify" },
      { name: "description", content: "Create, filter and manage stores and their owners." },
      { property: "og:title", content: "Admin stores — Rateify" },
      { property: "og:description", content: "Create, filter and manage stores and their owners." },
    ],
  }),
  component: AdminStores,
});

const DEFAULTS = { name: "", email: "", address: "", status: "", minRating: 0, sortBy: "name", order: "asc", page: 1, limit: 10 };

function AdminStores() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const [s, set] = useUrlState({ ...DEFAULTS, search: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStore | null>(null);
  const [addressFor, setAddressFor] = useState<AdminStore | null>(null);
  const [deleting, setDeleting] = useState<AdminStore | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoTarget = useRef<string | null>(null);

  // ?create=1 (from the dashboard's "Add store" button) opens the dialog, then the param is removed
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

  const params: AdminStoreQuery = {
    search: s.search || undefined,
    name: s.name || undefined,
    email: s.email || undefined,
    address: s.address || undefined,
    status: (s.status || undefined) as StoreStatus | undefined,
    minRating: s.minRating || undefined,
    sortBy: s.sortBy,
    order: s.order as "asc" | "desc",
    page: s.page,
    limit: s.limit,
  };
  const q = useQuery({
    queryKey: ["admin", "stores", params],
    queryFn: () => adminApi.stores(params),
    placeholderData: keepPreviousData,
  });

  const hasFilters = !!(s.search || s.name || s.email || s.address || s.status || s.minRating);
  const clearFilters = () => set({ search: "", name: "", email: "", address: "", status: "", minRating: 0 });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteStore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Store deleted");
      setDeleting(null);
    },
    onError: (e) => {
      handleApiError(e);
      setDeleting(null);
    },
  });

  const logo = useMutation({
    mutationFn: (v: { id: string; file: File }) => adminApi.uploadLogo(v.id, v.file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "stores"] });
      toast.success("Logo updated");
    },
    onError: (e) => handleApiError(e),
  });

  const cols: Column<AdminStore>[] = [
    {
      key: "store",
      header: "Store",
      sortKey: "name",
      hideMobile: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={r.name} src={r.logoUrl} className="rounded-xl *:rounded-xl" />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.name}</p>
            {r.category && <p className="truncate text-xs text-muted-foreground">{r.category}</p>}
          </div>
        </div>
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
    {
      key: "rating",
      header: "Rating",
      sortKey: "rating",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <StarRating value={r.rating} size="sm" />
          <span className="tabular-nums">{r.rating > 0 ? r.rating.toFixed(1) : "—"}</span>
          <span className="text-xs text-muted-foreground">({r.ratingCount})</span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (r) => (
        <Link to="/admin/users/$id" params={{ id: r.owner.id }} className="block min-w-0 hover:text-primary">
          <p className="truncate">{r.owner.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{r.owner.email}</p>
        </Link>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "created",
      header: "Created",
      sortKey: "createdAt",
      cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{format(new Date(r.createdAt), "d MMM yyyy")}</span>,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${r.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(r)}>
              <Pencil className="h-4 w-4" /> Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAddressFor(r)}>
              <MapPin className="h-4 w-4" /> Edit address
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                logoTarget.current = r.id;
                fileRef.current?.click();
              }}
            >
              <ImagePlus className="h-4 w-4" /> Change logo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(r)}>
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageFade>
      <PageHeader
        title="Stores"
        description="Every registered store, its owner and its rating."
        actions={
          <Button variant="hero" onClick={() => setCreateOpen(true)}>
            <Store className="h-4 w-4" /> Add store
          </Button>
        }
      />

      {s.search && (
        <p className="mb-3 text-sm text-muted-foreground">
          Showing results for “{s.search}”.{" "}
          <button className="font-medium text-primary hover:underline" onClick={() => set({ search: "" })}>
            Clear
          </button>
        </p>
      )}

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
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(s.minRating)} onValueChange={(v) => set({ minRating: Number(v) })}>
          <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Minimum rating">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any rating</SelectItem>
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={String(n)}>{n}+ stars</SelectItem>
            ))}
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
          <div className="flex items-center gap-3">
            <UserAvatar name={r.name} src={r.logoUrl} className="rounded-xl *:rounded-xl" />
            <span className="truncate font-semibold">{r.name}</span>
          </div>
        )}
        empty={
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title={hasFilters ? "No stores match these filters" : "No stores yet"}
            description={hasFilters ? "Try different filters." : "Add a store — its owner account is created with it."}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
              ) : (
                <Button variant="hero" onClick={() => setCreateOpen(true)}>Add store</Button>
              )
            }
          />
        }
      />
      <Pagination meta={q.data?.meta} onPage={(p) => set({ page: p })} onLimit={(l) => set({ limit: l })} />

      {/* One hidden file input shared by every row's "Change logo" action */}
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          const id = logoTarget.current;
          if (f && id && validateImage(f)) logo.mutate({ id, file: f });
        }}
      />

      <CreateStoreDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editing && <EditStoreDialog key={editing.id} store={editing} onClose={() => setEditing(null)} />}
      {addressFor && <StoreAddressDialog key={addressFor.id} store={addressFor} onClose={() => setAddressFor(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "store"}?`}
        description="The store will disappear from the platform. Existing ratings are kept."
        confirmLabel="Delete store"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </PageFade>
  );
}

/** Structured store address (flat no., street, landmark, area, city, state, PIN, country) */
function StoreAddressDialog({ store, onClose }: { store: AdminStore; onClose: () => void }) {
  const qc = useQueryClient();
  return (
    <AddressDialog
      address={store.addressDetails}
      defaultType="STORE"
      hideType
      title="Store address"
      description={`${store.name} — shown on the store listing. Each field is saved on its own and combined into one full address.`}
      onClose={onClose}
      onSubmit={(v) => {
        const { type: _type, isPrimary: _primary, ...fields } = v;
        return adminApi.saveStoreAddress(store.id, fields);
      }}
      onSaved={() => qc.invalidateQueries({ queryKey: ["admin"] })}
    />
  );
}

/** Async searchable owner picker (used when re-assigning a store): GET /admin/users?role=OWNER&status=ACTIVE&limit=20&name=... */
function OwnerPicker({ label, value, onChange }: { label?: string; value: string; onChange: (id: string, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const q = useQuery({
    queryKey: ["admin", "users", "owners", debounced],
    queryFn: () =>
      adminApi.users({ role: "OWNER", status: "ACTIVE", limit: 20, sortBy: "name", order: "asc", name: debounced || undefined }),
    enabled: open,
    staleTime: 15_000,
  });
  const owners = q.data?.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className={label ? "truncate" : "truncate text-muted-foreground"}>{label || "Select an owner"}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search owners by name…" value={query} onValueChange={setQuery} />
          <CommandList>
            {q.isFetching && owners.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>}
            {!q.isFetching && owners.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No active owners found.</p>
            )}
            {owners.map((o) => (
              <CommandItem
                key={o.id}
                value={o.id}
                onSelect={() => {
                  onChange(o.id, `${o.name} (${o.email})`);
                  setOpen(false);
                }}
              >
                <UserAvatar name={o.name} src={o.profilePictureUrl} className="h-7 w-7" />
                <div className="min-w-0">
                  <p className="truncate text-sm">{o.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                </div>
                {o.id === value && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Admin "Add store": owner name, store name, email and password. Creates the owner account + the store. */
function CreateStoreDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const form = useForm<z.input<typeof createStoreSchema>, unknown, z.output<typeof createStoreSchema>>({
    resolver: zodResolver(createStoreSchema),
    mode: "onTouched",
    defaultValues: { ownerName: "", storeName: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const ownerName = form.watch("ownerName");
  const password = form.watch("password");

  useEffect(() => {
    if (!open) form.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const created = await adminApi.createStore(v);
      toast.success("Store created", { description: `${created.name} · login: ${v.email}` });
      qc.invalidateQueries({ queryKey: ["admin"] });
      onOpenChange(false);
    } catch (e) {
      handleApiError(e, form.setError, ["ownerName", "storeName", "email", "password"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add store</DialogTitle>
          <DialogDescription>
            Creates the store and its owner account together. The owner logs in with this email and password. You can add the store address afterwards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="Owner name"
            htmlFor="cs-owner"
            error={errors.ownerName?.message}
            right={<CharCount value={normalizeName(ownerName ?? "").length} min={20} max={60} />}
          >
            <Input id="cs-owner" placeholder="At least 20 characters" {...form.register("ownerName")} />
          </Field>
          <Field label="Store name" htmlFor="cs-store" error={errors.storeName?.message}>
            <Input id="cs-store" {...form.register("storeName")} />
          </Field>
          <Field label="Email" htmlFor="cs-email" error={errors.email?.message} hint="Used as the store email and the owner's login.">
            <Input id="cs-email" type="email" autoComplete="off" {...form.register("email")} />
          </Field>
          <Field label="Password" htmlFor="cs-password" error={errors.password?.message}>
            <PasswordInput id="cs-password" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <PasswordChecklist value={password ?? ""} />
          <LoadingButton type="submit" variant="hero" className="w-full" loading={isSubmitting}>
            Create store
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editSchema = z.object({
  name: storeNameSchema,
  email: emailSchema,
  ownerId: z.string().min(1, "Select an owner"),
  phone: z.string().trim().refine((v) => v === "" || phoneRegex.test(v), "Enter a valid phone number"),
  description: z.string().max(1000, "At most 1000 characters"),
  category: z.string().max(60, "At most 60 characters"),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"]),
});

function EditStoreDialog({ store, onClose }: { store: AdminStore; onClose: () => void }) {
  const qc = useQueryClient();
  const [ownerLabel, setOwnerLabel] = useState(`${store.owner.fullName} (${store.owner.email})`);
  const form = useForm<z.input<typeof editSchema>, unknown, z.output<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    mode: "onTouched",
    defaultValues: {
      name: store.name,
      email: store.email,
      ownerId: store.owner.id,
      phone: store.phone ?? "",
      description: store.description ?? "",
      category: store.category ?? "",
      status: store.status,
    },
  });
  const { errors, isSubmitting, dirtyFields } = form.formState;
  const description = form.watch("description");
  const ownerId = form.watch("ownerId");
  const status = form.watch("status");

  const onSubmit = form.handleSubmit(async (v) => {
    // PATCH only what changed; cleared optional fields are sent as null
    const body: Record<string, unknown> = {};
    if (dirtyFields.name) body.name = v.name;
    if (dirtyFields.email) body.email = v.email;
    if (dirtyFields.ownerId) body.ownerId = v.ownerId;
    if (dirtyFields.phone) body.phone = v.phone || null;
    if (dirtyFields.description) body.description = v.description.trim() || null;
    if (dirtyFields.category) body.category = v.category.trim() || null;
    if (dirtyFields.status) body.status = v.status;
    if (Object.keys(body).length === 0) {
      toast("Nothing to save");
      return;
    }
    try {
      await adminApi.updateStore(store.id, body);
      toast.success("Store updated", { description: store.name });
      qc.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    } catch (e) {
      handleApiError(e, form.setError, ["name", "email", "ownerId", "phone", "description", "category", "status"]);
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit store</DialogTitle>
          <DialogDescription>{store.name} — use “Edit address” in the row menu to change the address.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Store name" htmlFor="es-name" error={errors.name?.message}>
            <Input id="es-name" {...form.register("name")} />
          </Field>
          <Field label="Store email" htmlFor="es-email" error={errors.email?.message}>
            <Input id="es-email" type="email" {...form.register("email")} />
          </Field>
          <Field label="Owner" htmlFor="es-owner" error={errors.ownerId?.message}>
            <OwnerPicker
              value={ownerId}
              label={ownerLabel}
              onChange={(id, label) => {
                setOwnerLabel(label);
                form.setValue("ownerId", id, { shouldValidate: true, shouldDirty: true });
              }}
            />
          </Field>
          <Field label="Status" htmlFor="es-status">
            <Select value={status} onValueChange={(v) => form.setValue("status", v as z.infer<typeof editSchema>["status"], { shouldDirty: true })}>
              <SelectTrigger id="es-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="es-phone" error={errors.phone?.message}>
              <Input id="es-phone" type="tel" {...form.register("phone")} />
            </Field>
            <Field label="Category" htmlFor="es-category" error={errors.category?.message}>
              <Input id="es-category" {...form.register("category")} />
            </Field>
          </div>
          <Field label="Description" htmlFor="es-desc" error={errors.description?.message} right={<CharCount value={(description ?? "").length} max={1000} />}>
            <Textarea id="es-desc" rows={3} {...form.register("description")} />
          </Field>
          <LoadingButton type="submit" variant="hero" className="w-full" loading={isSubmitting}>
            Save changes
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}