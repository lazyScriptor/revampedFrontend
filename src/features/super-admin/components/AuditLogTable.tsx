import React, { useState } from 'react';
import { Box, Paper, Typography, Chip, Pagination } from '@mui/material';
import { useAuditLog } from '../hooks/useSuperAdminHooks';

const actionColors: Record<string, string> = {
    IMPERSONATION: '#ef4444',
    IMPERSONATION_STARTED: '#ef4444',
    TENANT_SUSPENDED: '#f59e0b',
    TENANT_UPDATED: '#3b82f6',
    LOGIN: '#10b981',
};

const AuditLogTable: React.FC = () => {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useAuditLog(page);

    const logs = data?.logs || [];
    const total = data?.totalItems || 0;
    const totalPages = Math.ceil(total / 50);

    return (
        <Paper
            elevation={0}
            sx={{
                border: '1px solid #1e293b',
                borderRadius: 2,
                backgroundColor: '#0f172a',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ p: 2, borderBottom: '1px solid #1e293b' }}>
                <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                    Audit Log
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {total} total events
                </Typography>
            </Box>

            {/* Header */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 2fr',
                    px: 2,
                    py: 1,
                    borderBottom: '1px solid #1e293b',
                    backgroundColor: 'rgba(30,41,59,0.5)',
                }}
            >
                {['Timestamp', 'Admin', 'Action', 'Tenant ID', 'Details'].map((h) => (
                    <Typography
                        key={h}
                        variant="caption"
                        sx={{
                            color: '#94a3b8',
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 600,
                        }}
                    >
                        {h}
                    </Typography>
                ))}
            </Box>

            {/* Rows */}
            {isLoading ? (
                <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>Loading...</Box>
            ) : logs.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>No audit events</Box>
            ) : (
                logs.map((log: Record<string, unknown>) => (
                    <Box
                        key={log.log_id as number}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.5fr 1fr 1fr 2fr',
                            px: 2,
                            py: 1.5,
                            alignItems: 'center',
                            borderBottom: '1px solid #1e293b',
                            '&:hover': { backgroundColor: 'rgba(30,41,59,0.3)' },
                        }}
                    >
                        <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {new Date(log.createdAt as string).toLocaleString()}
                        </Typography>

                        <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.8rem' }}>
                            {(log.SuperAdmin as Record<string, unknown>)?.display_name as string ||
                                (log.SuperAdmin as Record<string, unknown>)?.email as string || '—'}
                        </Typography>

                        <Box>
                            <Chip
                                label={(log.action as string).replace(/_/g, ' ')}
                                size="small"
                                sx={{
                                    backgroundColor: `${actionColors[log.action as string] || '#64748b'}20`,
                                    color: actionColors[log.action as string] || '#64748b',
                                    fontSize: '0.6rem',
                                    height: 20,
                                    fontWeight: 600,
                                }}
                            />
                        </Box>

                        <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {(log.target_tenant_id as number) || '—'}
                        </Typography>

                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                            {log.ip_address as string || '—'}
                        </Typography>
                    </Box>
                ))
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, v) => setPage(v)}
                        size="small"
                        sx={{
                            '& .MuiPaginationItem-root': { color: '#94a3b8' },
                            '& .Mui-selected': { backgroundColor: '#334155 !important' },
                        }}
                    />
                </Box>
            )}
        </Paper>
    );
};

export default AuditLogTable;
