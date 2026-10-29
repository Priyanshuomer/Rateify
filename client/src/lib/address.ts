export type AddressParts = {
  flatNo?: string | null;
  street?: string | null;
  landmark?: string | null;
  village?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string | null;
};

export const MAX_FULL_ADDRESS = 400;
export const ADDRESS_TYPES = ["HOME", "WORK", "STORE", "OTHER"] as const;

/** Same joining rule as the server; used for the live "Saved as" preview */
export const joinAddress = (p: AddressParts) =>
  [p.flatNo, p.street, p.landmark, p.village, p.city, p.state, p.pinCode, p.country]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ");

export const EMPTY_ADDRESS = {
  flatNo: "",
  street: "",
  landmark: "",
  village: "",
  city: "",
  state: "",
  country: "India",
  pinCode: "",
};

export const ADDRESS_FIELD_NAMES = ["flatNo", "street", "landmark", "village", "city", "state", "country", "pinCode"] as const;