import { describe, it, expect } from "vitest";
import { isContactSearch, isPhoneSearch } from "../phoneSearch";

describe("isPhoneSearch (phone-contact helper)", () => {
  it("accepts phone numbers in local, international and formatted forms", () => {
    expect(isPhoneSearch("0771234567")).toBe(true);
    expect(isPhoneSearch("+94 77 123 4567")).toBe(true);
    expect(isPhoneSearch("077-123")).toBe(true);
    expect(isPhoneSearch(" 0771 ")).toBe(true);
  });

  it("rejects names, NICs and too few digits", () => {
    expect(isPhoneSearch("Nimal")).toBe(false);
    expect(isPhoneSearch("Nimal 077")).toBe(false);
    expect(isPhoneSearch("199012345678V")).toBe(false);
    expect(isPhoneSearch("077")).toBe(false);
    expect(isPhoneSearch("")).toBe(false);
  });
});

describe("isContactSearch", () => {
  it("needs at least 9 typed digits", () => {
    expect(isContactSearch("07712345")).toBe(false);
    expect(isContactSearch("077123456")).toBe(true);
    expect(isContactSearch("077 123 4567")).toBe(true);
    expect(isContactSearch("Nimal 077123456")).toBe(false);
  });
});
