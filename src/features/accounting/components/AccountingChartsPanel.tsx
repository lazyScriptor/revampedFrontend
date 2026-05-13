import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  CircularProgress,
  useTheme,
  Fade,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Button,
  Stack,
  Tooltip as MuiTooltip,
} from "@mui/material";
import {
  PieChart as PieIcon,
  BarChart as BarIcon,
  Timeline as LineIcon,
  Refresh as RefreshIcon,
  Today as DayIcon,
  DateRange as WeekIcon,
  CalendarMonth as MonthIcon,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useAccountingCharts } from "../hooks/useAccountingQueries";
import { useAccountingFilters } from "../hooks/useAccountingFilters";
import { useCurrencyFormatter } from "../utils/currency";
import { useReportStore } from "@/stores/useReportStore";
import dayjs from "dayjs";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function AccountingChartsPanel() {
  const theme = useTheme();
  const { filters, toQueryParams } = useAccountingFilters();
  const { format } = useCurrencyFormatter();
  const { activeTab } = useReportStore();
  
  // Chart Configuration States
  const [chartType, setChartType] = useState<"pie" | "bar" | "area">("bar");
  const [timeGrain, setTimeGrain] = useState<"day" | "week" | "month">("day");
  
  // Map active tab to default chart view
  const tabToChart: Record<number, string> = useMemo(() => ({
    0: "cashFlow",
    1: "invoicesByStatus",
    2: "paymentsByMethod",
    3: "expensesByCategory",
    4: "invoicesByStatus",
    5: "cashFlow"
  }), []);

  const [activeChart, setActiveChart] = useState(tabToChart[activeTab] || "cashFlow");

  // Sync chart type and preferred illustration when tab changes
  useEffect(() => {
    const newChart = tabToChart[activeTab] || "cashFlow";
    setActiveChart(newChart);
    if (newChart === "cashFlow") setChartType("area");
    else if (newChart === "expensesByCategory") setChartType("pie");
    else setChartType("bar");
  }, [activeTab, tabToChart]);

  // Combine global filters with local chart config
  const chartParams = useMemo(() => ({
    ...toQueryParams(),
    timeGrain,
    // Add a cache buster if user clicks "Refresh" (handled by react-query refetch)
  }), [toQueryParams, timeGrain]);

  const { data, isLoading, isError, refetch, isFetching } = useAccountingCharts(chartParams as any);

  const getStatusColor = (name: string) => {
    const status = name.toLowerCase();
    if (status === "paid" || status === "completed" || status === "success") return "#10b981";
    if (status === "pending" || status === "partially paid") return "#f59e0b";
    if (status === "overdue" || status === "failed") return "#ef4444";
    return "#94a3b8";
  };

  const renderChart = () => {
    if (!data) return null;
    const { cashFlow, expensesByCategory, invoicesByStatus, paymentsByMethod } = data;

    switch (activeChart) {
      case "cashFlow":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(t) => {
                  if (timeGrain === "month") return dayjs(t).format("MMM YY");
                  if (timeGrain === "week") return t.split("-w")[1] ? `W${t.split("-w")[1]}` : t;
                  return dayjs(t).format("MMM DD");
                }}
                style={{ fontSize: "10px", fill: "#64748b" }}
                axisLine={false} tickLine={false}
              />
              <YAxis tickFormatter={(t) => format(t).replace(/\.00$/, "")} style={{ fontSize: "10px", fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => format(v)} labelFormatter={(l) => {
                if (timeGrain === "month") return dayjs(l).format("MMMM YYYY");
                return l;
              }} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        const currentData = activeChart === "invoicesByStatus" ? invoicesByStatus 
                          : activeChart === "expensesByCategory" ? expensesByCategory 
                          : paymentsByMethod;

        if (chartType === "pie") {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={currentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" nameKey="name">
                  {currentData?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={activeChart === "invoicesByStatus" ? getStatusColor(entry.name) : COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => format(v)} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          );
        }
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentData} layout={currentData.length > 6 ? "vertical" : "horizontal"} margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={currentData.length > 6} vertical={currentData.length <= 6} stroke="#f1f5f9" />
              <XAxis dataKey={currentData.length > 6 ? "value" : "name"} type={currentData.length > 6 ? "number" : "category"} hide={currentData.length > 6} style={{ fontSize: "10px" }} />
              <YAxis dataKey={currentData.length > 6 ? "name" : "value"} type={currentData.length > 6 ? "category" : "number"} style={{ fontSize: "10px" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => format(v)} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="value" radius={currentData.length > 6 ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
                {currentData?.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={activeChart === "invoicesByStatus" ? getStatusColor(entry.name) : COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const chartTitleMap: Record<string, string> = {
    cashFlow: "Financial Performance",
    expensesByCategory: "Spending Distribution",
    invoicesByStatus: "Receivables Status",
    paymentsByMethod: "Collection Channels",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 3 }}>
      {/* PROFESSIONAL CHART HEADER & CONFIG */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight="800" sx={{ letterSpacing: 1.5, display: "block", mb: 0.5 }}>
              BUSINESS INTELLIGENCE
            </Typography>
            <Typography variant="h6" fontWeight="900" color="text.primary">
              {chartTitleMap[activeChart]}
            </Typography>
          </Box>
          <MuiTooltip title="Refresh Illustration">
            <Button 
              size="small" variant="outlined" 
              onClick={() => refetch()} 
              disabled={isFetching}
              sx={{ minWidth: 40, p: 0.5, borderRadius: 2 }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </Button>
          </MuiTooltip>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
          {/* X-AXIS / TIME GRAIN CONTROL */}
          {activeChart === "cashFlow" && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ display: "block", mb: 0.5 }}>GROUP BY (X-AXIS)</Typography>
              <ToggleButtonGroup
                size="small" value={timeGrain} exclusive
                onChange={(_, v) => v && setTimeGrain(v)}
                sx={{ bgcolor: "#f8fafc", p: 0.5, borderRadius: 2 }}
              >
                <ToggleButton value="day" sx={{ px: 1.5 }}><DayIcon sx={{ fontSize: 16, mr: 0.5 }} /> Day</ToggleButton>
                <ToggleButton value="week" sx={{ px: 1.5 }}><WeekIcon sx={{ fontSize: 16, mr: 0.5 }} /> Week</ToggleButton>
                <ToggleButton value="month" sx={{ px: 1.5 }}><MonthIcon sx={{ fontSize: 16, mr: 0.5 }} /> Month</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {/* ILLUSTRATION TYPE */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ display: "block", mb: 0.5 }}>ILLUSTRATION STYLE</Typography>
            <ToggleButtonGroup
              size="small" value={chartType} exclusive
              onChange={(_, v) => v && setChartType(v)}
              sx={{ bgcolor: "#f8fafc", p: 0.5, borderRadius: 2 }}
            >
              <ToggleButton value="bar"><BarIcon sx={{ fontSize: 16, mr: 0.5 }} /> Bar</ToggleButton>
              <ToggleButton value="pie" disabled={activeChart === "cashFlow"}><PieIcon sx={{ fontSize: 16, mr: 0.5 }} /> Pie</ToggleButton>
              <ToggleButton value="area" disabled={activeChart !== "cashFlow"}><LineIcon sx={{ fontSize: 16, mr: 0.5 }} /> Trend</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* VIEW SELECTOR */}
          <Box sx={{ flexGrow: 1, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ display: "block", mb: 0.5 }}>DATA PERSPECTIVE</Typography>
            <Select
              fullWidth value={activeChart} size="small"
              onChange={(e) => setActiveChart(e.target.value)}
              sx={{ borderRadius: 2, bgcolor: "#f8fafc", fontSize: "0.85rem", fontWeight: 600 }}
            >
              <MenuItem value="cashFlow">Cash Flow (Performance)</MenuItem>
              <MenuItem value="expensesByCategory">Expenses (By Category)</MenuItem>
              <MenuItem value="invoicesByStatus">Invoices (By Status)</MenuItem>
              <MenuItem value="paymentsByMethod">Payments (By Channel)</MenuItem>
            </Select>
          </Box>
        </Stack>
      </Box>

      {/* CHART CONTENT */}
      <Box sx={{ flexGrow: 1, minHeight: 400, position: "relative" }}>
        {(isLoading || isFetching) && (
          <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10, bgcolor: "rgba(255,255,255,0.7)" }}>
            <CircularProgress size={30} />
          </Box>
        )}
        <Fade in={!isLoading} timeout={600}>
          <Box sx={{ height: "100%" }}>{renderChart()}</Box>
        </Fade>
      </Box>
      
      {/* FILTER SYNC STATUS */}
      <Box sx={{ mt: 3, p: 2, bgcolor: "primary.light", borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5, border: "1px solid", borderColor: "primary.main" }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "primary.main", animation: "pulse 2s infinite" }} />
        <Typography variant="caption" color="primary.main" fontWeight="700">
          LIVE SYNC ACTIVE: {filters.search ? `Filtering for "${filters.search}"` : "Global Data Stream"}
        </Typography>
      </Box>
    </Box>
  );
}
