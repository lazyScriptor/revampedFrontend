import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebounce } from './usePosSearch';

// features/invoices/hooks/useInvoiceHooks.ts
export const useInvoiceList = (page: number, limit: number, status?: string) => {
    return useQuery({
        // CRITICAL: Add status to the queryKey so changing tabs triggers a refetch
        queryKey: ['invoices', page, limit, status],
        queryFn: async () => {
            // Build the params object. If status is "All", we just don't send it.
            const params: any = { page, limit };
            if (status && status !== 'All') {
                params.status = status;
            }

            const response = await api.get('/invoices', { params });
            return response?.data || { invoices: [], totalItems: 0 };
        },
    });
};

// 2. Global Search Hook for POS Pane 1
export const useInvoiceSearch = (searchTerm: string) => {
    const debouncedSearch = useDebounce(searchTerm, 300);
    return useQuery({
        queryKey: ['invoice-search', debouncedSearch],
        queryFn: async () => {
            if (!debouncedSearch) return [];
            const response = await api.get('/invoices', { params: { search: debouncedSearch, limit: 10 } });

            // BULLETPROOF: Check multiple levels of the response object
            return response.data?.data?.invoices || response.data?.invoices || [];
        },
        enabled: debouncedSearch.length >= 1,
    });
};

// 3. Deep Fetch a Single Invoice
export const useInvoiceDetails = (invoiceId: number | null) => {
    return useQuery({
        queryKey: ['invoice', invoiceId],
        queryFn: async () => {
            if (!invoiceId) return null;
            const response = await api.get(`/invoices/${invoiceId}`);

            // BULLETPROOF: Check multiple levels of the response object
            return response.data?.data?.invoice || response.data?.invoice || null;
        },
        enabled: !!invoiceId,
    });
};

// 4. Existing Return Hook
export const useProcessReturn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, data: any }) => {
            const response = await api.post(`/invoices/${payload.id}/return`, payload.data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
};

// 5. NEW: Continuous Payments
export const useAddPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, data: { amount: number, method: string, is_refund: boolean } }) => {
            const response = await api.post(`/invoices/${payload.id}/payments`, payload.data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
        },
    });
};

// 6. NEW: Vault Toggle
export const useToggleVault = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const response = await api.patch(`/invoices/${id}/vault`);
            return response.data;
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['invoice', id] });
            queryClient.invalidateQueries({ queryKey: ['invoice-search'] });
        },
    });
};

// 7. NEW: Update Dynamic Fees
export const useUpdateFees = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: number, data: { transport_fee: number, discount_amount: number } }) => {
            const response = await api.patch(`/invoices/${payload.id}/fees`, payload.data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            // Instantly refresh the right pane when the fee saves!
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
        },
    });
};

// features/invoices/hooks/useInvoicePrint.ts

export const handlePrintInvoice = (printContentId: string) => {
    const contentElement = document.getElementById(printContentId);

    if (!contentElement) {
        console.error(`Print element with ID ${printContentId} not found.`);
        return;
    }

    // 1. Create an invisible iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // 2. Inject Thermal Printer Specific CSS and the Receipt HTML
    iframeDoc.open();
    iframeDoc.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          /* CRITICAL: Tells the browser this is an 80mm thermal roll */
          @page {
            margin: 0;
            size: 80mm auto; 
          }
          
          body {
            margin: 0;
            padding: 4mm; /* Slight padding so text doesn't touch the exact edge */
            width: 80mm;
            font-family: 'Courier New', Courier, monospace; /* Best for thermal clarity */
            color: #000;
            font-size: 12px; /* Standard thermal legibility size */
          }

          /* Force all borders/dividers to be stark black for thermal printing */
          hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 8px 0;
          }

          /* Strip out MUI specific scaling artifacts inside the iframe */
          * {
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        ${contentElement.innerHTML}
      </body>
    </html>
  `);
    iframeDoc.close();

    // 3. Wait slightly for the iframe to paint, then trigger the printer
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        // 4. Clean up the DOM after the print dialog closes
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 250);
};