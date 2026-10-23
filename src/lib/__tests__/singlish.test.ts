import { describe, expect, it } from "vitest";
import { singlishToSinhala as s } from "../singlish";

describe("singlishToSinhala", () => {
  it.each([
    ["mama", "මම"],
    ["mata", "මට"],
    ["kamal", "කමල්"],
    ["Kamal", "කමල්"],
    ["amma", "අම්ම"],
    ["thaaththaa", "තාත්තා"],
    ["oyaata", "ඔයාට"],
    ["shrii", "ශ්‍රී"],
    ["indra", "ඉන්ද්‍ර"],
    ["vidyaa", "විද්‍යා"],
    ["laxkaa", "ලංකා"],
    ["ayya", "අය්ය"],
    ["kamal 500", "කමල් 500"],
  ])("%s → %s", (input, expected) => {
    expect(s(input)).toBe(expected);
  });
});
