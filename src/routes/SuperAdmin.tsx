import React, { useState } from 'react';
import { Box, Typography, Tab, Tabs, Button, AppBar, Toolbar, IconButton, Tooltip } from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PlatformKpiCards from '@/features/super-admin/components/PlatformKpiCards';
import TenantManagerTable from '@/features/super-admin/components/TenantManagerTable';
import AuditLogTable from '@/features/super-admin/components/AuditLogTable';
import { usePlatformDashboard } from '@/features/super-admin/hooks/useSuperAdminHooks';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';

export default function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState(0);
    const { data: dashData, isLoading } = usePlatformDashboard();
    const logout = useSuperAdminStore((s) => s.logout);
    const admin = useSuperAdminStore((s) => s.admin);

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#020617' }}>
            {/* Top Bar */}
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    backgroundColor: '#0f172a',
                    borderBottom: '1px solid #1e293b',
                }}
            >
                <Toolbar variant="dense" sx={{ minHeight: 48 }}>
                    <ShieldOutlinedIcon sx={{ color: '#ef4444', mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 700, flexGrow: 1 }}>
                        GearGrid<Box component="span" sx={{ color: '#ef4444' }}>.</Box> Super Admin
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', mr: 2 }}>
                        {admin?.email}
                    </Typography>
                    <Tooltip title="Logout">
                        <IconButton onClick={logout} size="small" sx={{ color: '#94a3b8' }}>
                            <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            <Box sx={{ p: 3 }}>
                {/* KPI Cards */}
                <PlatformKpiCards data={dashData} isLoading={isLoading} />

                {/* Tab Navigation */}
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{
                        mt: 3,
                        mb: 2,
                        '& .MuiTab-root': {
                            color: '#64748b',
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            minHeight: 36,
                            px: 2,
                        },
                        '& .Mui-selected': { color: '#f1f5f9 !important' },
                        '& .MuiTabs-indicator': { backgroundColor: '#ef4444', height: 2 },
                    }}
                >
                    <Tab label="Tenant Manager" />
                    <Tab label="Audit Log" />
                </Tabs>

                {/* Tab Content */}
                {activeTab === 0 && <TenantManagerTable />}
                {activeTab === 1 && <AuditLogTable />}
            </Box>
        </Box>
    );
}
