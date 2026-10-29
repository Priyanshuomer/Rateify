/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CharCount } from "@/components/common/misc";
import { Field, LoadingButton } from "@/components/common/forms";
import { AddressFields } from "@/components/address/AddressFields";
import type { AddressInput } from "@/api/endpoints";
import { ADDRESS_FIELD_NAMES, ADDRESS_TYPES, joinAddress, MAX_FULL_ADDRESS } from "@/lib/address";
import { addressFieldsSchema, addressTotalIssue, addressTotalRefine } from "@/lib/validators";
import { handleApiError } from "@/lib/errors";
import type { Address, AddressType } from "@/types/api";

const formSchema = addressFieldsSchema
  .extend({ type: z.enum(ADDRESS_TYPES), isPrimary: z.boolean() })
  .refine(addressTotalRefine, addressTotalIssue);
type FormValues = z.infer<typeof formSchema>;

const FIELDS = ["type", ...ADDRESS_FIELD_NAMES];

/**
 * Add / edit an address as separate inputs (flat no., street, landmark, area, city, state, PIN, country).
 * Used on the profile page, the admin user page and for store addresses.
 */
export function AddressDialog({
  address,
  defaultType = "HOME",
  hideType,
  showPrimary,
  isFirst,
  title,
  description = "Each field is saved on its own and combined into one full address.",
  onClose,
  onSubmit,
  onSaved,
}: {
  /** null = add a new address */
  address: Address | null;
  defaultType?: AddressType;
  hideType?: boolean;
  /** show the "make primary" checkbox (when adding) */
  showPrimary?: boolean;
  isFirst?: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onSubmit: (values: AddressInput) => Promise<unknown>;
  onSaved: (result: any) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: {
      type: address?.type ?? defaultType,
      flatNo: address?.flatNo ?? "",
      street: address?.street ?? "",
      landmark: address?.landmark ?? "",
      village: address?.village ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      country: address?.country ?? "India",
      pinCode: address?.pinCode ?? "",
      isPrimary: !!isFirst,
    },
  });
  const { errors, isSubmitting } = form.formState;
  const values = form.watch();
  const preview = joinAddress(values);

  const submit = form.handleSubmit(async (v) => {
    try {
      const result = await onSubmit({
        type: v.type,
        flatNo: v.flatNo,
        street: v.street,
        landmark: v.landmark,
        village: v.village,
        city: v.city,
        state: v.state,
        country: v.country,
        pinCode: v.pinCode,
        isPrimary: v.isPrimary,
      });
      onSaved(result);
      toast.success(address ? "Address updated" : "Address saved");
      onClose();
    } catch (e) {
      handleApiError(e, form.setError, FIELDS);
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? (address ? "Edit address" : "Add address")}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <AddressFields register={form.register as any} errors={errors as any} />

          {!hideType && (
            <Field label="Type" htmlFor="ad-type">
              <Select value={values.type} onValueChange={(t) => form.setValue("type", t as AddressType, { shouldDirty: true })}>
                <SelectTrigger id="ad-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADDRESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Saved as</p>
              <CharCount value={preview.length} max={MAX_FULL_ADDRESS} />
            </div>
            <p className="mt-1 wrap-break-word text-sm">{preview || "—"}</p>
          </div>

          {showPrimary && !address && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="ad-primary"
                checked={values.isPrimary}
                disabled={isFirst}
                onCheckedChange={(c) => form.setValue("isPrimary", c === true, { shouldDirty: true })}
              />
              <Label htmlFor="ad-primary" className="font-normal">
                Make this the primary address{isFirst ? " (the first address is always primary)" : ""}
              </Label>
            </div>
          )}

          <LoadingButton type="submit" variant="hero" className="w-full" loading={isSubmitting}>
            {address ? "Save changes" : "Save address"}
          </LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}