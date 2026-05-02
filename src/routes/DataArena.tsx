import { useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
} from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { BulkManager } from "@/features/data-arena/components/BulkManager";
import {
  downloadTemplate,
  exportData,
} from "@/features/data-arena/api/bulk.api";
import {
  useBulkImport,
  triggerFileDownload,
} from "@/features/data-arena/hooks/useBulkActions";

export default function DataArenaRoute() {
  const [activeTab, setActiveTab] = useState<
    "equipment" | "customers" | "invoices"
  >("equipment");

  // React Query Hooks
  const equipmentImport = useBulkImport("equipment", "equipment");
  const customersImport = useBulkImport("customers", "customers");

  // Factory function
  const createExportHandler =
    (entity: string, type: "template" | "full") => async () => {
      const blob =
        type === "template"
          ? await downloadTemplate(entity)
          : await exportData(entity);
      const filename =
        type === "template"
          ? `geargrid_${entity}_template.csv`
          : `geargrid_${entity}_export_${new Date().toISOString().split("T")[0]}.csv`;
      triggerFileDownload(blob, filename);
    };

  const navItems = [
    { id: "equipment", label: "Equipment Inventory", icon: <Inventory2Icon /> },
    { id: "customers", label: "Client CRM", icon: <PeopleIcon /> },
    { id: "invoices", label: "Financial Ledger", icon: <ReceiptIcon /> },
  ] as const;

  return (
    <Box
      sx={{
        height: { lg: "calc(100vh - 100px)" },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 4,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            bgcolor: "primary.main",
            color: "white",
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
          }}
        >
          <StorageIcon fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="800" color="text.primary">
            Data Arena
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Securely migrate, import, and back up your enterprise data in bulk.
          </Typography>
        </Box>
      </Box>

      {/* Modern 2-Column Split Layout */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        {/* Left Side: Navigation Panel */}
        <Paper
          elevation={0}
          sx={{
            flex: "0 0 280px",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "white",
            height: "fit-content",
          }}
        >
          <Box
            sx={{ p: 2, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
          >
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              color="text.secondary"
              textTransform="uppercase"
            >
              Data Tables
            </Typography>
          </Box>
          <List sx={{ p: 1 }}>
            {navItems.map((item) => (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                  sx={{
                    borderRadius: 2,
                    "&.Mui-selected": {
                      bgcolor: "primary.50",
                      color: "primary.main",
                      "&:hover": { bgcolor: "primary.100" },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color:
                        activeTab === item.id
                          ? "primary.main"
                          : "text.secondary",
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: activeTab === item.id ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Right Side: Content Engine */}
        <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 1, pb: 4 }}>
          {activeTab === "equipment" && (
            <BulkManager
              entityTitle="Equipment"
              exportDesc="Download a blank template to map your columns perfectly, or export your entire existing inventory."
              importDesc="Upload a properly formatted CSV to add or update multiple equipment records at once. Duplicates will be updated automatically based on Serial Number."
              onDownloadTemplate={createExportHandler("equipment", "template")}
              onExportAll={createExportHandler("equipment", "full")}
              onImportSubmit={(file) => equipmentImport.mutateAsync(file)}
            />
          )}

          {activeTab === "customers" && (
            <BulkManager
              entityTitle="Customers"
              exportDesc="Export your entire CRM database for accounting or marketing tools, or download a template to bulk-import new clients."
              importDesc="Upload a properly formatted CSV to migrate or sync your customer database. Records will be matched and updated based on NIC/Passport number."
              onDownloadTemplate={createExportHandler("customers", "template")}
              onExportAll={createExportHandler("customers", "full")}
              onImportSubmit={(file) => customersImport.mutateAsync(file)}
            />
          )}

          {activeTab === "invoices" && (
            <BulkManager
              entityTitle="Invoices & Financials"
              exportDesc="Export your entire financial ledger for tax, accounting, or auditing purposes. Templates are not provided as invoices must be generated securely via the POS Terminal."
              importDesc="Bulk importing of invoices is manually restricted to preserve financial and historical data integrity."
              onExportAll={createExportHandler("invoices", "full")}
              onImportSubmit={async () => {}} // Dummy
              allowImport={false} // SECURITY LOCK
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
