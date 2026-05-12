import React, { useState, useMemo } from 'react';
import {
    Box, Paper, Typography, Checkbox, Chip, Button, Tooltip,
    Select, MenuItem, FormControl, InputLabel, Divider, Badge,
} from '@mui/material';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/AppToast';

interface Permission {
    permission_id: number;
    permission_code: string;
    module_name: string;
    description?: string;
}
interface RoleData {
    role_id: number;
    role_name: string;
    is_system_default?: boolean;
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
    const { showSuccess, showError, showWarning, showInfo } = useToast();

    const { data, isLoading } = useQuery({
        queryKey: ['permission-matrix'],
        queryFn: async () => {
            const res = await api.get('/permission-management/matrix');
            return res.data;
        },
    });

    // --- Mutations with toast feedback ---
    const overrideMutation = useMutation({
        mutationFn: async (body: { userId: number; permissionId: number; grantType: string }) => {
            await api.post('/permission-management/user-override', body);
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['permission-matrix'] });
            const action = variables.grantType === 'grant' ? 'granted to' : 'revoked from';
            const user = users.find((u) => u.user_id === variables.userId);
            showSuccess(
                `Permission ${action} ${user?.username || 'user'}.`,
                'Override Applied',
            );
        },
        onError: (err: Error) => {
            showError(err.message, 'Override Failed');
        },
    });

    const removeOverrideMutation = useMutation({
        mutationFn: async (body: { userId: number; permissionId: number }) => {
            await api.delete('/permission-management/user-override', { data: body });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['permission-matrix'] });
            showInfo('Override removed. Permission will follow the role assignment.', 'Override Cleared');
        },
        onError: (err: Error) => {
            showError(err.message, 'Remove Override Failed');
        },
    });

    const cloneMutation = useMutation({
        mutationFn: async (body: { sourceRoleId: number; targetRoleId: number }) => {
            await api.post('/permission-management/clone-role', body);
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['permission-matrix'] });
            const from = roles.find((r) => r.role_id === variables.sourceRoleId)?.role_name;
            const to = roles.find((r) => r.role_id === variables.targetRoleId)?.role_name;
            showSuccess(
                `All permissions from "${from}" have been copied to "${to}".`,
                'Role Cloned Successfully',
            );
        },
        onError: (err: Error) => {
            showError(err.message, 'Clone Failed');
        },
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

    // Check if a user has permission from their roles
    const userHasFromRole = (userId: number, permId: number) => {
        const user = users.find((u) => u.user_id === userId);
        if (!user) return false;
        return user.Roles?.some((r) => rolePermMap[r.role_id]?.has(permId)) || false;
    };

    const handleRolePermToggle = async (roleId: number, permissionIds: number[], checked: boolean) => {
        const role = roles.find((r) => r.role_id === roleId);
        if (!role) return;

        // Warn early if system default
        if (role.is_system_default) {
            showWarning(
                `The "${role.role_name}" role is a system default and cannot be modified. Use "User-Level Overrides" on the right to customize permissions for individual users.`,
                'System Role Protected',
            );
            return;
        }

        const currentPerms = new Set(role.Permissions?.map((p: Permission) => p.permission_id) || []);
        permissionIds.forEach((id) => {
            if (checked) currentPerms.add(id);
            else currentPerms.delete(id);
        });

        try {
            await api.post(`/roles/${roleId}/permissions`, {
                permissionIds: Array.from(currentPerms),
            });
            qc.invalidateQueries({ queryKey: ['permission-matrix'] });
            const action = checked ? 'added to' : 'removed from';
            showSuccess(
                `Permission ${action} the "${role.role_name}" role.`,
                'Role Updated',
            );
        } catch (err: any) {
            showError(
                err.message || 'Failed to update role permissions.',
                'Role Update Failed',
            );
        }
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
            {/* ─── Toolbar ─── */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                {/* ── Clone Role Permissions ── */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ContentCopyOutlinedIcon sx={{ fontSize: 14, color: '#3b82f6' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Clone Role Permissions
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', lineHeight: 1.2 }}>
                        Copy all permissions from one role to another
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel sx={{ fontSize: '0.75rem' }}>Source Role</InputLabel>
                            <Select
                                value={cloneFrom}
                                label="Source Role"
                                onChange={(e) => setCloneFrom(e.target.value as number)}
                                sx={{ fontSize: '0.75rem' }}
                            >
                                {roles.map((r) => (
                                    <MenuItem key={r.role_id} value={r.role_id} sx={{ fontSize: '0.75rem' }}>
                                        {r.role_name}
                                        {r.is_system_default && (
                                            <LockOutlinedIcon sx={{ fontSize: 12, ml: 0.5, color: '#94a3b8' }} />
                                        )}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>→</Typography>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel sx={{ fontSize: '0.75rem' }}>Target Role</InputLabel>
                            <Select
                                value={cloneTo}
                                label="Target Role"
                                onChange={(e) => setCloneTo(e.target.value as number)}
                                sx={{ fontSize: '0.75rem' }}
                            >
                                {roles.filter((r) => !r.is_system_default).map((r) => (
                                    <MenuItem key={r.role_id} value={r.role_id} sx={{ fontSize: '0.75rem' }}>
                                        {r.role_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={!cloneFrom || !cloneTo || cloneFrom === cloneTo || cloneMutation.isPending}
                            onClick={() => {
                                if (cloneFrom && cloneTo) {
                                    cloneMutation.mutate({
                                        sourceRoleId: cloneFrom as number,
                                        targetRoleId: cloneTo as number,
                                    });
                                }
                            }}
                            sx={{ fontSize: '0.7rem', textTransform: 'none', minWidth: 60 }}
                        >
                            {cloneMutation.isPending ? '...' : 'Clone'}
                        </Button>
                    </Box>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* ── User-Level Override Selector ── */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonOutlinedIcon sx={{ fontSize: 14, color: '#8b5cf6' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            User-Level Overrides
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem', lineHeight: 1.2 }}>
                        Grant or revoke permissions for a specific user, bypassing their role
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>Select a User</InputLabel>
                        <Select
                            value={selectedUser}
                            label="Select a User"
                            onChange={(e) => setSelectedUser(e.target.value as number)}
                            sx={{ fontSize: '0.75rem' }}
                        >
                            <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                                <em>None — hide user column</em>
                            </MenuItem>
                            {users.map((u) => (
                                <MenuItem key={u.user_id} value={u.user_id} sx={{ fontSize: '0.75rem' }}>
                                    {u.username} — {u.first_name} {u.last_name}
                                    {u.Roles?.length > 0 && (
                                        <Chip
                                            label={u.Roles.map((r) => r.role_name).join(', ')}
                                            size="small"
                                            sx={{ ml: 1, fontSize: '0.6rem', height: 18 }}
                                        />
                                    )}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            {/* ─── Legend ─── */}
            <Paper
                elevation={0}
                sx={{
                    px: 2,
                    py: 1,
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    flexWrap: 'wrap',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 14, color: '#64748b' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', fontSize: '0.68rem' }}>Legend:</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '3px', border: '2px solid #3b82f6', backgroundColor: '#3b82f6' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>Role has permission</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LockOutlinedIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>System role (read-only)</Typography>
                </Box>
                {selectedUser && (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 14, height: 14, borderRadius: '3px', border: '2px solid #10b981', backgroundColor: '#10b981' }} />
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>Explicitly granted</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 14, height: 14, borderRadius: '3px', border: '2px solid #ef4444', backgroundColor: '#ef4444' }} />
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>Explicitly revoked</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 14, height: 14, borderRadius: '3px', border: '2px solid #94a3b8', backgroundColor: '#94a3b8' }} />
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.65rem' }}>Inherited from role</Typography>
                        </Box>
                    </>
                )}
            </Paper>

            {/* ─── Matrix Table ─── */}
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
                        gridTemplateColumns: `2.5fr repeat(${roles.length}, 1fr) ${selectedUser ? '1.2fr' : ''}`,
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
                            <Tooltip title={r.is_system_default ? `"${r.role_name}" is a system role and cannot be edited. Use user-level overrides instead.` : `Click checkboxes below to toggle permissions for "${r.role_name}"`}>
                                <Chip
                                    icon={r.is_system_default ? <LockOutlinedIcon sx={{ fontSize: 12 }} /> : <ShieldOutlinedIcon sx={{ fontSize: 12 }} />}
                                    label={r.role_name}
                                    size="small"
                                    color={r.is_system_default ? 'warning' : 'default'}
                                    variant={r.is_system_default ? 'outlined' : 'filled'}
                                    sx={{ fontSize: '0.65rem', fontWeight: 600, height: 24 }}
                                />
                            </Tooltip>
                        </Box>
                    ))}
                    {selectedUser && selectedUserData && (
                        <Box sx={{ p: 1.5, textAlign: 'center' }}>
                            <Tooltip title={`Per-user overrides for ${selectedUserData.username}. Green = explicitly granted. Red = explicitly revoked. Grey = inherited from role.`}>
                                <Chip
                                    icon={<PersonOutlinedIcon sx={{ fontSize: 12 }} />}
                                    label={`${selectedUserData.username} overrides`}
                                    size="small"
                                    color="secondary"
                                    sx={{ fontSize: '0.63rem', fontWeight: 600, height: 24 }}
                                />
                            </Tooltip>
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
                                gridTemplateColumns: `2.5fr repeat(${roles.length}, 1fr) ${selectedUser ? '1.2fr' : ''}`,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase' }}>
                                    {module}
                                </Typography>
                                <Badge badgeContent={perms.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', height: 16, minWidth: 16 } }} />
                            </Box>
                        </Box>

                        {/* Individual Permissions */}
                        {perms.map((perm) => (
                            <Box
                                key={perm.permission_id}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `2.5fr repeat(${roles.length}, 1fr) ${selectedUser ? '1.2fr' : ''}`,
                                    borderBottom: '1px solid #f1f5f9',
                                    '&:hover': { backgroundColor: '#fafbfc' },
                                    alignItems: 'center',
                                }}
                            >
                                <Box sx={{ px: 2, py: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#334155', fontFamily: 'monospace' }}>
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
                                    const isSystemDefault = role.is_system_default;
                                    return (
                                        <Box key={role.role_id} sx={{ textAlign: 'center' }}>
                                            <Tooltip
                                                title={
                                                    isSystemDefault
                                                        ? `"${role.role_name}" is a system role. Permissions can only be adjusted via user-level overrides.`
                                                        : checked
                                                            ? `Remove this permission from "${role.role_name}"`
                                                            : `Grant this permission to "${role.role_name}"`
                                                }
                                            >
                                                <span>
                                                    <Checkbox
                                                        size="small"
                                                        checked={checked}
                                                        disabled={isSystemDefault}
                                                        onChange={(e) =>
                                                            handleRolePermToggle(role.role_id, [perm.permission_id], e.target.checked)
                                                        }
                                                        sx={{
                                                            p: 0.5,
                                                            '& .MuiSvgIcon-root': { fontSize: 16 },
                                                            color: isSystemDefault ? '#e2e8f0' : '#cbd5e1',
                                                            '&.Mui-checked': { color: isSystemDefault ? '#fbbf24' : '#3b82f6' },
                                                            '&.Mui-disabled': { color: isSystemDefault && checked ? '#fbbf24' : undefined },
                                                        }}
                                                    />
                                                </span>
                                            </Tooltip>
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
                                                const isGrant = override.grant_type === 'grant';
                                                return (
                                                    <Tooltip title={`${isGrant ? 'Explicitly GRANTED' : 'Explicitly REVOKED'} for ${selectedUserData.username}. Click to remove this override and revert to role default.`}>
                                                        <Checkbox
                                                            size="small"
                                                            checked={isGrant}
                                                            indeterminate={!isGrant}
                                                            onChange={() => {
                                                                removeOverrideMutation.mutate({
                                                                    userId: selectedUser as number,
                                                                    permissionId: perm.permission_id,
                                                                });
                                                            }}
                                                            sx={{
                                                                p: 0.5,
                                                                '& .MuiSvgIcon-root': { fontSize: 16 },
                                                                color: isGrant ? '#10b981' : '#ef4444',
                                                                '&.Mui-checked': { color: '#10b981' },
                                                                '&.MuiCheckbox-indeterminate': { color: '#ef4444' },
                                                            }}
                                                        />
                                                    </Tooltip>
                                                );
                                            }

                                            // No override — show role-inherited state
                                            return (
                                                <Tooltip title={fromRole ? `Inherited from role. Click to explicitly REVOKE for ${selectedUserData.username}.` : `Not granted by any role. Click to explicitly GRANT for ${selectedUserData.username}.`}>
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
