import { Box, Button, TextField, MenuItem, Typography } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { useReportStore } from '@/stores/useReportStore';
import { downloadReport } from '../hooks/useReportHooks';
import { useState } from 'react';

interface ReportBuilderProps {
    showDateRange?: boolean;
    showCashFlowDate?: boolean;
    pdfEndpoint?: string;
    excelEndpoint?: string;
    reportName?: string;
}

export default function ReportBuilder({
    showDateRange = true,
    showCashFlowDate = false,
    pdfEndpoint,
    excelEndpoint,
    reportName = 'report',
}: ReportBuilderProps) {
    const { startDate, endDate, cashFlowDate, setDateRange, setCashFlowDate } = useReportStore();
    const [downloading, setDownloading] = useState<string | null>(null);

    const handleDownload = async (type: 'pdf' | 'excel') => {
        const endpoint = type === 'pdf' ? pdfEndpoint : excelEndpoint;
        if (!endpoint) return;

        setDownloading(type);
        try {
            const params: Record<string, string> = {};
            if (showDateRange) {
                params.startDate = startDate;
                params.endDate = endDate;
            }
            if (showCashFlowDate) {
                params.date = cashFlowDate;
            }
            const ext = type === 'pdf' ? 'pdf' : 'xlsx';
            await downloadReport(endpoint, params, `${reportName}_${startDate}_${endDate}.${ext}`);
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setDownloading(null);
        }
    };

    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
            p: 2, bgcolor: 'white', border: '1px solid #e2e8f0', borderRadius: 2.5,
        }}>
            {showDateRange && (
                <>
                    <TextField
                        type="date" size="small" label="From"
                        value={startDate}
                        onChange={(e) => setDateRange(e.target.value, endDate)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 1 } }}
                    />
                    <TextField
                        type="date" size="small" label="To"
                        value={endDate}
                        onChange={(e) => setDateRange(startDate, e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 160, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 1 } }}
                    />
                </>
            )}

            {showCashFlowDate && (
                <TextField
                    type="date" size="small" label="Date"
                    value={cashFlowDate}
                    onChange={(e) => setCashFlowDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 160, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 1 } }}
                />
            )}

            <Box sx={{ flexGrow: 1 }} />

            {pdfEndpoint && (
                <Button
                    variant="outlined" size="small"
                    startIcon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => handleDownload('pdf')}
                    disabled={downloading === 'pdf'}
                    sx={{
                        textTransform: 'none', fontSize: '0.75rem', fontWeight: 600,
                        borderColor: '#e2e8f0', color: '#475569', px: 2, py: 0.75,
                        '&:hover': { borderColor: '#dc2626', color: '#dc2626', bgcolor: '#fef2f2' },
                    }}
                >
                    {downloading === 'pdf' ? 'Generating...' : 'PDF'}
                </Button>
            )}

            {excelEndpoint && (
                <Button
                    variant="outlined" size="small"
                    startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => handleDownload('excel')}
                    disabled={downloading === 'excel'}
                    sx={{
                        textTransform: 'none', fontSize: '0.75rem', fontWeight: 600,
                        borderColor: '#e2e8f0', color: '#475569', px: 2, py: 0.75,
                        '&:hover': { borderColor: '#16a34a', color: '#16a34a', bgcolor: '#f0fdf4' },
                    }}
                >
                    {downloading === 'excel' ? 'Generating...' : 'Excel'}
                </Button>
            )}
        </Box>
    );
}
