import { describe, it, expect } from "vitest";
import { isContactPhoneSearch, isPhoneSearch } from "../phoneSearch";

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

  it("requires 9+ digits for synced phone-contact fallback", () => {
    expect(isContactPhoneSearch("07712345")).toBe(false);
    expect(isContactPhoneSearch("Nimal")).toBe(false);
    expect(isContactPhoneSearch("077123456")).toBe(true);
    expect(isContactPhoneSearch("+94 77 123 4567")).toBe(true);
  });
});
