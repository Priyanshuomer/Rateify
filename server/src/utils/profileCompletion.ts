import type { Address, User } from "@prisma/client";

type CompletionUser = Pick<
  User,
  "firstName" | "lastName" | "emailVerified" | "phone" | "dob" | "gender" | "bio" | "profilePictureUrl"
>;
type CompletionAddress = Pick<Address, "fullAddress" | "city" | "state" | "pinCode"> | null | undefined;

const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

export function calculateProfileCompletion(user: CompletionUser, address: CompletionAddress) {
  // Weights add up to 100
  const checks = [
    { field: "name", label: "First and last name", weight: 15, done: has(user.firstName) && has(user.lastName) },
    { field: "emailVerified", label: "Verified email", weight: 10, done: user.emailVerified },
    { field: "phone", label: "Phone number", weight: 10, done: has(user.phone) },
    { field: "dob", label: "Date of birth", weight: 10, done: has(user.dob) },
    { field: "gender", label: "Gender", weight: 5, done: has(user.gender) },
    { field: "bio", label: "Bio", weight: 5, done: has(user.bio) },
    { field: "profilePicture", label: "Profile picture", weight: 15, done: has(user.profilePictureUrl) },
    { field: "address", label: "Address", weight: 20, done: has(address?.fullAddress) },
    {
      field: "addressDetails",
      label: "City, state and pin code",
      weight: 10,
      done: has(address?.city) && has(address?.state) && has(address?.pinCode),
    },
  ];

  const percentage = checks.filter((c) => c.done).reduce((sum, c) => sum + c.weight, 0);

  return {
    percentage,
    isComplete: percentage === 100,
    completed: checks.filter((c) => c.done).map((c) => c.field),
    missing: checks.filter((c) => !c.done).map(({ field, label, weight }) => ({ field, label, weight })),
  };
}