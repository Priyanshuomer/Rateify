import { ApiError } from "./ApiError";

export interface AddressParts {
  flatNo?: string | null;
  street?: string | null;
  landmark?: string | null;
  village?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string | null;
}

export const MAX_FULL_ADDRESS = 400;

/** Clubs the individual address fields into one readable line, e.g. "4B, 12 MG Road, Near Mall, Andheri, Mumbai, Maharashtra, 400001, India" */
export function buildFullAddress(p: AddressParts) {
  const full = [p.flatNo, p.street, p.landmark, p.village, p.city, p.state, p.pinCode, p.country]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ");

  if (full.length > MAX_FULL_ADDRESS) {
    throw ApiError.badRequest(
      `The whole address is too long (${full.length}/${MAX_FULL_ADDRESS} characters). Please shorten it.`,
      "ADDRESS_TOO_LONG",
    );
  }
  return full;
}

const clean = (v?: string | null) => v?.trim() || null;

/** Normalizes form input into the individual columns (empty -> null, country defaults to India). */
export function toAddressParts(input: AddressParts) {
  return {
    flatNo: clean(input.flatNo),
    street: clean(input.street),
    landmark: clean(input.landmark),
    village: clean(input.village),
    city: clean(input.city),
    state: clean(input.state),
    pinCode: clean(input.pinCode),
    country: clean(input.country) ?? "India",
  };
}