import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Card } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';

// Import our new panel
import { EquipmentDataPanel } from '@/features/data-arena/components/EquipmentDataPanel';

function CustomTabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 4 }}>{children}</Box>}
    </div>
  );
}

export default function DataArenaRoute() {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', width: '100%', pb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box sx={{ p: 1.5, bgcolor: 'primary.50', color: 'primary.main', borderRadius: 2 }}>
          <StorageIcon fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Data Arena
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage, import, and export your system data in bulk.
          </Typography>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, bgcolor: 'white' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
          <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)}>
            <Tab label="Equipment" sx={{ fontWeight: 600, textTransform: 'none', fontSize: '1rem' }} />
            <Tab label="Customers" sx={{ fontWeight: 600, textTransform: 'none', fontSize: '1rem' }} />
            <Tab label="Invoices" sx={{ fontWeight: 600, textTransform: 'none', fontSize: '1rem' }} />
          </Tabs>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 4 }, pb: 4 }}>
          <CustomTabPanel value={tabIndex} index={0}>
            <EquipmentDataPanel />
          </CustomTabPanel>
          
          <CustomTabPanel value={tabIndex} index={1}>
            <Typography color="text.secondary" textAlign="center" py={10}>
              Customer bulk import module coming soon.
            </Typography>
          </CustomTabPanel>
          
          <CustomTabPanel value={tabIndex} index={2}>
            <Typography color="text.secondary" textAlign="center" py={10}>
              Invoice bulk export module coming soon.
            </Typography>
          </CustomTabPanel>
        </Box>
      </Card>
    </Box>
  );
}