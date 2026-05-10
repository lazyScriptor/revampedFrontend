import { create } from 'zustand';
import dayjs from 'dayjs';

interface ReportFilters {
    activeTab: number;
    startDate: string;
    endDate: string;
    cashFlowDate: string;
    setActiveTab: (tab: number) => void;
    setDateRange: (start: string, end: string) => void;
    setCashFlowDate: (date: string) => void;
}

export const useReportStore = create<ReportFilters>()((set) => ({
    activeTab: 0,
    startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    cashFlowDate: dayjs().format('YYYY-MM-DD'),

    setActiveTab: (tab) => set({ activeTab: tab }),
    setDateRange: (start, end) => set({ startDate: start, endDate: end }),
    setCashFlowDate: (date) => set({ cashFlowDate: date }),
}));
