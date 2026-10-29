export type Role = "ADMIN" | "OWNER" | "USER";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
export type StoreStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "SUSPENDED";
export type AddressType = "HOME" | "WORK" | "STORE" | "OTHER";

export interface PublicUser {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  dob: string | null;
  gender: Gender | null;
  bio: string | null;
  profilePictureUrl: string | null;
  authProvider: "LOCAL" | "GOOGLE";
  /** true once the account has a password (Google users who haven't set one get false) */
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Address {
  id: string;
  type: AddressType;
  fullAddress: string | null;
  flatNo: string | null;
  street: string | null;
  landmark: string | null;
  village: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pinCode: string | null;
  isPrimary: boolean;
}

export interface ProfileCompletion {
  percentage: number;
  isComplete: boolean;
  completed: string[];
  missing: { field: string; label: string; weight: number }[];
}

export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MyRating {
  id: string;
  value: number;
  comment: string | null;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: Meta;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  details?: { field: string; message: string }[] | unknown;
  requestId?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: Meta;
}

export interface ProfileBundle {
  user: PublicUser;
  /** primary address */
  address: Address | null;
  /** every saved address (primary first) */
  addresses: Address[];
  profileCompletion: ProfileCompletion;
}

export interface LoginResult {
  user: PublicUser;
  profileCompletion: ProfileCompletion;
  accessToken: string;
  refreshToken: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  rating: number;
  ratingCount: number;
  createdAt: string;
  myRating: MyRating | null;
}

export interface RatingResult {
  id: string;
  storeId: string;
  value: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  store: { id: string; name: string; rating: number; ratingCount: number };
}

export interface MyRatingItem {
  id: string;
  value: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  store: { id: string; name: string; logoUrl: string | null; averageRating: number; ratingCount: number };
}

export interface RaterUser {
  id: string;
  fullName: string;
  email: string;
  profilePictureUrl: string | null;
}

export interface OwnerStore {
  id: string;
  name: string;
  email: string;
  status: StoreStatus;
  logoUrl: string | null;
  address: string | null;
  averageRating: number;
  ratingCount: number;
}

export interface OwnerDashboard {
  totalStores: number;
  totalRatings: number;
  averageRating: number;
  stores: (OwnerStore & { ratingBreakdown: Record<"1" | "2" | "3" | "4" | "5", number> })[];
  recentRatings: {
    id: string;
    value: number;
    comment: string | null;
    updatedAt: string;
    user: RaterUser;
    store: { id: string; name: string };
  }[];
}

export interface OwnerRating {
  id: string;
  value: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user: RaterUser;
  store: { id: string; name: string };
}

export interface AdminDashboard {
  totalUsers: number;
  totalStores: number;
  totalRatings: number;
  usersByRole: Partial<Record<Role, number>>;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  address: string | null;
  role: Role;
  status: AccountStatus;
  phone: string | null;
  profilePictureUrl: string | null;
  rating: number | null;
  createdAt: string;
}

export interface AdminUserDetail extends PublicUser {
  addresses: Address[];
  address: string | null;
  rating: number | null;
  stores?: { id: string; name: string; email: string; averageRating: number; ratingCount: number; status: StoreStatus }[];
}

export interface AdminStore {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  rating: number;
  ratingCount: number;
  createdAt: string;
  email: string;
  phone: string | null;
  status: StoreStatus;
  owner: { id: string; fullName: string; email: string };
  /** the store's own address split into fields (null when none has been added yet) */
  addressDetails: Address | null;
}