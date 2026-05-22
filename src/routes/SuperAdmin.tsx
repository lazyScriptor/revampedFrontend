import { useState } from 'react';
import {
    Box, Typography, Tooltip, IconButton, Button,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';

import PlatformKpiCards from '@/features/super-admin/components/PlatformKpiCards';
import AuditLogTable from '@/features/super-admin/components/AuditLogTable';
import TenantListPanel from '@/features/super-admin/components/TenantListPanel';
import TenantDetailPanel from '@/features/super-admin/components/TenantDetailPanel';
import CorsManagerPanel from '@/features/super-admin/components/CorsManagerPanel';
import CreateTenantDialog from '@/features/super-admin/components/CreateTenantDialog';
import InquiryListPanel from '@/features/super-admin/components/InquiryListPanel';
import InquiryDetailPanel from '@/features/super-admin/components/InquiryDetailPanel';

import { usePlatformDashboard, useTenants, useInquiryStats } from '@/features/super-admin/hooks/useSuperAdminHooks';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';

// ─── Nav items ────────────────────────────────────────────────────────────────
type NavKey = 'dashboard' | 'tenants' | 'inquiries' | 'cors' | 'audit';

const NAV: { key: NavKey; icon: React.ReactNode; label: string }[] = [
    { key: 'dashboard', icon: <DashboardOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Dashboard' },
    { key: 'tenants', icon: <BusinessOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Tenants' },
    { key: 'inquiries', icon: <MailOutlineOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Inquiries' },
    { key: 'cors', icon: <PublicOutlinedIcon sx={{ fontSize: 18 }} />, label: 'CORS & Security' },
    { key: 'audit', icon: <HistoryOutlinedIcon sx={{ fontSize: 18 }} />, label: 'Audit Log' },
];

// ─── KPI extras ───────────────────────────────────────────────────────────────
function DashboardView() {
    const { data: dashData, isLoading } = usePlatformDashboard();
    const { data: tenants = [] } = useTenants();

    const overdue = (tenants as any[]).filter((t) => t.subscription_status === 'Overdue').length;
    const totalRevenue = (dashData as any)?.totalRevenuePaid || 0;
    const todayLabel = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#475569',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            display: 'block',
                            mb: 0.5,
                        }}
                    >
                        Platform Control
                    </Typography>
                    <Typography
                        variant="h5"
                        sx={{ color: '#f1f5f9', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}
                    >
                        Mission Control
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', mt: 0.5, display: 'block' }}>
                        Real-time overview of all tenant activity, revenue, and platform health.
                    </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.7rem', fontWeight: 600 }}>
                    {todayLabel}
                </Typography>
            </Box>

            {/* Primary KPIs */}
            <PlatformKpiCards data={dashData as any} isLoading={isLoading} />

            {/* Secondary KPI row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                {[
                    {
                        label: 'Overdue Accounts',
                        value: isLoading ? '—' : overdue.toString(),
                        hint: 'Past their billing date',
                        icon: <WarningAmberOutlinedIcon sx={{ fontSize: 22 }} />,
                        accent: '#f59e0b',
                        glow: 'rgba(245,158,11,0.20)',
                    },
                    {
                        label: 'Revenue Collected',
                        value: isLoading ? '—' : `LKR ${Number(totalRevenue).toLocaleString()}`,
                        hint: 'All-time platform receipts',
                        icon: <TrendingUpOutlinedIcon sx={{ fontSize: 22 }} />,
                        accent: '#10b981',
                        glow: 'rgba(16,185,129,0.20)',
                    },
                    {
                        label: 'Tier Mix',
                        value: isLoading
                            ? '—'
                            : ((dashData as any)?.tierBreakdown || []).map((t: any) => `${t.tier}: ${t.count}`).join(' · ') || '—',
                        hint: 'Workspaces by subscription tier',
                        icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 22 }} />,
                        accent: '#8b5cf6',
                        glow: 'rgba(139,92,246,0.20)',
                    },
                ].map((kpi) => (
                    <Box
                        key={kpi.label}
                        sx={{
                            position: 'relative',
                            p: 2.25,
                            borderRadius: 2,
                            border: '1px solid #1e293b',
                            bgcolor: '#0f172a',
                            overflow: 'hidden',
                            transition: 'border-color 150ms, transform 150ms',
                            '&:hover': { borderColor: kpi.accent, transform: 'translateY(-1px)' },
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: 3,
                                height: '100%',
                                bgcolor: kpi.accent,
                                opacity: 0.75,
                            },
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: -20,
                                right: -20,
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: kpi.glow,
                                filter: 'blur(20px)',
                                pointerEvents: 'none',
                            },
                        }}
                    >
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 1.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: kpi.glow,
                                    color: kpi.accent,
                                    border: `1px solid ${kpi.accent}33`,
                                    flexShrink: 0,
                                }}
                            >
                                {kpi.icon}
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: '#94a3b8',
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        display: 'block',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {kpi.label}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: '#f1f5f9',
                                        fontSize: '1.1rem',
                                        fontWeight: 800,
                                        lineHeight: 1.25,
                                        mt: 0.5,
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    {kpi.value}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: '#475569', fontSize: '0.62rem', mt: 0.5, display: 'block' }}
                                >
                                    {kpi.hint}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* Quick tenant status snapshot */}
            <Box sx={{ border: '1px solid #1e293b', borderRadius: 2, bgcolor: '#0f172a', overflow: 'hidden' }}>
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.75,
                        borderBottom: '1px solid #1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Box>
                        <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.88rem' }}>
                            Recent Tenants
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.66rem' }}>
                            Latest 8 workspaces — click "Tenants" to manage all
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.66rem', fontVariantNumeric: 'tabular-nums' }}>
                        {(tenants as any[]).length} total
                    </Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1fr 1.1fr', px: 2.5, py: 1, borderBottom: '1px solid #1e293b', bgcolor: 'rgba(30,41,59,0.5)' }}>
                    {['Name', 'Status', 'Tier', 'Monthly'].map((h) => (
                        <Typography key={h} variant="caption" sx={{ color: '#64748b', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{h}</Typography>
                    ))}
                </Box>
                {(tenants as any[]).slice(0, 8).map((t: any) => {
                    const statusColor = { Active: '#10b981', Suspended: '#ef4444', Overdue: '#f59e0b' }[t.subscription_status as string] || '#64748b';
                    const tierColor = { Basic: '#64748b', Pro: '#3b82f6', Enterprise: '#8b5cf6' }[t.tier as string] || '#64748b';
                    return (
                        <Box
                            key={t.tenant_id}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '2.2fr 1fr 1fr 1.1fr',
                                px: 2.5,
                                py: 1.25,
                                borderBottom: '1px solid #1e293b',
                                alignItems: 'center',
                                '&:hover': { bgcolor: 'rgba(30,41,59,0.4)' },
                                '&:last-of-type': { borderBottom: 0 },
                                transition: 'background-color 100ms',
                            }}
                        >
                            <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600 }} noWrap>
                                {t.display_name || t.db_name}
                            </Typography>
                            <Box>
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: 0.75,
                                        py: 0.2,
                                        borderRadius: 0.75,
                                        bgcolor: `${statusColor}18`,
                                        border: `1px solid ${statusColor}40`,
                                        color: statusColor,
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor }} />
                                    {t.subscription_status}
                                </Box>
                            </Box>
                            <Box>
                                <Box
                                    component="span"
                                    sx={{
                                        px: 0.75,
                                        py: 0.2,
                                        borderRadius: 0.75,
                                        border: `1px solid ${tierColor}55`,
                                        color: tierColor,
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    {t.tier}
                                </Box>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontVariantNumeric: 'tabular-nums', fontSize: '0.7rem' }}>
                                {t.monthly_rate > 0 ? `LKR ${Number(t.monthly_rate).toLocaleString()}` : '—'}
                            </Typography>
                        </Box>
                    );
                })}
                {(tenants as any[]).length === 0 && !isLoading && (
                    <Box sx={{ py: 4, textAlign: 'center', color: '#475569' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>No tenants yet</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.66rem' }}>
                            Create the first tenant from the Tenants tab.
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
    const [activeNav, setActiveNav] = useState<NavKey>('dashboard');
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const logout = useSuperAdminStore((s) => s.logout);
    const admin = useSuperAdminStore((s) => s.admin);

    // Unread badge for the nav. Polls every 60s so a new inquiry surfaces
    // without requiring the admin to refresh. Cheap query — single row + counts.
    const { data: stats } = useInquiryStats();
    const newInquiryCount = stats?.byStatus?.new ?? 0;

    return (
        <>
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#020617', overflow: 'hidden' }}>
            {/* ── Left Sidebar ─────────────────────────────────────── */}
            <Box
                sx={{
                    width: { xs: 180, md: 220 },
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: '#020617',
                    borderRight: '1px solid #1e293b',
                }}
            >
                {/* Logo */}
                <Box sx={{ px: 2.5, py: 2.5, borderBottom: '1px solid #1e293b' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ShieldOutlinedIcon sx={{ color: '#ef4444', fontSize: 16 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 800, lineHeight: 1.1, fontSize: '0.85rem' }}>
                                GearGrid<Box component="span" sx={{ color: '#ef4444' }}>.</Box>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.62rem', letterSpacing: '0.05em' }}>
                                SUPER ADMIN
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Nav */}
                <Box sx={{ flex: 1, py: 1.5, px: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {NAV.map(({ key, icon, label }) => {
                        const isActive = activeNav === key;
                        return (
                            <Box
                                key={key}
                                onClick={() => setActiveNav(key)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    px: 1.5,
                                    py: 1.1,
                                    borderRadius: 1.5,
                                    cursor: 'pointer',
                                    color: isActive ? '#f1f5f9' : '#64748b',
                                    bgcolor: isActive ? 'rgba(239,68,68,0.1)' : 'transparent',
                                    borderLeft: '2px solid',
                                    borderLeftColor: isActive ? '#ef4444' : 'transparent',
                                    '&:hover': {
                                        bgcolor: isActive ? 'rgba(239,68,68,0.12)' : 'rgba(30,41,59,0.6)',
                                        color: isActive ? '#f1f5f9' : '#94a3b8',
                                    },
                                    transition: 'all 0.1s',
                                }}
                            >
                                {icon}
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, flex: 1 }}>
                                    {label}
                                </Typography>
                                {key === 'inquiries' && newInquiryCount > 0 && (
                                    <Box
                                        sx={{
                                            minWidth: 18,
                                            height: 18,
                                            px: 0.75,
                                            borderRadius: 9,
                                            bgcolor: '#ef4444',
                                            color: '#fff',
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {newInquiryCount > 99 ? '99+' : newInquiryCount}
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>

                {/* Bottom: admin info + logout */}
                <Box sx={{ borderTop: '1px solid #1e293b', px: 2, py: 1.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, display: 'block', fontSize: '0.72rem' }} noWrap>
                                {admin?.displayName || 'Super Admin'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.66rem' }} noWrap>
                                {admin?.email}
                            </Typography>
                        </Box>
                        <Tooltip title="Logout">
                            <IconButton
                                size="small"
                                onClick={logout}
                                sx={{ color: '#64748b', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' }, ml: 0.5 }}
                            >
                                <LogoutOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>

            {/* ── Main Content ─────────────────────────────────────── */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Content area */}
                {activeNav === 'dashboard' && (
                    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                        <DashboardView />
                    </Box>
                )}

                {activeNav === 'cors' && (
                    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                        <CorsManagerPanel />
                    </Box>
                )}

                {activeNav === 'audit' && (
                    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                        <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 1 }}>Audit Log</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 3 }}>Full history of every Super Admin action across the platform.</Typography>
                        <AuditLogTable />
                    </Box>
                )}

                {activeNav === 'inquiries' && (
                    <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        {/* Inquiry list — fixed width like the tenant list */}
                        <Box sx={{ width: 320, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #1e293b', bgcolor: '#0f172a', flexShrink: 0 }}>
                                <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.82rem' }}>
                                    Contact Inquiries
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>
                                    From geargrid.live/contact
                                </Typography>
                            </Box>
                            <InquiryListPanel
                                selectedId={selectedInquiryId}
                                onSelect={(id) => setSelectedInquiryId(id)}
                            />
                        </Box>

                        {/* Inquiry detail */}
                        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {selectedInquiryId ? (
                                <InquiryDetailPanel inquiryId={selectedInquiryId} />
                            ) : (
                                <Box sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1.5,
                                    color: '#334155',
                                }}>
                                    <MailOutlineOutlinedIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Select an inquiry</Typography>
                                    <Typography variant="caption" sx={{ color: '#475569' }}>
                                        Pick an inquiry from the list to triage, reply, and update its status.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                {activeNav === 'tenants' && (
                    <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        {/* Tenant List — fixed width */}
                        <Box sx={{ width: 280, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {/* Panel header */}
                            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid #1e293b', bgcolor: '#0f172a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.82rem' }}>
                                    All Tenants
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<AddOutlinedIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => setCreateDialogOpen(true)}
                                    sx={{
                                        color: '#ef4444',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        px: 1,
                                        py: 0.5,
                                        minWidth: 0,
                                        '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' },
                                    }}
                                >
                                    New
                                </Button>
                            </Box>
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <TenantListPanel
                                    selectedId={selectedTenantId}
                                    onSelect={(id) => setSelectedTenantId(id)}
                                />
                            </Box>
                        </Box>

                        {/* Tenant Detail — fills remaining space */}
                        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {selectedTenantId ? (
                                <TenantDetailPanel tenantId={selectedTenantId} />
                            ) : (
                                <Box sx={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1.5,
                                    color: '#334155',
                                }}>
                                    <BusinessOutlinedIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>Select a tenant</Typography>
                                    <Typography variant="caption" sx={{ color: '#475569' }}>
                                        Click a tenant in the list to view and manage its configuration.
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>

        <CreateTenantDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onCreated={(id) => {
                setCreateDialogOpen(false);
                setActiveNav('tenants');
                setSelectedTenantId(id);
            }}
        />
        </>
    );
}
