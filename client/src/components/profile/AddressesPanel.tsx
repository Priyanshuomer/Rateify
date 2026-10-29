/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/forms";
import { AddressDialog } from "@/components/address/AddressDialog";
import { profileApi, type AddressInput } from "@/api/endpoints";
import { joinAddress } from "@/lib/address";
import { handleApiError } from "@/lib/errors";
import type { Address, Role } from "@/types/api";

/** Where the panel saves to: the signed-in user's own profile (default) or, for admins, another user's addresses. */
export interface AddressApi {
  add: (v: AddressInput) => Promise<unknown>;
  update: (id: string, v: Omit<AddressInput, "isPrimary">) => Promise<unknown>;
  setPrimary: (id: string) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

export const profileAddressApi: AddressApi = {
  add: (v) => profileApi.addAddress(v),
  update: (id, v) => profileApi.updateAddress(id, v),
  setPrimary: (id) => profileApi.setPrimaryAddress(id),
  remove: (id) => profileApi.deleteAddress(id),
};

export function AddressesPanel({
  addresses,
  role,
  onSaved,
  addSignal = 0,
  api = profileAddressApi,
  description,
}: {
  addresses: Address[];
  role: Role;
  /** called with the API result after every successful change */
  onSaved: (result: any) => void;
  /** increment to open the "Add address" dialog from outside (e.g. the profile checklist) */
  addSignal?: number;
  api?: AddressApi;
  description?: string;
}) {
  const [dialog, setDialog] = useState<{ address: Address | null } | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (addSignal > 0) setDialog({ address: null });
  }, [addSignal]);

  const makePrimary = async (a: Address) => {
    setBusy(a.id);
    try {
      onSaved(await api.setPrimary(a.id));
      toast.success("Primary address updated");
    } catch (e) {
      handleApiError(e);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(deleting.id);
    try {
      onSaved(await api.remove(deleting.id));
      toast.success("Address deleted");
      setDeleting(null);
    } catch (e) {
      handleApiError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Addresses</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {description ??
              (role === "OWNER"
                ? "Addresses of type “Store” are shown publicly on your store listing."
                : "Your saved addresses. The primary one is used on your profile.")}
          </p>
        </div>
        <Button id="f-address" variant="hero" size="sm" onClick={() => setDialog({ address: null })}>
          <Plus className="h-4 w-4" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <MapPin className="h-6 w-6" />
          </span>
          <p className="mt-3 font-medium">No address added yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add an address to complete the profile.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-start">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="wrap-break-word text-sm">{a.fullAddress || joinAddress(a) || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="rounded-full capitalize">{a.type.toLowerCase()}</Badge>
                  {a.isPrimary && <Badge variant="outline" className="rounded-full">Primary</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => setDialog({ address: a })}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                {!a.isPrimary && (
                  <Button variant="ghost" size="sm" disabled={busy === a.id} onClick={() => makePrimary(a)}>
                    <Star className="h-3.5 w-3.5" /> Make primary
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(a)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog && (
        <AddressDialog
          key={dialog.address?.id ?? "new"}
          address={dialog.address}
          defaultType={role === "OWNER" ? "STORE" : "HOME"}
          showPrimary
          isFirst={addresses.length === 0}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
          onSubmit={(v) => {
            if (dialog.address) {
              // editing: the primary flag has its own action
              const { isPrimary: _ignored, ...rest } = v;
              return api.update(dialog.address.id, rest);
            }
            return api.add(v);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this address?"
        description={deleting?.fullAddress ?? undefined}
        confirmLabel="Delete"
        destructive
        loading={!!deleting && busy === deleting.id}
        onConfirm={remove}
      />
    </div>
  );
}