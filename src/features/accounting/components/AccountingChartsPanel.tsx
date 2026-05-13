import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Paper,
  useTheme,
  Fade,
} from "@mui/material";
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
  
  // Map active tab to default chart view
  // 0: Overview, 1: Invoices, 2: Payments, 3: Expenses, 4: Receivables, 5: Journal
  const tabToChart: Record<number, string> = {
    0: "cashFlow",
    1: "invoicesByStatus",
    2: "paymentsByMethod",
    3: "expensesByCategory",
    4: "invoicesByStatus",
    5: "cashFlow"
  };

  const [activeChart, setActiveChart] = useState(tabToChart[activeTab] || "cashFlow");

  // Sync chart type when tab changes
  useEffect(() => {
    setActiveChart(tabToChart[activeTab] || "cashFlow");
  }, [activeTab]);

  const chartParams = { ...toQueryParams(), page: undefined, pageSize: undefined };
  const { data, isLoading, isError } = useAccountingCharts(chartParams as any);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: 400 }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: 400 }}>
        <Typography color="error" variant="body2">Unable to load analytics for this view.</Typography>
      </Box>
    );
  }

  const { cashFlow, expensesByCategory, invoicesByStatus, paymentsByMethod } = data;

  const renderChart = () => {
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
                tickFormatter={(tick) => dayjs(tick).format("MMM DD")}
                style={{ fontSize: "10px", fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(tick) => format(tick).replace(/\.00$/, "")}
                style={{ fontSize: "10px", fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                formatter={(value: number) => format(value)}
                labelFormatter={(label) => dayjs(label).format("MMMM DD, YYYY")}
              />
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "expensesByCategory":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expensesByCategory}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={85}
                paddingAngle={5}
                dataKey="value" nameKey="name"
              >
                {expensesByCategory?.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => format(value)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case "invoicesByStatus":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={invoicesByStatus} layout="vertical" margin={{ left: 20, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" style={{ fontSize: "11px" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => format(value)} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {invoicesByStatus?.map((entry: any, index: number) => {
                  let color = "#94a3b8";
                  if (entry.name === "Paid") color = "#10b981";
                  if (entry.name === "Pending" || entry.name === "Partially Paid") color = "#f59e0b";
                  if (entry.name === "Overdue") color = "#ef4444";
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "paymentsByMethod":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentsByMethod}
                cx="50%" cy="50%"
                innerRadius={0} outerRadius={80}
                dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {paymentsByMethod?.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => format(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const chartTitleMap: Record<string, string> = {
    cashFlow: "Cash Flow Performance",
    expensesByCategory: "Expense Distribution",
    invoicesByStatus: "Invoice Aging & Status",
    paymentsByMethod: "Payment Methods",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2.5 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="primary" fontWeight="700" sx={{ letterSpacing: 1.2 }}>
          Section Analytics
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="800" color="text.primary">
            {chartTitleMap[activeChart]}
          </Typography>
          <FormControl size="small" variant="standard" sx={{ minWidth: 40 }}>
            <Select
              value={activeChart}
              onChange={(e) => setActiveChart(e.target.value)}
              disableUnderline
              sx={{ "& .MuiSelect-select": { py: 0.5, fontSize: "0.75rem", color: "text.secondary" } }}
            >
              <MenuItem value="cashFlow">Cash Flow</MenuItem>
              <MenuItem value="expensesByCategory">Expenses</MenuItem>
              <MenuItem value="invoicesByStatus">Invoices</MenuItem>
              <MenuItem value="paymentsByMethod">Payments</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Fade in={!isLoading} timeout={500}>
        <Box sx={{ flexGrow: 1, minHeight: 350 }}>
          {renderChart()}
        </Box>
      </Fade>
      
      <Box sx={{ mt: 2, p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, border: "1px dashed #e2e8f0" }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
          Filtering based on {filters.dateFrom ? dayjs(filters.dateFrom).format("MMM DD") : "Start"} — {filters.dateTo ? dayjs(filters.dateTo).format("MMM DD") : "Today"}
        </Typography>
      </Box>
    </Box>
  );
}
