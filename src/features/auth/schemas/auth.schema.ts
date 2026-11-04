import { z } from 'zod';
import { zt } from '@/i18n/zod';

export const loginSchema = z.object({
    // An email or a username.
    email: z.string().trim().min(1, zt("validation.emailRequired")),
    password: z.string().min(6, zt("validation.passwordMin6")),
});

// Infer the TypeScript type directly from the Zod schema
export type LoginCredentials = z.infer<typeof loginSchema>;