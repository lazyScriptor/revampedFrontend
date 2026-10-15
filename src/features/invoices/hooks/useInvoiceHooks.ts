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

export interface PrintInvoiceOptions {
    paperWidth?: "80mm" | "58mm";
    title?: string;
}

export const handlePrintInvoice = (
    printContentId: string,
    options?: PrintInvoiceOptions
) => {
    const contentElement = document.getElementById(printContentId);

    if (!contentElement) {
        console.error(`Print element with ID ${printContentId} not found.`);
        return;
    }

    const paperWidth = options?.paperWidth || "80mm";
    const printableWidth = paperWidth === "58mm" ? "48mm" : "72mm";
    const pageRollWidth = paperWidth === "58mm" ? "58mm" : "80mm";
    const title = options?.title || "GearGrid POS Receipt";

    // 1. Create an offscreen iframe configured with the exact roll width for layout calculation
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = pageRollWidth;
    iframe.style.height = "auto";
    iframe.style.border = "none";
    iframe.style.opacity = "0.01";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-9999";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // 2. Inject Thermal Printer Specific CSS and the Receipt HTML
    // Valid @page length rule avoids Chrome falling back to default A4 sheet.
    iframeDoc.open();
    iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style id="dynamic-page-size">
          @page {
            size: ${pageRollWidth} 297mm;
            margin: 0mm !important;
          }
        </style>
        <style>
          @media print {
            html, body {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #receipt-print-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }

          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
          }

          body {
            margin: 0 !important;
            padding: 0 0.5mm 1mm 0.5mm !important; /* Edge-to-edge width with zero top margin */
            width: 100% !important;
            max-width: 100% !important;
            font-family: 'Noto Sans Sinhala', 'Iskoola Pota', 'Sinhala Sangam MN', 'Courier New', Courier, monospace, sans-serif;
            color: #000000 !important;
            background-color: #ffffff !important;
            font-weight: 700 !important; /* Thicker, bolder text for high-contrast thermal burning */
            -webkit-text-stroke: 0.35px #000000; /* Extra stroke width to ensure rich, pitch-black letters */
            font-size: ${paperWidth === "58mm" ? "10.5px" : "11.5px"};
            line-height: 1.25;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
          }

          /* Force high-contrast thermal borders and dividers */
          hr {
            border: none;
            border-top: 1.5px dashed #000000;
            margin: 4px 0;
          }

          .divider-dashed {
            border-top: 1.5px dashed #000000;
            margin: 4px 0;
          }

          .divider-double {
            border-top: 2px solid #000000;
            border-bottom: 1.5px solid #000000;
            height: 3px;
            margin: 4px 0;
          }

          .divider-solid {
            border-top: 1.5px solid #000000;
            margin: 4px 0;
          }

          .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            padding: 1.5px 0;
            vertical-align: top;
          }
        </style>
      </head>
      <body>
        <div id="receipt-print-wrapper" style="width: 100%; max-width: 100%; margin: 0; padding: 0;">
          ${contentElement.innerHTML}
        </div>
      </body>
    </html>
  `);
    iframeDoc.close();

    // 3. Dynamically measure rendered content height and set exact @page size so Chrome does not revert to A4
    setTimeout(() => {
        try {
            const root = iframeDoc.getElementById("receipt-print-wrapper") || iframeDoc.body;
            const scrollHeight = root.scrollHeight || iframeDoc.body.scrollHeight || 600;
            // 1 px = 0.264583 mm at standard 96 DPI screen raster.
            // Tight 2mm buffer prevents trailing blank feed
            const calculatedMm = Math.max(50, Math.ceil(scrollHeight * 0.264583) + 2);

            const pageSizeTag = iframeDoc.getElementById("dynamic-page-size");
            if (pageSizeTag) {
                pageSizeTag.textContent = `
                    @page {
                        size: ${pageRollWidth} ${calculatedMm}mm;
                        margin: 0mm !important;
                    }
                    @media print {
                        @page {
                            size: ${pageRollWidth} ${calculatedMm}mm;
                            margin: 0mm !important;
                        }
                    }
                `;
            }
        } catch (err) {
            console.warn("Could not dynamically measure receipt height for @page:", err);
        }

        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        // 4. Clean up the DOM after the print dialog closes
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 2000);
    }, 250);
};