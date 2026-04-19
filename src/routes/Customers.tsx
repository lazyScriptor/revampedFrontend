import { useState, useMemo } from "react";
import { useCustomerList } from "@/features/customers/hooks/useCustomerHooks";
import { CustomerTable } from "@/features/customers/components/CustomerTable";
import { CustomerFormDialog } from "@/features/customers/components/CustomerFormDialog";

import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

export default function CustomersRoute() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useCustomerList(paginationModel.page + 1, paginationModel.pageSize);

  const customerList = response?.customers || [];
  const totalRowCount = response?.total || 0;

  // Calculate live KPIs based on current data view
  const { idsInVault, totalAdvance } = useMemo(() => {
    let ids = 0;
    let advance = 0;
    customerList.forEach((c: any) => {
      if (c.is_id_retained_currently) ids++;
      if (c.deposit_balance) advance += Number(c.deposit_balance);
    });
    return { idsInVault: ids, totalAdvance: advance };
  }, [customerList]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setEditingItem(null), 300);
  };

  if (isLoading && customerList.length === 0)
    return (
      <Box className="flex h-full items-center justify-center min-h-[400px]">
        <CircularProgress />
      </Box>
    );
  if (isError)
    return (
      <Alert severity="error" className="m-4">
        Error loading customers: {error.message}
      </Alert>
    );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Client CRM
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1">
            Manage your individual renters, corporate clients, and retained
            collateral.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          disableElevation
          sx={{ py: 1.5, px: 3, borderRadius: 2 }}
        >
          Add Customer
        </Button>
      </div>

      {/* KPI Dashboard */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            className="border border-slate-200 rounded-xl bg-white h-full"
          >
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <PeopleAltIcon fontSize="large" />
              </div>
              <div>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="500"
                >
                  Total Clients
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {totalRowCount}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            className="border border-red-200 rounded-xl bg-red-50/30 h-full"
          >
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                <VerifiedUserIcon fontSize="large" />
              </div>
              <div>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="500"
                >
                  IDs Currently in Vault
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="error.dark">
                  {idsInVault}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            className="border border-slate-200 rounded-xl bg-white h-full"
          >
            <CardContent className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <AccountBalanceWalletIcon fontSize="large" />
              </div>
              <div>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="500"
                >
                  Total Advance Held
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  Rs. {totalAdvance.toLocaleString()}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Table */}
      <Card
        elevation={0}
        className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
      >
        <CustomerTable
          data={customerList}
          isLoading={isLoading}
          rowCount={totalRowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onEdit={handleOpenEdit}
        />
      </Card>

      {/* Form Dialog */}
      <CustomerFormDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        initialData={editingItem}
      />
    </div>
  );
}
