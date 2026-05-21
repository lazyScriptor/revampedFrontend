import { create } from 'zustand';
import { todayLocalStr, addDaysLocal } from '@/lib/dates';

interface ReportFilters {
    activeTab: number;
    startDate: string;
    endDate: string;
    cashFlowDate: string;
    setActiveTab: (tab: number) => void;
    setDateRange: (start: string, end: string) => void;
    setCashFlowDate: (date: string) => void;
}

const today = todayLocalStr();

export const useReportStore = create<ReportFilters>()((set) => ({
    activeTab: 0,
    startDate: addDaysLocal(today, -30),
    endDate: today,
    cashFlowDate: today,

    setActiveTab: (tab) => set({ activeTab: tab }),
    setDateRange: (start, end) => set({ startDate: start, endDate: end }),
    setCashFlowDate: (date) => set({ cashFlowDate: date }),
}));
