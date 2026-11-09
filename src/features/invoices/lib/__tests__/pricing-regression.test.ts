import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import {
  periodCharge,
  chargeableLateDays,
  analyseLine,
  summariseInvoice,
  elapsedDays,
  openEndedExtraDays,
  billableDaysOut,
  isOpenEnded,
  lineOutAt,
} from "../lineCost";
import { calculateLineMath, type CartItem } from "../../components/PosLedgerPanel";
import { calcDaysLate, calcLateFee } from "../../components/ReturnSettlementDialog";

const goldenPath = path.resolve(__dirname, "fixtures/pricing-golden.json");
const sha256Path = path.resolve(__dirname, "fixtures/pricing-golden.sha256");
const goldenCases = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));

describe("Step 4: Golden file integrity (frontend)", () => {
  it("pricing-golden.json matches pricing-golden.sha256 exactly", () => {
    const content = fs.readFileSync(goldenPath, "utf-8");
    const expectedSha = fs.readFileSync(sha256Path, "utf-8").trim();
    const actualSha = crypto.createHash("sha256").update(content, "utf-8").digest("hex");
    expect(actualSha).toBe(expectedSha);
  });
});

describe("Step 3.1 & 3.2: Frontend Golden Table assertions & Parity", () => {
  for (const tc of goldenCases) {
    if (tc.line) {
      it(`Golden Case [${tc.id}]: ${tc.description}`, () => {
        const l = { ...tc.line };
        const issued = tc.issuedAt;
        const atMoment = new Date(tc.at);
        const retDate = tc.returnDate;

        // 1. periodCharge
        const cDays = Math.max(
          1,
          Math.round(
            (new Date(l.expected_return_date).getTime() - new Date(l.borrow_date).getTime()) /
              (24 * 3600 * 1000)
          )
        );
        const disp = periodCharge({
          base: l.locked_base_price,
          minDays: l.locked_minimum_days,
          rate: l.locked_extra_daily_rate,
          days: cDays,
          qty: l.borrow_quantity,
        });
        expect(disp).toBeCloseTo(tc.expected.dispatchTotal, 2);

        // 2. POS calculateLineMath parity
        const cartItem: CartItem = {
          cart_id: `cart-${tc.id}`,
          equipment_id: 1,
          equipment_name: "Test Equipment",
          available_qty: 10,
          is_bulk_item: false,
          borrow_quantity: l.borrow_quantity,
          borrow_date: l.borrow_date,
          expected_return_date: l.expected_return_date,
          locked_base_price: Number(l.locked_base_price) || 0,
          locked_minimum_days: Number(l.locked_minimum_days) || 1,
          locked_extra_daily_rate: Number(l.locked_extra_daily_rate) || 0,
          pricing_mode: Number(l.locked_minimum_days) > 1 ? "tiered" : "daily",
          track_overdue: l.track_overdue !== false,
        };
        const posMath = calculateLineMath(cartItem);
        expect(posMath.lineCost).toBeCloseTo(tc.expected.dispatchTotal, 2);

        // 3. ReturnSettlementDialog calcDaysLate & calcLateFee
        const outAtDate = lineOutAt(l, issued);
        const handoverLine = {
          line_id: 1,
          borrow_date: l.borrow_date,
          expected_return: l.expected_return_date,
          min_days: Number(l.locked_minimum_days) || 1,
          open_ended: isOpenEnded(l),
          out_at: outAtDate?.toISOString(),
          track_overdue: tc.waiveLateFee ? false : l.track_overdue,
          locked_extra_rate: Number(l.locked_extra_daily_rate) || 0,
          good_qty: tc.goodQty ?? (tc.returnQty ?? l.borrow_quantity),
          defective_qty: tc.defectiveQty ?? 0,
        };

        const retDays = calcDaysLate(handoverLine as any, retDate, atMoment);
        const retFee = calcLateFee(handoverLine as any, retDate, atMoment);

        if (!tc.waiveLateFee) {
          expect(retDays).toBe(tc.expected.extraOrLateDays);
          const expectedFeeDelta = tc.expected.totalDelta;
          expect(retFee).toBeCloseTo(expectedFeeDelta, 2);
        } else {
          expect(retFee).toBe(0);
        }

        // 4. analyseLine costToday / lateFee
        const lineWithCost = {
          ...l,
          line_total_amount: l.line_total_amount ?? disp,
        };
        const analysed = analyseLine(lineWithCost, retDate, {
          issuedAt: issued,
          now: atMoment,
        });

        if (l.line_status === "Active") {
          expect(analysed.lateFee).toBeCloseTo(tc.expected.accruedChargeIfStillOut, 2);
          expect(analysed.costToday).toBeCloseTo(
            (l.line_total_amount ?? disp) + tc.expected.accruedChargeIfStillOut,
            2
          );
        }
      });
    }
  }
});
