import { toast } from "sonner";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/api/client";
import { FRIENDLY_ERRORS } from "./constants";

export function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.code === "VALIDATION_ERROR" && err.details?.length) return err.details[0].message;
    return FRIENDLY_ERRORS[err.code] ?? err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

/**
 * Maps VALIDATION_ERROR details onto form fields.
 * - Without `setError`, the first detail is shown as a toast.
 * - With `fields` (names that actually have an input on screen), details for any other field
 *   are toasted so the user never gets a silent failure.
 */
export function handleApiError<T extends FieldValues>(
  err: unknown,
  setError?: UseFormSetError<T>,
  fields?: string[],
) {
  if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details?.length) {
    if (!setError) {
      toast.error(err.details[0].message);
      return;
    }
    const orphan: string[] = [];
    err.details.forEach((d) => {
      setError(d.field as Path<T>, { type: "server", message: d.message });
      if (fields && !fields.includes(d.field)) orphan.push(d.message);
    });
    if (orphan.length) toast.error(orphan[0]);
    return;
  }
  const msg = errorMessage(err);
  if (err instanceof ApiError && err.status >= 500) {
    toast.error(msg, { description: err.requestId ? `Reference: ${err.requestId}` : undefined });
  } else {
    toast.error(msg);
  }
}