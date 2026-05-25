import { useState } from "react";
import {
  Box,
  Typography,
  Rating,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  TextField,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatDisplayDate } from "@/lib/dates";
import {
  InvoiceReview,
  useDeleteReview,
  useUpdateReview,
} from "@/features/reviews/hooks/useInvoiceReviews";
import { useTranslation } from "react-i18next";

interface ReviewThreadProps {
  invoiceId: number;
  reviews: InvoiceReview[];
  isLoading?: boolean;
}

const STAGE_LABELS: Record<InvoiceReview["stage"], string> = {
  handover: "Handover",
  return: "Return",
  followup: "Follow-up",
  adhoc: "Ad-hoc",
};

export function ReviewThread({ invoiceId, reviews, isLoading }: ReviewThreadProps) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {[0, 1].map((i) => (
          <Skeleton key={i} variant="rounded" height={92} />
        ))}
      </Box>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Box
        sx={{
          py: 4,
          textAlign: "center",
          border: "1px dashed #e2e8f0",
          borderRadius: 2,
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">{t("orders.noReviewsYet")}</Typography>
        <Typography variant="caption">{t("orders.addFirstReview")}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {reviews.map((r) => (
        <ReviewRow key={r.review_id} invoiceId={invoiceId} review={r} />
      ))}
    </Box>
  );
}

function ReviewRow({ invoiceId, review }: { invoiceId: number; review: InvoiceReview }) {
  const myUserId = useAuthStore((s) => s.user?.id);
  const canEdit = myUserId === review.author_user_id;
  const [editing, setEditing] = useState(false);
  const [draftRating, setDraftRating] = useState<number | null>(review.rating);
  const [draftComment, setDraftComment] = useState(review.comment || "");
  const { mutate: updateReview, isPending: saving } = useUpdateReview(invoiceId);
  const { mutate: deleteReview, isPending: deleting } = useDeleteReview(invoiceId);

  const save = () => {
    updateReview(
      { reviewId: review.review_id, draft: { rating: draftRating, comment: draftComment.trim() || null } },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <Box
      sx={{
        p: 1.75,
        border: "1px solid #e2e8f0",
        borderRadius: 2,
        bgcolor: "white",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          {review.rating !== null ? (
            <Rating value={review.rating} readOnly size="small" icon={<StarIcon sx={{ color: "#f59e0b" }} fontSize="inherit" />} />
          ) : (
            <Chip size="small" label="Comment" variant="outlined" sx={{ fontWeight: 700, height: 22 }} />
          )}
          <Chip size="small" label={STAGE_LABELS[review.stage]} sx={{ height: 22, fontWeight: 700, bgcolor: "#eff6ff", color: "#1d4ed8" }} />
          {review.is_primary && <Chip size="small" label="Primary" sx={{ height: 22, fontWeight: 700, bgcolor: "#ecfdf5", color: "#047857" }} />}
        </Box>
        <Box sx={{ display: "flex", flexDirection: "row", gap: 0.5, alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {review.Author
              ? `${review.Author.first_name || ""} ${review.Author.last_name || ""}`.trim() || "Staff"
              : "Staff"}
            {" · "}
            {formatDisplayDate(review.createdAt)}
          </Typography>
          {canEdit && !editing && (
            <>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => setEditing(true)}>
                  <EditIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" disabled={deleting} onClick={() => deleteReview(review.review_id)}>
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {editing ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Rating
            value={draftRating}
            onChange={(_, v) => setDraftRating(v)}
            size="small"
            icon={<StarIcon sx={{ color: "#f59e0b" }} fontSize="inherit" />}
          />
          <TextField
            size="small"
            multiline
            minRows={2}
            value={draftComment}
            onChange={(e) => setDraftComment(e.target.value)}
            placeholder="Comment (optional if rating set)"
          />
          <Box sx={{ display: "flex", flexDirection: "row", gap: 1, justifyContent: "flex-end" }}>
            <Button
              size="small"
              startIcon={<CloseIcon />}
              onClick={() => {
                setEditing(false);
                setDraftRating(review.rating);
                setDraftComment(review.comment || "");
              }}
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              disableElevation
              startIcon={<SaveIcon />}
              onClick={save}
              disabled={saving || (!draftRating && !draftComment.trim())}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Save
            </Button>
          </Box>
        </Box>
      ) : (
        review.comment && (
          <Typography variant="body2" sx={{ color: "#0f172a", whiteSpace: "pre-wrap" }}>
            {review.comment}
          </Typography>
        )
      )}
    </Box>
  );
}
