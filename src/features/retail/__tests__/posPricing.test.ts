import { beforeEach, describe, expect, it, vi } from "vitest";
import { api as axiosApi } from "@/lib/api";
import { usePosCartStore, selectSaleLines, selectSaleSubtotal } from "@/features/invoices/store/posCartStore";
import { sali, product } from "./catalogFixtures";
import {
  buildSaleInvoicePayload,
  buildSaleLineFromProduct,
  buildUnlistedSaleLine,
  customerPriceLevel,
  resolveCatalogPrice,
} from "../pos/posPricing";
import { fetchToSortDesk, parseSaleCheckoutError } from "../api/pos.api";

describe("posPricing & posCartStore sale actions", () => {
  beforeEach(() => {
    usePosCartStore.getState().resetAll();
  });

  it("resolves retail, contractor, trade, and pack prices cleanly", () => {
    const bit = product({
      product_id: 50,
      name: "SALI Bit",
      sell_price: 200,
      contractor_price: 170,
      trade_price: 150,
      units: [{ unit_id: 9, unit_name: "box", factor: 10, sell_price: 1850 }],
    });
    const box = bit.units![0];

    expect(resolveCatalogPrice(bit, null, "retail", true)).toEqual({ unit_price: 200, price_source: "retail" });
    expect(resolveCatalogPrice(bit, null, "contractor", true)).toEqual({ unit_price: 170, price_source: "contractor" });
    expect(resolveCatalogPrice(bit, null, "trade", true)).toEqual({ unit_price: 150, price_source: "trade" });
    expect(resolveCatalogPrice(bit, null, "contractor", false)).toEqual({ unit_price: 200, price_source: "retail" });
    expect(resolveCatalogPrice(bit, box, "retail", true)).toEqual({ unit_price: 1850, price_source: "retail" });
    expect(resolveCatalogPrice(bit, box, "contractor", true)).toEqual({ unit_price: 1700, price_source: "contractor" });
    expect(customerPriceLevel({ price_level: "contractor" })).toBe("contractor");
    expect(customerPriceLevel(null)).toBe("retail");
  });

  it("merges matching catalog lines, reprices on customer change, and keeps Idempotency-Key across edits until reset", () => {
    const bit = sali(6, { contractor_price: 140 }); // sell_price 160
    const st = usePosCartStore.getState();
    const initialKey = st.idempotencyKey;
    expect(initialKey).toBeTruthy();

    st.addSaleLine(buildSaleLineFromProduct(bit, { warehouseId: 1, priceLevel: "retail", showContractorPrice: true }));
    st.addSaleLine(buildSaleLineFromProduct(bit, { warehouseId: 1, priceLevel: "retail", showContractorPrice: true }));

    let sales = selectSaleLines(usePosCartStore.getState().lines);
    expect(sales).toHaveLength(1);
    expect(sales[0].qty).toBe(2);
    expect(sales[0].line_total).toBe(320);

    // Switching customer keeps same Idempotency-Key and reprices catalog lines
    usePosCartStore.getState().setSelectedCustomer({ customer_id: 9, price_level: "contractor" });
    usePosCartStore.getState().applyCustomerPriceLevel(new Map([[bit.product_id, bit]]), "contractor", true);
    sales = selectSaleLines(usePosCartStore.getState().lines);
    expect(sales[0].unit_price).toBe(140);
    expect(selectSaleSubtotal(usePosCartStore.getState().lines)).toBe(280);
    expect(usePosCartStore.getState().idempotencyKey).toBe(initialKey);

    // Manual override is NOT clobbered by price level switches
    usePosCartStore.getState().updateSaleLine(sales[0].cart_id, { unit_price: 120, price_source: "manual", price_approval_token: "tok-1" });
    usePosCartStore.getState().applyCustomerPriceLevel(new Map([[bit.product_id, bit]]), "retail", true);
    expect(selectSaleLines(usePosCartStore.getState().lines)[0].unit_price).toBe(120);

    // clearCart / resetAll generates a new Idempotency-Key
    usePosCartStore.getState().clearCart();
    expect(selectSaleLines(usePosCartStore.getState().lines)).toHaveLength(0);
    expect(usePosCartStore.getState().idempotencyKey).not.toBe(initialKey);
  });

  it("collects bill & line approval tokens into POST /api/invoices payload", () => {
    const bit = sali(8);
    const l = buildSaleLineFromProduct(bit, { warehouseId: 1, priceLevel: "retail", showContractorPrice: true });
    l.unit_price = 150;
    l.price_approval_token = "tok-price";
    l.stock_approval_token = "tok-stock";
    const u = buildUnlistedSaleLine({
      description: "Brass nipple",
      unit_price: 250,
      qty: 2,
      warehouseId: 1,
      scanned_barcode: "9990001",
      unlisted_approval_token: "tok-unlisted",
    });

    const payload = buildSaleInvoicePayload({
      customerId: 12,
      saleLines: [l, u],
      fees: { transport: 100, discount: 50, advance: 700 },
      paymentAmount: 700,
      paymentMethod: "Card",
      settleNow: true,
      jobSite: "Galle Rd Site",
      customerPo: "PO-884",
      billDiscountApprovalToken: "tok-disc",
    });

    expect(payload.settle_now).toBe(true);
    expect(payload.job_site).toBe("Galle Rd Site");
    expect(payload.customer_po).toBe("PO-884");
    expect(payload.payment).toEqual({ amount: 700, method: "Card" });
    expect(payload.approval_tokens).toEqual({
      price_change: "tok-price",
      negative_stock: "tok-stock",
      unlisted_item: "tok-unlisted",
      discount_over_limit: "tok-disc",
    });
  });

  it("parses both 409 price_changed and 409 out_of_stock response formats", () => {
    const pErr = parseSaleCheckoutError({
      status: 409,
      data: {
        code: "price_changed",
        data: { current_prices: [{ product_id: 1006, unit_id: null, requested_unit_price: 160, current_unit_price: 175 }] },
      },
    });
    expect(pErr.kind).toBe("price_changed");
    if (pErr.kind === "price_changed") {
      expect(pErr.changes[0]).toMatchObject({ product_id: 1006, from: 160, to: 175 });
    }

    const sErr = parseSaleCheckoutError({
      status: 409,
      data: { code: "out_of_stock", data: { code: "out_of_stock", product_id: 1006, warehouse_id: 1, available: 2, requested: 5 } },
    });
    expect(sErr.kind).toBe("out_of_stock");
    if (sErr.kind === "out_of_stock") {
      expect(sErr.items[0]).toMatchObject({ product_id: 1006, available_qty: 2, requested_qty: 5 });
    }
  });

  it("groups raw ungrouped to_sort sale lines by normalised description", async () => {
    const spy = vi.spyOn(axiosApi, "get").mockResolvedValueOnce({
      status: "success",
      data: {
        tab: "to_sort",
        total: 2,
        items: [
          { sale_line_id: 11, description: "Black tape ", qty: 2, unit_price: 180, scanned_barcode: "479100", Invoice: { invoice_id: 10, invoice_number: "INV-10", issued_date: "2026-11-23T09:00:00Z" } },
          { sale_line_id: 12, description: "black tape", qty: 3, unit_price: 200, Invoice: { invoice_id: 11, invoice_number: "INV-11", issued_date: "2026-11-23T11:00:00Z" } },
        ],
      },
    });

    const res = await fetchToSortDesk();
    expect(res.total).toBe(1);
    expect(res.groups[0]).toMatchObject({
      description: "Black tape",
      count: 2,
      total_qty: 5,
      last_price: 200,
      scanned_barcode: "479100",
      sale_line_ids: [11, 12],
    });
    expect(res.groups[0].bills).toHaveLength(2);
    spy.mockRestore();
  });
});
