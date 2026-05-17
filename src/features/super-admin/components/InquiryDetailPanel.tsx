import { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Chip,
    Button,
    TextField,
    CircularProgress,
    IconButton,
    Tooltip,
    Divider,
} from "@mui/material";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import RouterOutlinedIcon from "@mui/icons-material/RouterOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import {
    useInquiry,
    useUpdateInquiry,
    useDeleteInquiry,
} from "../hooks/useSuperAdminHooks";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/AppToast";

// Status workflow: new → contacted → qualified → closed
// Each step is one-click. We don't lock backwards moves — sometimes triage
// notes turn an old "closed" inquiry back into a "contacted" one.
const STATUS_FLOW: Array<{
    value: "new" | "contacted" | "qualified" | "closed";
    label: string;
    color: string;
}> = [
    { value: "new", label: "New", color: "#3b82f6" },
    { value: "contacted", label: "Contacted", color: "#f59e0b" },
    { value: "qualified", label: "Qualified", color: "#10b981" },
    { value: "closed", label: "Closed", color: "#64748b" },
];

interface Props {
    inquiryId: number;
}

export default function InquiryDetailPanel({ inquiryId }: Props) {
    const { data: inquiry, isLoading } = useInquiry(inquiryId);
    const updateMut = useUpdateInquiry();
    const deleteMut = useDeleteInquiry();
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const { showSuccess, showError } = useToast();

    const [notes, setNotes] = useState("");
    const [notesDirty, setNotesDirty] = useState(false);

    // Reset notes when switching inquiries.
    useEffect(() => {
        setNotes(inquiry?.internal_notes ?? "");
        setNotesDirty(false);
    }, [inquiry?.inquiry_id, inquiry?.internal_notes]);

    if (isLoading || !inquiry) {
        return (
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress size={20} />
            </Box>
        );
    }

    const handleStatus = (status: typeof STATUS_FLOW[number]["value"]) => {
        if (status === inquiry.status) return;
        updateMut.mutate(
            { id: inquiry.inquiry_id, status },
            {
                onSuccess: () => showSuccess(`Marked as ${status}.`),
                onError: (err: Error) => showError(err.message),
            },
        );
    };

    const handleSaveNotes = () => {
        updateMut.mutate(
            { id: inquiry.inquiry_id, internal_notes: notes || null },
            {
                onSuccess: () => {
                    setNotesDirty(false);
                    showSuccess("Notes saved.");
                },
                onError: (err: Error) => showError(err.message),
            },
        );
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: "Delete this inquiry?",
            message:
                "This permanently removes the inquiry record. Use Close status instead if you want to keep a paper trail.",
            confirmLabel: "Delete",
            severity: "error",
        });
        if (!ok) return;
        deleteMut.mutate(inquiry.inquiry_id, {
            onSuccess: () => showSuccess("Inquiry deleted."),
            onError: (err: Error) => showError(err.message),
        });
    };

    const mailtoUrl = (() => {
        const subject = `Re: your ${inquiry.inquiry_type} inquiry to GearGrid`;
        const body = `Hi ${inquiry.name.split(" ")[0]},\n\nThanks for reaching out to GearGrid.\n\n[your reply here]\n\nFor reference, your original message:\n${inquiry.message?.split("\n").map((l) => `> ${l}`).join("\n") ?? ""}\n\n— The GearGrid team`;
        const params = new URLSearchParams({ subject, body });
        return `mailto:${inquiry.email}?${params.toString()}`;
    })();

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showSuccess(`${label} copied.`);
        } catch {
            showError("Copy failed — your browser blocked it.");
        }
    };

    return (
        <Box
            sx={{
                flex: 1,
                overflow: "auto",
                bgcolor: "#020617",
                color: "#e2e8f0",
            }}
        >
            <Box sx={{ maxWidth: 920, mx: "auto", p: { xs: 2, md: 3.5 } }}>
                {/* Header */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: { xs: "flex-start", md: "center" },
                        flexDirection: { xs: "column", md: "row" },
                        gap: 2,
                        mb: 3,
                    }}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: "#f1f5f9",
                                fontWeight: 700,
                                lineHeight: 1.2,
                            }}
                        >
                            {inquiry.name}
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mt: 0.5,
                            }}
                        >
                            <Chip
                                label={inquiry.inquiry_type}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: "0.65rem",
                                    fontWeight: 600,
                                    bgcolor: "#1e293b",
                                    color: "#cbd5e1",
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{ color: "#64748b" }}
                            >
                                #{inquiry.inquiry_id} ·{" "}
                                {new Date(inquiry.createdAt).toLocaleString()}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                <MailOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                            }
                            href={mailtoUrl}
                            sx={{
                                bgcolor: "#3b82f6",
                                textTransform: "none",
                                fontWeight: 600,
                                "&:hover": { bgcolor: "#2563eb" },
                            }}
                        >
                            Reply
                        </Button>
                        <Tooltip title="Delete inquiry">
                            <IconButton
                                size="small"
                                onClick={handleDelete}
                                disabled={deleteMut.isPending}
                                sx={{
                                    color: "#ef4444",
                                    border: "1px solid #1e293b",
                                    borderRadius: 1.5,
                                    "&:hover": {
                                        bgcolor: "rgba(239,68,68,0.12)",
                                    },
                                }}
                            >
                                <DeleteOutlineOutlinedIcon
                                    sx={{ fontSize: 18 }}
                                />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Status workflow */}
                <SectionCard title="Status">
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {STATUS_FLOW.map((s) => {
                            const active = s.value === inquiry.status;
                            return (
                                <Button
                                    key={s.value}
                                    size="small"
                                    disabled={updateMut.isPending}
                                    onClick={() => handleStatus(s.value)}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "0.72rem",
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1.5,
                                        color: active ? "#0f172a" : s.color,
                                        bgcolor: active ? s.color : "transparent",
                                        border: `1px solid ${s.color}55`,
                                        "&:hover": {
                                            bgcolor: active
                                                ? s.color
                                                : `${s.color}1a`,
                                        },
                                    }}
                                >
                                    {s.label}
                                </Button>
                            );
                        })}
                    </Box>
                </SectionCard>

                {/* Contact details */}
                <SectionCard title="Contact">
                    <Box sx={{ display: "grid", gap: 1.25 }}>
                        <DetailRow
                            icon={
                                <MailOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                            }
                            label="Email"
                            value={inquiry.email}
                            onCopy={() =>
                                copyToClipboard(inquiry.email, "Email")
                            }
                        />
                        {inquiry.phone && (
                            <DetailRow
                                icon={<PhoneOutlinedIcon sx={{ fontSize: 16 }} />}
                                label="Phone"
                                value={inquiry.phone}
                                onCopy={() =>
                                    copyToClipboard(inquiry.phone!, "Phone")
                                }
                                hrefPrefix="tel:"
                            />
                        )}
                        {inquiry.company && (
                            <DetailRow
                                icon={
                                    <BusinessOutlinedIcon sx={{ fontSize: 16 }} />
                                }
                                label="Company"
                                value={inquiry.company}
                            />
                        )}
                    </Box>
                </SectionCard>

                {/* Message */}
                <SectionCard title="Message">
                    <Typography
                        sx={{
                            color: "#e2e8f0",
                            fontSize: "0.86rem",
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.6,
                        }}
                    >
                        {inquiry.message}
                    </Typography>
                </SectionCard>

                {/* Internal notes — admin-only */}
                <SectionCard
                    title="Internal notes"
                    subtitle="Visible only to super admins. Use for triage context, follow-up reminders, etc."
                >
                    <TextField
                        multiline
                        minRows={3}
                        maxRows={10}
                        fullWidth
                        value={notes}
                        onChange={(e) => {
                            setNotes(e.target.value);
                            setNotesDirty(
                                e.target.value !== (inquiry.internal_notes ?? ""),
                            );
                        }}
                        placeholder="No notes yet…"
                        sx={{
                            "& .MuiInputBase-root": {
                                bgcolor: "#020617",
                                color: "#e2e8f0",
                                fontSize: "0.85rem",
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "#1e293b",
                            },
                        }}
                    />
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            mt: 1.5,
                        }}
                    >
                        <Button
                            size="small"
                            variant="contained"
                            disabled={!notesDirty || updateMut.isPending}
                            onClick={handleSaveNotes}
                            startIcon={
                                <SaveOutlinedIcon sx={{ fontSize: 16 }} />
                            }
                            sx={{
                                bgcolor: "#3b82f6",
                                textTransform: "none",
                                fontWeight: 600,
                                "&:hover": { bgcolor: "#2563eb" },
                            }}
                        >
                            {updateMut.isPending ? "Saving…" : "Save notes"}
                        </Button>
                    </Box>
                </SectionCard>

                {/* Spam triage context — collapsed by default-ish via styling */}
                <SectionCard
                    title="Audit context"
                    subtitle="Captured at submission time — useful for spam triage."
                >
                    <Box
                        sx={{
                            display: "grid",
                            gap: 1,
                            color: "#94a3b8",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                        }}
                    >
                        <Row k="IP" v={inquiry.source_ip ?? "—"} />
                        <Row k="Referrer" v={inquiry.referrer ?? "—"} />
                        <Row k="User agent" v={inquiry.user_agent ?? "—"} />
                        <Row k="Updated" v={new Date(inquiry.updatedAt).toLocaleString()} />
                    </Box>
                </SectionCard>
            </Box>
            <ConfirmDialog />
        </Box>
    );
}

// ── small composable bits ──
function SectionCard({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <Box
            sx={{
                border: "1px solid #1e293b",
                borderRadius: 2,
                bgcolor: "#0f172a",
                p: 2.25,
                mb: 2,
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    display: "block",
                }}
            >
                {title}
            </Typography>
            {subtitle && (
                <Typography
                    variant="caption"
                    sx={{
                        color: "#64748b",
                        fontSize: "0.68rem",
                        display: "block",
                        mb: 1.5,
                    }}
                >
                    {subtitle}
                </Typography>
            )}
            {!subtitle && <Divider sx={{ borderColor: "#1e293b", my: 1.25 }} />}
            {children}
        </Box>
    );
}

function DetailRow({
    icon,
    label,
    value,
    onCopy,
    hrefPrefix,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    onCopy?: () => void;
    hrefPrefix?: string;
}) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ color: "#64748b", flexShrink: 0 }}>{icon}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="caption"
                    sx={{ color: "#64748b", display: "block", fontSize: "0.65rem" }}
                >
                    {label}
                </Typography>
                {hrefPrefix ? (
                    <a
                        href={`${hrefPrefix}${value}`}
                        style={{
                            color: "#e2e8f0",
                            fontSize: "0.85rem",
                            textDecoration: "none",
                        }}
                    >
                        {value}
                    </a>
                ) : (
                    <Typography
                        sx={{ color: "#e2e8f0", fontSize: "0.85rem" }}
                    >
                        {value}
                    </Typography>
                )}
            </Box>
            {onCopy && (
                <Tooltip title={`Copy ${label.toLowerCase()}`}>
                    <IconButton
                        size="small"
                        onClick={onCopy}
                        sx={{
                            color: "#64748b",
                            "&:hover": { color: "#f1f5f9" },
                        }}
                    >
                        <ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "100px 1fr",
                gap: 1.5,
                alignItems: "start",
            }}
        >
            <Typography
                sx={{
                    color: "#64748b",
                    fontSize: "0.7rem",
                    fontFamily: "monospace",
                }}
            >
                {k}
            </Typography>
            <Typography
                sx={{
                    color: "#cbd5e1",
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                }}
            >
                {v}
            </Typography>
        </Box>
    );
}
