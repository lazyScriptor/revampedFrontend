import { api } from '@/lib/api'; // Using the interceptor instance we built earlier
import { LoginCredentials } from '../schemas/auth.schema';

export const loginUser = async (credentials: LoginCredentials) => {
  // The API interceptor will unwrap the { status: 'success', data: {...} } wrapper
  const response = await api.post('/auth/login', credentials);
  return response; // Ensure this returns the user object from your backend
};

export const verifySession = async () => {
  const response = await api.get('/auth/verify');
  return response.data;
};