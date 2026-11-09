import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Step 3.5: Timezone and timestamp lint test", () => {
  it("no test under src/**/__tests__/ contains a bare ISO timestamp lacking a timezone offset", () => {
    const srcDir = path.resolve(__dirname, "../../..");
    const violations: { file: string; line: number; text: string; match: string }[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== "fixtures") {
            walk(full);
          }
        } else if (
          entry.isFile() &&
          /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)
        ) {
          const content = fs.readFileSync(full, "utf-8");
          const lines = content.split("\n");
          // Match any quoted ISO timestamp with a time component: "YYYY-MM-DDTHH:mm..."
          const isoRegex = /["'`](\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)([^"'`]*)["'`]/g;

          lines.forEach((lineText, idx) => {
            let match;
            while ((match = isoRegex.exec(lineText)) !== null) {
              const fullMatch = match[0];
              const rest = match[2];
              // Offset must start with Z, z, +HH:MM, or -HH:MM
              const hasOffset = /^(?:[Zz]|[+-]\d{2}:?\d{2})/.test(rest);
              if (!hasOffset) {
                violations.push({
                  file: path.relative(srcDir, full),
                  line: idx + 1,
                  text: lineText.trim(),
                  match: fullMatch,
                });
              }
            }
          });
        }
      }
    };

    walk(srcDir);

    const message = violations
      .map((v) => `  ${v.file}:${v.line} -> ${v.match} in "${v.text}"`)
      .join("\n");

    expect(
      violations,
      `Found bare ISO timestamps lacking timezone offset (must end with Z or [+-]HH:mm):\n${message}`
    ).toEqual([]);
  });
});
