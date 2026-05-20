import { z } from 'zod';

export const customerSchema = z.object({
    customer_type: z.enum(['Individual', 'Business']),
    company_name: z.string().optional(),

    // A boolean to toggle the UI state (not sent to DB)
    is_worker_for_company: z.boolean().default(false),
    parent_customer_id: z.coerce.number().optional().nullable(),

    first_name: z.string().min(2, 'First name is required'),
    last_name: z.string().min(2, 'Last name is required'),
    nic_number: z.string().min(5, 'Valid NIC/Passport is required'),
    phone_number: z.string().min(9, 'Valid phone number is required'),

    address_line1: z.string().optional(),
    address_line2: z.string().optional(),

    is_id_retained_currently: z.boolean().default(false),
    deposit_balance: z.coerce.number().min(0).default(0),
    status: z.enum(['Active', 'Blacklisted']).default('Active'),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

export interface Customer {
    customer_id: number;
    customer_type: 'Individual' | 'Business';
    company_name?: string;
    parent_customer_id?: number | null;
    first_name: string;
    last_name: string;
    nic_number: string;
    phone_number: string;
    address_line1?: string;
    address_line2?: string;
    is_id_retained_currently: boolean;
    deposit_balance: string;
    rating: number;
    status: 'Active' | 'Blacklisted';
    ParentCompany?: { // The nested object returned by Sequelize
        customer_id?: number;
        customer_type?: 'Individual' | 'Business';
        company_name?: string;
        first_name?: string;
        last_name?: string;
        phone_number?: string;
    } | null;
    Workers?: Array<{
        customer_id: number;
        first_name: string;
        last_name: string;
        phone_number?: string;
        status?: 'Active' | 'Blacklisted';
    }>;
}