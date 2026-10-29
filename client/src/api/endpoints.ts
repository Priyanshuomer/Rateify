import { del, get, getList, patch, post, put, upload, API_BASE_URL } from "./client";
import type {
  AccountStatus,
  AddressType,
  AdminDashboard,
  AdminStore,
  AdminUserDetail,
  AdminUserRow,
  Gender,
  LoginResult,
  MyRatingItem,
  OwnerDashboard,
  OwnerRating,
  OwnerStore,
  ProfileBundle,
  PublicUser,
  RatingResult,
  Role,
  Store,
  StoreStatus,
} from "@/types/api";

export type ListParams = { page?: number; limit?: number; order?: "asc" | "desc"; sortBy?: string };

// ---- Auth ----
export const authApi = {
  /** multipart: role, name, email, password (+ storeName, ownerImage, storeLogo for owners; adminCode for admins) */
  signup: (form: FormData) => post<null>("/auth/signup", form),
  resendVerification: (email: string) => post<null>("/auth/resend-verification", { email }),
  login: (b: { email: string; password: string; role?: Role }) => post<LoginResult>("/auth/login", b),
  logout: (refreshToken?: string | null) =>
    post<null>("/auth/logout", refreshToken ? { refreshToken } : {}),
  logoutAll: () => post<null>("/auth/logout-all"),
  me: () => get<ProfileBundle>("/auth/me"),
  changePassword: (b: { currentPassword?: string; newPassword: string }) =>
    post<{ accessToken: string; refreshToken: string }>("/auth/change-password", b),
  forgotPassword: (email: string) => post<null>("/auth/forgot-password", { email }),
  resetPassword: (b: { token: string; newPassword: string }) =>
    post<null>("/auth/reset-password", b),
  googleLoginUrl: () => `${API_BASE_URL}/auth/google/login`,
  googleSignupUrl: () => `${API_BASE_URL}/auth/google/signup`,
};

// ---- Address (shared by profile, admin user and admin store forms) ----
export type AddressInput = {
  type?: AddressType;
  flatNo?: string;
  street: string;
  landmark?: string;
  village?: string;
  city: string;
  state: string;
  country?: string;
  pinCode: string;
  isPrimary?: boolean;
};
/** Address fields without the type / primary flag */
export type AddressFieldsInput = Omit<AddressInput, "type" | "isPrimary">;

// ---- Profile ----
export type ProfilePatch = Partial<{
  name: string;
  phone: string | null;
  dob: string | null;
  gender: PublicUser["gender"];
  bio: string | null;
}>;

export const profileApi = {
  get: () => get<ProfileBundle>("/profile"),
  update: (b: ProfilePatch) => patch<ProfileBundle>("/profile", b),
  addAddress: (b: AddressInput) => post<ProfileBundle>("/profile/addresses", b),
  /** send only changed fields; an empty string clears an optional field */
  updateAddress: (id: string, b: Partial<Omit<AddressInput, "isPrimary">>) =>
    patch<ProfileBundle>(`/profile/addresses/${id}`, b),
  setPrimaryAddress: (id: string) => patch<ProfileBundle>(`/profile/addresses/${id}/primary`),
  deleteAddress: (id: string) => del<ProfileBundle>(`/profile/addresses/${id}`),
  uploadPicture: (f: File) => upload<ProfileBundle>("/profile/picture", f),
  deletePicture: () => del<ProfileBundle>("/profile/picture"),
};

// ---- Stores (USER) ----
export type StoreQuery = ListParams & {
  search?: string;
  name?: string;
  address?: string;
  minRating?: number;
};
export const storesApi = {
  list: (q: StoreQuery) => getList<Store>("/stores", q),
  get: (id: string) => get<Store>(`/stores/${id}`),
  rate: (id: string, b: { value: number; comment?: string }) =>
    post<RatingResult>(`/stores/${id}/ratings`, b),
  updateRating: (id: string, b: { value: number; comment?: string }) =>
    put<RatingResult>(`/stores/${id}/ratings`, b),
  myRatings: (q: ListParams) => getList<MyRatingItem>("/ratings/me", q),
};

// ---- Owner ----
export type OwnerRatingQuery = ListParams & {
  storeId?: string;
  name?: string;
  email?: string;
  value?: number;
};
export const ownerApi = {
  dashboard: () => get<OwnerDashboard>("/owner/dashboard"),
  stores: () => get<OwnerStore[]>("/owner/stores"),
  ratings: (q: OwnerRatingQuery) => getList<OwnerRating>("/owner/ratings", q),
};

// ---- Admin ----
export type AdminUserQuery = ListParams & {
  name?: string;
  email?: string;
  address?: string;
  role?: Role;
  status?: Exclude<AccountStatus, "DELETED">;
};
export type AdminStoreQuery = ListParams & {
  search?: string;
  name?: string;
  email?: string;
  address?: string;
  status?: StoreStatus;
  minRating?: number;
};
/** Admin "Add user": the address is sent as structured fields */
export type AdminCreateUserBody = {
  name: string;
  email: string;
  password: string;
  role: Role;
  address: AddressFieldsInput;
};
/** Admin edit user: send only the fields that changed */
export type AdminUserPatch = Partial<{
  name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  gender: Gender | null;
  bio: string | null;
  role: Role;
  status: Exclude<AccountStatus, "DELETED">;
}>;
/** Admin "Add store": creates the owner account and the store together */
export type CreateStoreBody = {
  ownerName: string;
  storeName: string;
  email: string;
  password: string;
};
export const adminApi = {
  dashboard: () => get<AdminDashboard>("/admin/dashboard"),
  createUser: (b: AdminCreateUserBody) => post<PublicUser>("/admin/users", b),
  users: (q: AdminUserQuery) => getList<AdminUserRow>("/admin/users", q),
  user: (id: string) => get<AdminUserDetail>(`/admin/users/${id}`),
  updateUser: (id: string, b: AdminUserPatch) => patch<AdminUserDetail>(`/admin/users/${id}`, b),
  deleteUser: (id: string) => del<null>(`/admin/users/${id}`),
  // a user's addresses (each call returns the refreshed user detail)
  addUserAddress: (id: string, b: AddressInput) => post<AdminUserDetail>(`/admin/users/${id}/addresses`, b),
  updateUserAddress: (id: string, addressId: string, b: Partial<Omit<AddressInput, "isPrimary">>) =>
    patch<AdminUserDetail>(`/admin/users/${id}/addresses/${addressId}`, b),
  setUserPrimaryAddress: (id: string, addressId: string) =>
    patch<AdminUserDetail>(`/admin/users/${id}/addresses/${addressId}/primary`),
  deleteUserAddress: (id: string, addressId: string) =>
    del<AdminUserDetail>(`/admin/users/${id}/addresses/${addressId}`),
  // stores
  createStore: (b: CreateStoreBody) => post<AdminStore>("/admin/stores", b),
  stores: (q: AdminStoreQuery) => getList<AdminStore>("/admin/stores", q),
  store: (id: string) => get<AdminStore>(`/admin/stores/${id}`),
  updateStore: (id: string, b: Record<string, unknown>) => patch<AdminStore>(`/admin/stores/${id}`, b),
  saveStoreAddress: (id: string, b: AddressFieldsInput) => put<AdminStore>(`/admin/stores/${id}/address`, b),
  deleteStore: (id: string) => del<null>(`/admin/stores/${id}`),
  uploadLogo: (id: string, f: File) => upload<AdminStore>(`/admin/stores/${id}/logo`, f),
};