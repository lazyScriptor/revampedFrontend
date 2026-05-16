import { useState } from 'react';
import { Box, Typography, Chip, TextField, InputAdornment, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useTenants } from '../hooks/useSuperAdminHooks';

const STATUS_DOT: Record<string, string> = {
    Active: '#10b981',
    Suspended: '#ef4444',
    Overdue: '#f59e0b',
};

const TIER_COLOR: Record<string, string> = {
    Basic: '#64748b',
    Pro: '#3b82f6',
    Enterprise: '#8b5cf6',
};

interface Props {
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export default function TenantListPanel({ selectedId, onSelect }: Props) {
    const { data: tenants = [], isLoading } = useTenants();
    const [search, setSearch] = useState('');

    const filtered = (tenants as any[]).filter((t) => {
        const q = search.toLowerCase();
        return (
            !q ||
            (t.display_name || '').toLowerCase().includes(q) ||
            t.db_name.toLowerCase().includes(q) ||
            (t.contact_email || '').toLowerCase().includes(q)
        );
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0f172a', borderRight: '1px solid #1e293b' }}>
            {/* Search */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid #1e293b' }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Search tenants…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 16, color: '#475569' }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#f1f5f9',
                            fontSize: '0.82rem',
                            bgcolor: '#1e293b',
                            '& fieldset': { borderColor: '#334155' },
                            '&:hover fieldset': { borderColor: '#475569' },
                            '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                        },
                    }}
                />
            </Box>

            {/* List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                        <CircularProgress size={20} sx={{ color: '#3b82f6' }} />
                    </Box>
                ) : filtered.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', pt: 4, fontSize: '0.8rem' }}>
                        No tenants found.
                    </Typography>
                ) : (
                    filtered.map((t: any) => {
                        const isSelected = t.tenant_id === selectedId;
                        return (
                            <Box
                                key={t.tenant_id}
                                onClick={() => onSelect(t.tenant_id)}
                                sx={{
                                    px: 2,
                                    py: 1.75,
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #1e293b',
                                    borderLeft: '3px solid',
                                    borderLeftColor: isSelected ? '#ef4444' : 'transparent',
                                    bgcolor: isSelected ? 'rgba(239,68,68,0.06)' : 'transparent',
                                    '&:hover': { bgcolor: isSelected ? 'rgba(239,68,68,0.08)' : 'rgba(30,41,59,0.6)' },
                                    transition: 'background-color 0.1s',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ color: isSelected ? '#f1f5f9' : '#cbd5e1', fontWeight: isSelected ? 700 : 500, fontSize: '0.82rem' }} noWrap>
                                        {t.display_name || t.db_name}
                                    </Typography>
                                    <FiberManualRecordIcon sx={{ fontSize: 8, color: STATUS_DOT[t.subscription_status] || '#64748b', flexShrink: 0, ml: 1 }} />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" sx={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.68rem' }} noWrap>
                                        {t.db_name}
                                    </Typography>
                                    <Chip
                                        label={t.tier}
                                        size="small"
                                        sx={{
                                            height: 14,
                                            fontSize: '0.58rem',
                                            color: TIER_COLOR[t.tier] || '#64748b',
                                            borderColor: TIER_COLOR[t.tier] || '#64748b',
                                            bgcolor: 'transparent',
                                            border: '1px solid',
                                            fontWeight: 600,
                                            '& .MuiChip-label': { px: 0.75 },
                                        }}
                                    />
                                </Box>
                                {t.monthly_rate > 0 && (
                                    <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.67rem', mt: 0.25, display: 'block' }}>
                                        LKR {Number(t.monthly_rate).toLocaleString()}/mo
                                    </Typography>
                                )}
                            </Box>
                        );
                    })
                )}
            </Box>
        </Box>
    );
}
