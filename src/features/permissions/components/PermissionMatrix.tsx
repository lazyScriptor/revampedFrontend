import React, { useState, useMemo } from 'react';
import {
    Box, Paper, Typography, Checkbox, Chip, Button, Tooltip,
    IconButton, Select, MenuItem, FormControl, InputLabel, Alert,
} from '@mui/material';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Permission {
    permission_id: number;
    permission_code: string;
    module_name: string;
    description?: string;
}
interface RoleData {
    role_id: number;
    role_name: string;
    Permissions: Permission[];
}
interface Override {
    id: number;
    user_id: number;
    permission_id: number;
    grant_type: 'grant' | 'revoke';
    User: { user_id: number; username: string };
    Permission: { permission_id: number; permission_code: string };
}
interface UserData {
    user_id: number;
    username: string;
    first_name: string;
    last_name: string;
    Roles: { role_id: number; role_name: string }[];
}

const PermissionMatrix: React.FC = () => {
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['permission-matrix'],
        queryFn: async () => {
            const res = await api.get('/permission-management/matrix');
            return res.data;
        },
    });

    const overrideMutation = useMutation({
        mutationFn: async (body: { userId: number; permissionId: number; grantType: string }) => {
            await api.post('/permission-management/user-override', body);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['permission-matrix'] }),
    });

    const removeOverrideMutation = useMutation({
        mutationFn: async (body: { userId: number; permissionId: number }) => {
            await api.delete('/permission-management/user-override', { data: body });
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['permission-matrix'] }),
    });

    const cloneMutation = useMutation({
        mutationFn: async (body: { sourceRoleId: number; targetRoleId: number }) => {
            await api.post('/permission-management/clone-role', body);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['permission-matrix'] }),
    });

    const [cloneFrom, setCloneFrom] = useState<number | ''>('');
    const [cloneTo, setCloneTo] = useState<number | ''>('');
    const [selectedUser, setSelectedUser] = useState<number | ''>('');

    const permissions: Permission[] = data?.permissions || [];
    const roles: RoleData[] = data?.roles || [];
    const overrides: Override[] = data?.overrides || [];
    const users: UserData[] = data?.users || [];

    // Group permissions by module
    const groupedPermissions = useMemo(() => {
        const groups: Record<string, Permission[]> = {};
        permissions.forEach((p) => {
            if (!groups[p.module_name]) groups[p.module_name] = [];
            groups[p.module_name].push(p);
        });
        return groups;
    }, [permissions]);

    // Build role permission lookup: { roleId: Set<permissionId> }
    const rolePermMap = useMemo(() => {
        const map: Record<number, Set<number>> = {};
        roles.forEach((r) => {
            map[r.role_id] = new Set(r.Permissions?.map((p: Permission) => p.permission_id) || []);
        });
        return map;
    }, [roles]);

    // Build user override lookup: { `${userId}-${permissionId}`: Override }
    const overrideMap = useMemo(() => {
        const map: Record<string, Override> = {};
        overrides.forEach((o) => {
            map[`${o.user_id}-${o.permission_id}`] = o;
        });
        return map;
    }, [overrides]);

    const selectedUserData = users.find((u) => u.user_id === selectedUser);
    const selectedUserRoles = selectedUserData?.Roles?.map((r) => r.role_id) || [];

    // Check if a user has permission from their roles
    const userHasFromRole = (userId: number, permId: number) => {
        const user = users.find((u) => u.user_id === userId);
        if (!user) return false;
        return user.Roles?.some((r) => rolePermMap[r.role_id]?.has(permId)) || false;
    };

    const handleRolePermToggle = async (roleId: number, permissionIds: number[], checked: boolean) => {
        // Update role permissions via existing API
        const role = roles.find((r) => r.role_id === roleId);
        if (!role) return;
        const currentPerms = new Set(role.Permissions?.map((p: Permission) => p.permission_id) || []);

        permissionIds.forEach((id) => {
            if (checked) currentPerms.add(id);
            else currentPerms.delete(id);
        });

        await api.post(`/roles/${roleId}/permissions`, {
            permissionIds: Array.from(currentPerms),
        });
        qc.invalidateQueries({ queryKey: ['permission-matrix'] });
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>
                Loading permission matrix...
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Clone & User Select Toolbar */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                {/* Clone Permissions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ContentCopyOutlinedIcon sx={{ fontSize: 16, color: '#64748b' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        Clone:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>From Role</InputLabel>
                        <Select
                            value={cloneFrom}
                            label="From Role"
                            onChange={(e) => setCloneFrom(e.target.value as number)}
                            sx={{ fontSize: '0.75rem' }}
                        >
                            {roles.map((r) => (
                                <MenuItem key={r.role_id} value={r.role_id} sx={{ fontSize: '0.75rem' }}>
                                    {r.role_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>→</Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>To Role</InputLabel>
                        <Select
                            value={cloneTo}
                            label="To Role"
                            onChange={(e) => setCloneTo(e.target.value as number)}
                            sx={{ fontSize: '0.75rem' }}
                        >
                            {roles.map((r) => (
                                <MenuItem key={r.role_id} value={r.role_id} sx={{ fontSize: '0.75rem' }}>
                                    {r.role_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={!cloneFrom || !cloneTo || cloneFrom === cloneTo}
                        onClick={() => {
                            if (cloneFrom && cloneTo) {
                                cloneMutation.mutate({
                                    sourceRoleId: cloneFrom as number,
                                    targetRoleId: cloneTo as number,
                                });
                            }
                        }}
                        sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                    >
                        Clone
                    </Button>
                </Box>

                <Box sx={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

                {/* User Override Selector */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonOutlinedIcon sx={{ fontSize: 16, color: '#64748b' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        User Override:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>Select User</InputLabel>
                        <Select
                            value={selectedUser}
                            label="Select User"
                            onChange={(e) => setSelectedUser(e.target.value as number)}
                            sx={{ fontSize: '0.75rem' }}
                        >
                            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                                <em>None</em>
                            </MenuItem>
                            {users.map((u) => (
                                <MenuItem key={u.user_id} value={u.user_id} sx={{ fontSize: '0.75rem' }}>
                                    {u.username} ({u.first_name} {u.last_name})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            {/* Matrix Table */}
            <Paper
                elevation={0}
                sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    overflow: 'auto',
                }}
            >
                {/* Header Row */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: `2.5fr repeat(${roles.length}, 1fr) ${selectedUser ? '1fr' : ''}`,
                        borderBottom: '2px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                    }}
                >
                    <Box sx={{ p: 1.5, pl: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Permission
                        </Typography>
                    </Box>
                    {roles.map((r) => (
                        <Box key={r.role_id} sx={{ p: 1.5, textAlign: 'center' }}>
                            <Chip
                                label={r.role_name}
                                size="small"
                                sx={{ fontSize: '0.65rem', fontWeight: 600, height: 22 }}
                            />
                        </Box>
                    ))}
                    {selectedUser && selectedUserData && (
                        <Box sx={{ p: 1.5, textAlign: 'center' }}>
                            <Chip
                                icon={<PersonOutlinedIcon sx={{ fontSize: 12 }} />}
                                label={selectedUserData.username}
                                size="small"
                                color="primary"
                                sx={{ fontSize: '0.65rem', fontWeight: 600, height: 22 }}
                            />
                        </Box>
                    )}
                </Box>

                {/* Permission Rows grouped by module */}
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <React.Fragment key={module}>
                        {/* Module Header */}
                        <Box
                            sx={{
                                p: 1,
                                pl: 2,
                                backgroundColor: '#f1f5f9',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'grid',
                                gridTemplateColumns: `2.5fr repeat(${roles.length}, 1fr) ${selectedUser ? '1fr' : ''}`,
                            }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase' }}>
                                {module}
                            </Typography>
                        </Box>

                        {/* Individual Permissions */}
                        {perms.map((perm) => (
                            <Box
                                key={perm.permission_id}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `2.5fr repeat(${roles.length}, 1fr) ${selectedUser ? '1fr' : ''}`,
                                    borderBottom: '1px solid #f1f5f9',
                                    '&:hover': { backgroundColor: '#fafbfc' },
                                    alignItems: 'center',
                                }}
                            >
                                <Box sx={{ px: 2, py: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#334155' }}>
                                        {perm.permission_code}
                                    </Typography>
                                    {perm.description && (
                                        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                                            {perm.description}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Role Checkboxes */}
                                {roles.map((role) => {
                                    const checked = rolePermMap[role.role_id]?.has(perm.permission_id) || false;
                                    return (
                                        <Box key={role.role_id} sx={{ textAlign: 'center' }}>
                                            <Checkbox
                                                size="small"
                                                checked={checked}
                                                onChange={(e) =>
                                                    handleRolePermToggle(role.role_id, [perm.permission_id], e.target.checked)
                                                }
                                                sx={{
                                                    p: 0.5,
                                                    '& .MuiSvgIcon-root': { fontSize: 16 },
                                                    color: '#cbd5e1',
                                                    '&.Mui-checked': { color: '#3b82f6' },
                                                }}
                                            />
                                        </Box>
                                    );
                                })}

                                {/* User Override Column */}
                                {selectedUser && selectedUserData && (
                                    <Box sx={{ textAlign: 'center' }}>
                                        {(() => {
                                            const key = `${selectedUser}-${perm.permission_id}`;
                                            const override = overrideMap[key];
                                            const fromRole = userHasFromRole(selectedUser as number, perm.permission_id);

                                            if (override) {
                                                // Has explicit override
                                                return (
                                                    <Tooltip title={`Override: ${override.grant_type}. Click to remove.`}>
                                                        <Checkbox
                                                            size="small"
                                                            checked={override.grant_type === 'grant'}
                                                            indeterminate={override.grant_type === 'revoke'}
                                                            onChange={() => {
                                                                removeOverrideMutation.mutate({
                                                                    userId: selectedUser as number,
                                                                    permissionId: perm.permission_id,
                                                                });
                                                            }}
                                                            sx={{
                                                                p: 0.5,
                                                                '& .MuiSvgIcon-root': { fontSize: 16 },
                                                                color: override.grant_type === 'revoke' ? '#ef4444' : '#10b981',
                                                                '&.Mui-checked': { color: '#10b981' },
                                                                '&.MuiCheckbox-indeterminate': { color: '#ef4444' },
                                                            }}
                                                        />
                                                    </Tooltip>
                                                );
                                            }

                                            // No override — show role-inherited state
                                            return (
                                                <Tooltip title={fromRole ? 'From role. Click to revoke.' : 'Not granted. Click to grant.'}>
                                                    <Checkbox
                                                        size="small"
                                                        checked={fromRole}
                                                        onChange={() => {
                                                            overrideMutation.mutate({
                                                                userId: selectedUser as number,
                                                                permissionId: perm.permission_id,
                                                                grantType: fromRole ? 'revoke' : 'grant',
                                                            });
                                                        }}
                                                        sx={{
                                                            p: 0.5,
                                                            '& .MuiSvgIcon-root': { fontSize: 16 },
                                                            color: '#cbd5e1',
                                                            '&.Mui-checked': { color: '#94a3b8' },
                                                        }}
                                                    />
                                                </Tooltip>
                                            );
                                        })()}
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </React.Fragment>
                ))}
            </Paper>
        </Box>
    );
};

export default PermissionMatrix;
