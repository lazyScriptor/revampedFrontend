import { useState } from 'react';
import {
    Box, Typography, Paper, TextField, Button, IconButton, Chip,
    Tooltip, CircularProgress, Alert,
} from '@mui/material';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { useGlobalCors, useUpdateGlobalCors } from '../hooks/useSuperAdminHooks';

export default function CorsManagerPanel() {
    const { data: origins = [], isLoading, refetch } = useGlobalCors();
    const updateMutation = useUpdateGlobalCors();

    const [localOrigins, setLocalOrigins] = useState<string[]>([]);
    const [newOrigin, setNewOrigin] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [saved, setSaved] = useState(false);

    // Sync from server when data loads
    const currentOrigins = isDirty ? localOrigins : (origins as string[]);

    const syncLocal = (list: string[]) => {
        setLocalOrigins(list);
        setIsDirty(true);
        setSaved(false);
    };

    const handleAdd = () => {
        const trimmed = newOrigin.trim().replace(/\/$/, '');
        if (!trimmed || currentOrigins.includes(trimmed)) return;
        syncLocal([...currentOrigins, trimmed]);
        setNewOrigin('');
    };

    const handleRemove = (origin: string) => {
        syncLocal(currentOrigins.filter((o) => o !== origin));
    };

    const handleSave = () => {
        updateMutation.mutate(currentOrigins, {
            onSuccess: () => {
                setIsDirty(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            },
        });
    };

    const handleReset = () => {
        setLocalOrigins([]);
        setIsDirty(false);
        refetch();
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header */}
            <Box>
                <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
                    CORS & Security
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Manage which frontend origins are allowed to connect to the GearGrid API. Changes take effect immediately without a server restart.
                </Typography>
            </Box>

            {saved && (
                <Alert severity="success" sx={{ borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                    CORS origins updated and applied live.
                </Alert>
            )}

            <Paper elevation={0} sx={{ bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, overflow: 'hidden' }}>
                {/* Panel header */}
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PublicOutlinedIcon sx={{ color: '#3b82f6', fontSize: 16 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 600 }}>Allowed Origins</Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {currentOrigins.length} origin{currentOrigins.length !== 1 ? 's' : ''} whitelisted
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {isDirty && (
                            <Tooltip title="Reset to last saved">
                                <IconButton size="small" onClick={handleReset} sx={{ color: '#94a3b8' }}>
                                    <RefreshOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                {/* Origin list */}
                <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={20} sx={{ color: '#3b82f6' }} />
                        </Box>
                    ) : currentOrigins.length === 0 ? (
                        <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 3 }}>
                            No origins configured. Add at least one origin.
                        </Typography>
                    ) : (
                        currentOrigins.map((origin) => (
                            <Box
                                key={origin}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: 2,
                                    py: 1.25,
                                    bgcolor: '#1e293b',
                                    borderRadius: 1.5,
                                    border: '1px solid #334155',
                                    '&:hover': { borderColor: '#475569' },
                                }}
                            >
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#93c5fd', fontSize: '0.82rem' }}>
                                    {origin}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {(origin.startsWith('https://') && !origin.includes('localhost')) && (
                                        <Chip label="production" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }} />
                                    )}
                                    {origin.includes('localhost') && (
                                        <Chip label="local" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }} />
                                    )}
                                    <Tooltip title="Remove origin">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleRemove(origin)}
                                            sx={{ color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' }, width: 24, height: 24 }}
                                        >
                                            <DeleteOutlinedIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>
                        ))
                    )}
                </Box>

                {/* Add new origin */}
                <Box sx={{ px: 2.5, pb: 2.5, display: 'flex', gap: 1.5 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="https://app.example.com"
                        value={newOrigin}
                        onChange={(e) => setNewOrigin(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#1e293b',
                                color: '#f1f5f9',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                '& fieldset': { borderColor: '#334155' },
                                '&:hover fieldset': { borderColor: '#475569' },
                                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                            },
                        }}
                    />
                    <Button
                        variant="outlined"
                        onClick={handleAdd}
                        disabled={!newOrigin.trim()}
                        startIcon={<AddIcon />}
                        sx={{ borderColor: '#334155', color: '#94a3b8', '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' }, whiteSpace: 'nowrap', minWidth: 100 }}
                    >
                        Add
                    </Button>
                </Box>
            </Paper>

            {/* Save bar */}
            {isDirty && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                    <Button onClick={handleReset} sx={{ color: '#64748b' }}>Discard Changes</Button>
                    <Button
                        variant="contained"
                        startIcon={updateMutation.isPending ? <CircularProgress size={14} /> : <SaveOutlinedIcon />}
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, fontWeight: 700 }}
                    >
                        Apply Changes Live
                    </Button>
                </Box>
            )}

            {/* Info box */}
            <Paper elevation={0} sx={{ bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: 2, p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}>
                    HOW CORS WORKS
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', lineHeight: 1.7 }}>
                    Cross-Origin Resource Sharing (CORS) controls which web applications can make API requests. Only add origins you control. Changes are applied in-process immediately — no server restart required. For production deployments with multiple processes, a restart is recommended to propagate changes across all instances.
                </Typography>
            </Paper>
        </Box>
    );
}
