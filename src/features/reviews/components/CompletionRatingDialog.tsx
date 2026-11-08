import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Rating,
  TextField,
  Typography,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { useCreateReview, useInvoiceReviews } from "@/features/reviews/hooks/useInvoiceReviews";
import { useTranslation } from "react-i18next";

interface CompletionRatingDialogProps {
  open: boolean;
  invoiceId: number | null;
  customerName?: string | null;
  onClose: () => void;
  showToast: (message: string, severity?: "error" | "success" | "warning") => void;
}

// Shown once, right after an invoice is completed (Manage Orders -> Complete
// invoice). Staff rate the customer 1-5 stars; the comment is optional.
// The rating is saved as the primary InvoiceReview for this invoice
// (stage "return"), so the backend recomputes CUSTOMERS.rating exactly as
// the existing Reviews accordion does. Skipping leaves the rating untouched
// and never blocks completion — completion already succeeded before this
// dialog opens.
export function CompletionRatingDialog({
  open,
  invoiceId,
  customerName,
  onClose,
  showToast,
}: CompletionRatingDialogProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const { data: reviews = [], isLoading: loadingReviews } = useInvoiceReviews(invoiceId);
  const { mutate: createReview, isPending: saving } = useCreateReview(invoiceId ?? 0);

  // Start fresh every time the dialog opens for a (possibly different) invoice.
  useEffect(() => {
    if (!open) return;
    setRating(null);
    setComment("");
  }, [open, invoiceId]);

  const alreadyRated = reviews.some((r) => r.is_primary && r.rating !== null);

  const save = () => {
    if (!invoiceId || !rating) return;
    createReview(
      { rating, comment: comment.trim() || null, stage: "return", is_primary: true },
      {
        onSuccess: () => {
          showToast(t("invoices.CompletionRating.saved", { defaultValue: "Customer rating saved." }), "success");
          onClose();
        },
        onError: (e: any) =>
          showToast(e?.response?.data?.message || e?.message || t("errors.unexpected"), "error"),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t("invoices.CompletionRating.title", { defaultValue: "Rate this customer" })}
      </DialogTitle>
      <DialogContent>
        {loadingReviews ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : alreadyRated ? (
          <Typography variant="body2" color="text.secondary">
            {t("invoices.CompletionRating.alreadyRated", {
              defaultValue: "This invoice already has a customer rating.",
            })}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 0.5 }}>
            {customerName && (
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {customerName}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {t("invoices.CompletionRating.subtitle", {
                defaultValue: "How was this rental? Your rating updates the customer's Trust Score.",
              })}
            </Typography>
            <Rating
              value={rating}
              onChange={(_, v) => setRating(v)}
              size="large"
              icon={<StarIcon sx={{ color: "#f59e0b" }} fontSize="inherit" />}
              emptyIcon={<StarBorderIcon fontSize="inherit" />}
            />
            <TextField
              size="small"
              multiline
              minRows={2}
              label={t("reviews.ReviewThread.commentOptionalIfRatingSet")}
              placeholder={t("orders.reviewPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {!rating && (
              <Typography variant="caption" color="text.secondary">
                {t("invoices.CompletionRating.selectRating", {
                  defaultValue: "Tap a star to rate — the comment is optional.",
                })}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {alreadyRated ? (
          <Button onClick={onClose} variant="contained" disableElevation sx={{ textTransform: "none", fontWeight: 800 }}>
            {t("common.done", { defaultValue: "Done" })}
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving} color="inherit" sx={{ textTransform: "none" }}>
              {t("common.skip", { defaultValue: "Skip" })}
            </Button>
            <Button
              onClick={save}
              variant="contained"
              disableElevation
              disabled={!rating || saving || loadingReviews}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {saving ? <CircularProgress size={18} color="inherit" /> : t("orders.saveReview")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
