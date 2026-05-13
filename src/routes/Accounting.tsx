import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Typography, Tabs, Tab, Paper, IconButton, useTheme, useMediaQuery } from "@mui/material";
import { DragIndicator as DragIcon, ChevronRight, ChevronLeft } from "@mui/icons-material";
import OverviewTab from "@/features/accounting/components/OverviewTab";
import InvoicesTab from "@/features/accounting/components/InvoicesTab";
import PaymentsTab from "@/features/accounting/components/PaymentsTab";
import ExpensesTab from "@/features/accounting/components/ExpensesTab";
import ReceivablesTab from "@/features/accounting/components/ReceivablesTab";
import JournalTab from "@/features/accounting/components/JournalTab";
import AccountingChartsPanel from "@/features/accounting/components/AccountingChartsPanel";
import { useReportStore } from "@/stores/useReportStore";

export default function AccountingRoute() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { activeTab, setActiveTab } = useReportStore();
  
  // Resizable state
  const [chartsWidth, setChartsWidth] = useState(isMobile ? 100 : 30); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const tabConfig = [
    { label: "Overview", component: OverviewTab },
    { label: "Invoices", component: InvoicesTab },
    { label: "Payments", component: PaymentsTab },
    { label: "Expenses", component: ExpensesTab },
    { label: "Receivables", component: ReceivablesTab },
    { label: "Journal", component: JournalTab },
  ];

  // Mouse event handlers for resizing
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  
  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((containerRect.right - mouseMoveEvent.clientX) / containerRect.width) * 100;
      
      // Constraints: between 15% and 60%
      if (newWidth > 15 && newWidth < 60) {
        setChartsWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <Box ref={containerRef} sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4, height: "100%" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Accounting Workstation</Typography>
          <Typography variant="body2" color="text.secondary">
            Professional transactional financial management & real-time analytics.
          </Typography>
        </Box>
      </Box>

      {/* Main Layout Container */}
      <Box sx={{ 
        display: "flex", 
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 3 : 0,
        minHeight: "70vh",
        position: "relative"
      }}>
        
        {/* LEFT SIDE: Data Tables */}
        <Box sx={{ 
          flex: 1, 
          width: isMobile ? "100%" : `${100 - chartsWidth}%`,
          transition: isResizing ? "none" : "width 0.2s",
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              bgcolor: "white", 
              borderRadius: 2, 
              border: "1px solid #e2e8f0",
              "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: "0.85rem", minHeight: 48 },
              "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0" },
            }}
          >
            {tabConfig.map((t, i) => (
              <Tab key={i} label={t.label} />
            ))}
          </Tabs>

          <Box sx={{ flexGrow: 1 }}>
            {tabConfig.map((t, i) => (
              <Box key={i} sx={{ display: activeTab === i ? "block" : "none" }}>
                {activeTab === i && <t.component />}
              </Box>
            ))}
          </Box>
        </Box>

        {/* RESIZER BAR */}
        {!isMobile && (
          <Box
            onMouseDown={startResizing}
            sx={{
              width: "12px",
              cursor: "col-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover .resizer-line": { bgcolor: "primary.main" },
              px: 0.5,
              zIndex: 10
            }}
          >
            <Box className="resizer-line" sx={{ 
              width: "2px", 
              height: "40%", 
              bgcolor: isResizing ? "primary.main" : "#e2e8f0",
              borderRadius: 1,
              transition: "background-color 0.2s"
            }} />
          </Box>
        )}

        {/* RIGHT SIDE: Charts Panel */}
        <Paper 
          elevation={0}
          sx={{ 
            width: isMobile ? "100%" : `${chartsWidth}%`,
            minWidth: isMobile ? "none" : "300px",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "white",
            transition: isResizing ? "none" : "width 0.2s",
          }}
        >
          <AccountingChartsPanel />
        </Paper>
      </Box>
    </Box>
  );
}
