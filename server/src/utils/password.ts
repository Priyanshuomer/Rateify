const COST = 12;
// Burns the same time when the account doesn't exist (prevents user enumeration by timing)
const DUMMY_HASH = Bun.password.hashSync("decoy-password-value", { algorithm: "bcrypt", cost: COST });

export const hashPassword = (plain: string) => Bun.password.hash(plain, { algorithm: "bcrypt", cost: COST });
export const comparePassword = (plain: string, hash: string) => Bun.password.verify(plain, hash);
export const decoyCompare = async (plain: string) => {
  await Bun.password.verify(plain, DUMMY_HASH);
};