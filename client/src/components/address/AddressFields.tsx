/* eslint-disable @typescript-eslint/no-explicit-any */
import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/forms";

/**
 * The structured address inputs: flat no., street, landmark, area, city, state, PIN code, country.
 * `prefix` is "" for a top-level form, or e.g. "address." when nested inside a bigger form.
 * `errors` must be the errors object that holds these fields.
 */
export function AddressFields({
  register,
  errors,
  prefix = "",
  idPrefix = "ad",
}: {
  register: UseFormRegister<any>;
  errors?: Record<string, any>;
  prefix?: string;
  idPrefix?: string;
}) {
  const err = (name: string): string | undefined => errors?.[name]?.message;
  const reg = (name: string) => register(`${prefix}${name}`);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Flat / house no." htmlFor={`${idPrefix}-flat`} error={err("flatNo")}>
        <Input id={`${idPrefix}-flat`} placeholder="e.g. 4B" {...reg("flatNo")} />
      </Field>
      <Field label="Street" htmlFor={`${idPrefix}-street`} error={err("street")}>
        <Input id={`${idPrefix}-street`} placeholder="Street / road name" {...reg("street")} />
      </Field>
      <Field label="Landmark (optional)" htmlFor={`${idPrefix}-landmark`} error={err("landmark")}>
        <Input id={`${idPrefix}-landmark`} {...reg("landmark")} />
      </Field>
      <Field label="Area / village (optional)" htmlFor={`${idPrefix}-village`} error={err("village")}>
        <Input id={`${idPrefix}-village`} {...reg("village")} />
      </Field>
      <Field label="City" htmlFor={`${idPrefix}-city`} error={err("city")}>
        <Input id={`${idPrefix}-city`} {...reg("city")} />
      </Field>
      <Field label="State" htmlFor={`${idPrefix}-state`} error={err("state")}>
        <Input id={`${idPrefix}-state`} {...reg("state")} />
      </Field>
      <Field label="PIN code" htmlFor={`${idPrefix}-pin`} error={err("pinCode")}>
        <Input id={`${idPrefix}-pin`} inputMode="numeric" {...reg("pinCode")} />
      </Field>
      <Field label="Country" htmlFor={`${idPrefix}-country`} error={err("country")}>
        <Input id={`${idPrefix}-country`} {...reg("country")} />
      </Field>
    </div>
  );
}