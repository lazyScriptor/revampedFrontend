import { describe, expect, it } from "vitest";
import { matchCustomersLocally } from "../usePosSearch";

const customers = [
  { customer_id: 1, first_name: "Nimal", last_name: "Perera", company_name: "", nic_number: "199012345678", phone_number: "0771234567" },
  { customer_id: 12, first_name: "Kamal", last_name: "Silva", company_name: "Silva Builders", nic_number: "851234567V", phone_number: "+94 71 555 1212" },
  { customer_id: 3, first_name: "Sunil", last_name: "Nimalsiri", company_name: "", nic_number: "", phone_number: "0712000012" },
  { customer_id: 4, first_name: "Gone", last_name: "Away", customer_delete_status: true, phone_number: "0770000000" },
];

const ids = (term: string) => matchCustomersLocally(customers, term).map((c) => c.customer_id);

describe("matchCustomersLocally", () => {
  it("returns nothing for empty text", () => {
    expect(ids("  ")).toEqual([]);
  });

  it("matches first name, last name, full name and company, ignoring case", () => {
    expect(ids("nimal")).toEqual([1, 3]);
    expect(ids("NIMAL PER")).toEqual([1]);
    expect(ids("builders")).toEqual([12]);
  });

  it("needs two letters before matching names", () => {
    expect(ids("n")).toEqual([]);
  });

  it("puts an exact customer ID first", () => {
    expect(ids("12")[0]).toBe(12);
  });

  it("matches phone numbers whatever the prefix", () => {
    expect(ids("0715551212")).toEqual([12]);
    expect(ids("94771234567")).toEqual([1]);
    expect(ids("555")).toEqual([12]);
  });

  it("matches NIC numbers, ignoring spaces and case", () => {
    expect(ids("851234567v")).toEqual([12]);
    expect(ids("1990 1234")).toEqual([1]);
  });

  it("never shows deleted customers", () => {
    expect(ids("gone")).toEqual([]);
  });
});
