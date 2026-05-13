import { api } from "@/lib/api";

export const userApi = {
  getUsers: (showInactive = false) => api.get(`/users?showInactive=${showInactive}`),
  createUser: (data: any) => api.post("/users", data),
  updateUser: (id: string | number, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string | number) => api.delete(`/users/${id}`),
  assignRoles: (id: string | number, roleIds: number[]) => api.post(`/users/${id}/assign-roles`, { roleIds }),
  toggleStatus: (id: string | number, isActive: boolean) => api.patch(`/users/${id}/toggle-status`, { isActive }),
};

export const roleApi = {
  getRoles: (showInactive = false) => api.get(`/roles?showInactive=${showInactive}`),
  createRole: (data: any) => api.post("/roles", data),
  updateRole: (id: string | number, data: any) => api.put(`/roles/${id}`, data),
  deleteRole: (id: string | number) => api.delete(`/roles/${id}`),
  assignPermissions: (id: string | number, permissionIds: number[]) => api.post(`/roles/${id}/assign-permissions`, { permissionIds }),
};
