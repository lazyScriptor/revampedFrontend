/**
 * Phonetic "Singlish" → Sinhala Unicode transliteration (Helakuru / Google style).
 *   mama → මම · kamal → කමල් · thaththaa → තාත්තා · shrii → ශ්‍රී · indra → ඉන්ද්‍ර
 * Cheat-sheet: a අ/– · aa ආ/ා · ae ඇ/ැ · aae ඈ/ෑ · i ඉ/ි · ii,ee ඊ/ී · u උ/ු · uu,oo ඌ/ූ
 *              e එ/ෙ · ea ඒ/ේ · o ඔ/ො · oe ඕ/ෝ · ai ඓ/ෛ · au ඖ/ෞ · x → ං · H → ඃ
 * Consonants: k ක · kh ඛ · g ග · gh ඝ · ch ච · j ජ · jn ඥ · ny ඤ · t ට · th ත · d ද · D ඩ · dh ධ
 *             n න · N ණ · p ප · ph ඵ · b බ · bh භ · m ම · y ය · r ර · l ල · L ළ · w,v ව
 *             s ස · sh ශ · Sh ෂ · h හ · f ෆ.   C + r/y + vowel makes ක්‍ර / ද්‍ය clusters.
 */
const HAL = "්"; // ්
const ZWJ = "‍";

// [roman, independent vowel, vowel sign]
const VOWELS: Array<[string, string, string]> = [
  ["aae", "ඈ", "ෑ"], ["aa", "ආ", "ා"], ["ae", "ඇ", "ැ"], ["ai", "ඓ", "ෛ"], ["au", "ඖ", "ෞ"],
  ["ii", "ඊ", "ී"], ["ee", "ඊ", "ී"], ["uu", "ඌ", "ූ"], ["oo", "ඌ", "ූ"],
  ["ea", "ඒ", "ේ"], ["oe", "ඕ", "ෝ"],
  ["a", "අ", ""], ["A", "ආ", "ා"], ["i", "ඉ", "ි"], ["u", "උ", "ු"], ["e", "එ", "ෙ"], ["o", "ඔ", "ො"],
];

const CONSONANTS: Array<[string, string]> = [
  ["chh", "ඡ"], ["ch", "ච"], ["c", "ච"], ["kh", "ඛ"], ["k", "ක"], ["gh", "ඝ"], ["g", "ග"],
  ["jh", "ඣ"], ["jn", "ඥ"], ["j", "ජ"], ["ny", "ඤ"],
  ["Th", "ඨ"], ["th", "ත"], ["T", "ට"], ["t", "ට"],
  ["Dh", "ඪ"], ["dh", "ධ"], ["D", "ඩ"], ["d", "ද"],
  ["N", "ණ"], ["n", "න"], ["ph", "ඵ"], ["p", "ප"], ["bh", "භ"], ["b", "බ"], ["m", "ම"],
  ["y", "ය"], ["r", "ර"], ["L", "ළ"], ["l", "ල"], ["w", "ව"], ["v", "ව"],
  ["Sh", "ෂ"], ["sh", "ශ"], ["S", "ශ"], ["s", "ස"], ["h", "හ"], ["f", "ෆ"],
];

const SPECIAL: Record<string, string> = { x: "ං", H: "ඃ" };

type Token = { roman: string; kind: "v" | "c" | "s"; a: string; b?: string };
const TOKENS: Token[] = [
  ...VOWELS.map(([roman, a, b]) => ({ roman, kind: "v" as const, a, b })),
  ...CONSONANTS.map(([roman, a]) => ({ roman, kind: "c" as const, a })),
  ...Object.entries(SPECIAL).map(([roman, a]) => ({ roman, kind: "s" as const, a })),
].sort((x, y) => y.roman.length - x.roman.length);

const matchAt = (src: string, i: number): Token | undefined =>
  TOKENS.find((t) => src.startsWith(t.roman, i));

// Letters with no mapping of their own fall back to lower case ("Kamal" → "kamal").
const normalise = (src: string) =>
  src.replace(/[A-Z]/g, (ch, idx) => (matchAt(src, idx) ? ch : ch.toLowerCase()));

export function singlishToSinhala(input: string): string {
  const src = normalise(input);
  let out = "";
  let pending = false; // last emitted a consonant that still needs a vowel sign or hal
  let lastCons = "";
  let i = 0;

  while (i < src.length) {
    const tok = matchAt(src, i);
    if (!tok) {
      if (pending) { out += HAL; pending = false; }
      out += src[i];
      i += 1;
      continue;
    }
    i += tok.roman.length;

    if (tok.kind === "v") {
      if (pending) { out += tok.b ?? ""; pending = false; }
      else out += tok.a;
    } else if (tok.kind === "s") {
      if (pending) { out += HAL; pending = false; }
      out += tok.a;
    } else {
      if (pending) {
        const next = matchAt(src, i);
        const cluster = (tok.roman === "r" || (tok.roman === "y" && lastCons !== "ය")) && next?.kind === "v";
        out += cluster ? HAL + ZWJ : HAL;
      }
      out += tok.a;
      pending = true;
      lastCons = tok.a;
    }
  }
  if (pending) out += HAL;
  return out;
}
