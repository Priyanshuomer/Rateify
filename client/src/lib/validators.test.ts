import { describe, expect, it } from "vitest";
import { loginSchema, nameSchema, passwordSchema, ratingSchema } from "./validators";

describe("validation rules", () => {
  it("name must be 20–60 chars after collapsing spaces", () => {
    expect(nameSchema.safeParse("Short Name").success).toBe(false);
    expect(nameSchema.safeParse("Alexandra    Montgomery  ").success).toBe(true); // 21 chars after collapse
    expect(nameSchema.safeParse("A".repeat(61)).success).toBe(false);
  });
  it("password needs 8–16 chars, an uppercase and a special char", () => {
    expect(passwordSchema.safeParse("Abcdefg!").success).toBe(true);
    expect(passwordSchema.safeParse("abcdefg!").success).toBe(false);
    expect(passwordSchema.safeParse("Abcdefgh").success).toBe(false);
    expect(passwordSchema.safeParse("Abcdefghijklmno!x").success).toBe(false);
  });
  it("login only requires a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
  it("rating is an integer 1–5", () => {
    expect(ratingSchema.safeParse({ value: 0 }).success).toBe(false);
    expect(ratingSchema.safeParse({ value: 6 }).success).toBe(false);
    expect(ratingSchema.safeParse({ value: 3 }).success).toBe(true);
  });
});
