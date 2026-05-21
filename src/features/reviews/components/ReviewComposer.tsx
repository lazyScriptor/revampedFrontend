import { useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Rating,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import {
  useCreateReview,
  ReviewStage,
} from "@/features/reviews/hooks/useInvoiceReviews";

interface ReviewComposerProps {
  invoiceId: number;
  onCreated?: () => void;
}

const STAGES: { value: ReviewStage; label: string }[] = [
  { value: "handover", label: "Handover" },
  { value: "return", label: "Return" },
  { value: "followup", label: "Follow-up" },
  { value: "adhoc", label: "Ad-hoc" },
];

export function ReviewComposer({ invoiceId, onCreated }: ReviewComposerProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [stage, setStage] = useState<ReviewStage>("return");
  const [isPrimary, setIsPrimary] = useState(true);
  const { mutate, isPending, error } = useCreateReview(invoiceId);

  const submit = () => {
    if (!rating && !comment.trim()) return;
    mutate(
      { rating, comment: comment.trim() || null, stage, is_primary: isPrimary },
      {
        onSuccess: () => {
          setRating(null);
          setComment("");
          setStage("return");
          setIsPrimary(true);
          onCreated?.();
        },
      },
    );
  };

  const errMsg = (error as any)?.message;

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid #e2e8f0",
        borderRadius: 2.5,
        bgcolor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 0.5, textTransform: "uppercase" }}>
        Add a review
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "row", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        <Rating
          value={rating}
          onChange={(_, v) => setRating(v)}
          icon={<StarIcon sx={{ color: "#f59e0b" }} fontSize="inherit" />}
          emptyIcon={<StarBorderIcon fontSize="inherit" />}
        />
        <TextField
          select
          size="small"
          label="Stage"
          value={stage}
          onChange={(e) => setStage(e.target.value as ReviewStage)}
          sx={{ minWidth: 140 }}
        >
          {STAGES.map((s) => (
            <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} size="small" />}
          label={<Typography variant="caption">Primary (averages into customer rating)</Typography>}
        />
      </Box>

      <TextField
        size="small"
        multiline
        minRows={2}
        placeholder="What happened on this rental? Late return, damaged unit, smooth pickup…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {errMsg && (
        <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
          {errMsg}
        </Typography>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          size="small"
          disableElevation
          disabled={isPending || (!rating && !comment.trim())}
          startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}
          onClick={submit}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
        >
          {isPending ? "Saving…" : "Save review"}
        </Button>
      </Box>
    </Box>
  );
}
