import React from 'react';
import { Box, Typography } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PermissionMatrix from '@/features/permissions/components/PermissionMatrix';

export default function PermissionsPage() {
    return (
        <Box sx={{ p: 0 }}>
            {/* Page Header */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 20, color: '#64748b' }} />
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                        Permission Matrix
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                        Configure role-based and user-level permissions
                    </Typography>
                </Box>
            </Box>

            <PermissionMatrix />
        </Box>
    );
}
