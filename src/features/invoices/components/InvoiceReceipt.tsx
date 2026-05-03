// features/invoices/components/InvoiceReceipt.tsx
import { Box, Typography } from "@mui/material";

export const InvoiceReceipt = ({
  invoice,
  id,
}: {
  invoice: any;
  id: string;
}) => {
  if (!invoice) return null;

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) || 1;
  };

  return (
    // display: 'none' keeps it hidden on your dashboard.
    // We removed the hardcoded '80mm' width here because the iframe handles it perfectly now.
    <Box id={id} sx={{ display: "none" }}>
      {/* HEADER */}
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", fontSize: "16px", color: "#000" }}
        >
          GEARGRID RENTALS
        </Typography>
        <Typography sx={{ fontSize: "11px", color: "#000" }}>
          123 Galle Road, Colombo | +94 11 234 5678
        </Typography>
        <hr />
        <Typography
          sx={{ fontWeight: "bold", fontSize: "12px", color: "#000" }}
        >
          INVOICE: INV-{invoice.invoice_id}
        </Typography>
        <Typography sx={{ fontSize: "11px", color: "#000" }}>
          Date: {new Date(invoice.issued_date).toLocaleString()}
        </Typography>
      </Box>

      {/* CLIENT INFO */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{ fontSize: "11px", color: "#000", fontWeight: "bold" }}
        >
          CLIENT:{" "}
          {invoice.Customer?.company_name ||
            `${invoice.Customer?.first_name} ${invoice.Customer?.last_name}`}
        </Typography>
        <Typography sx={{ fontSize: "11px", color: "#000" }}>
          PHONE: {invoice.Customer?.phone_number}
        </Typography>
      </Box>

      <hr />

      {/* ITEMS LIST */}
      <Box sx={{ mb: 2 }}>
        {invoice.InvoiceLines?.map((line: any) => {
          const days = calculateDays(
            line.borrow_date,
            line.expected_return_date,
          );
          const isDaily =
            Number(line.locked_minimum_days) <= 1 &&
            Number(line.locked_base_price) ===
              Number(line.locked_extra_daily_rate);

          return (
            <Box key={line.line_id} sx={{ mb: 1 }}>
              <Typography
                sx={{ fontSize: "12px", fontWeight: "bold", color: "#000" }}
              >
                {line.Equipment?.equipment_name}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: "11px", color: "#000" }}>
                  {line.borrow_quantity}x {days}d {isDaily ? "" : "(Tiered)"}
                </Typography>
                <Typography
                  sx={{ fontSize: "12px", color: "#000", fontWeight: "bold" }}
                >
                  Rs.{Number(line.line_total_amount).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <hr />

      {/* FINANCIAL TOTALS */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: "11px", color: "#000" }}>
            Subtotal:
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "#000" }}>
            Rs.{Number(invoice.sub_total).toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: "11px", color: "#000" }}>
            Transport:
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "#000" }}>
            +Rs.{Number(invoice.transport_fee).toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: "11px", color: "#000" }}>
            Discount:
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "#000" }}>
            -Rs.{Number(invoice.discount_amount).toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <Typography
            sx={{ fontSize: "14px", fontWeight: "bold", color: "#000" }}
          >
            TOTAL:
          </Typography>
          <Typography
            sx={{ fontSize: "14px", fontWeight: "bold", color: "#000" }}
          >
            Rs.{Number(invoice.total_amount).toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography sx={{ fontSize: "11px", color: "#000" }}>
            Paid to Date:
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "#000" }}>
            -Rs.
            {(
              invoice.Payments?.reduce(
                (sum: number, p: any) => sum + Number(p.payment_amount),
                0,
              ) || 0
            ).toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* FOOTER */}
      <Box sx={{ textAlign: "center", mt: 3 }}>
        <hr />
        <Typography sx={{ fontSize: "10px", color: "#000", mt: 1 }}>
          Thank you for choosing GearGrid!
        </Typography>
      </Box>
    </Box>
  );
};
