import { createRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUiStore } from "@/stores/useUiStore";

// MUI Imports
import { styled, useTheme, Theme, CSSObject } from "@mui/material/styles";
import {
  Box,
  Drawer as MuiDrawer,
  AppBar as MuiAppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Avatar,
  Tooltip,
} from "@mui/material";

// MUI Icons
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory2";
import PeopleIcon from "@mui/icons-material/Group";
import ReceiptIcon from "@mui/icons-material/ReceiptLong";
import LogoutIcon from "@mui/icons-material/Logout";

const drawerWidth = 260;

// --- MUI Styled Mixins for the Mini Variant Transitions ---
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

// --- Styled Components ---
const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar, // Keeps height perfectly aligned with AppBar
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

// --- The Route Definition ---
export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

// --- The Layout Component ---
function AuthenticatedLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // Detect screens smaller than 'md'

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();

  // Navigation config array for easy rendering
  const navItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Inventory", icon: <InventoryIcon />, path: "/equipment" }, // We'll build this next!
    { text: "Customers", icon: <PeopleIcon />, path: "/customers" },
    { text: "Invoices", icon: <ReceiptIcon />, path: "/invoices" },
  ];

  // If mobile, closing the sidebar should hide it completely. If desktop, it shrinks.
  const handleDrawerToggle = () => {
    toggleSidebar();
  };

  const drawerContent = (
    <>
      <DrawerHeader>
        {/* Brand Name (Only visible when open) */}
        {isSidebarOpen && (
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            sx={{ ml: 1 }}
          >
            GearGrid
          </Typography>
        )}
        <IconButton onClick={handleDrawerToggle}>
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>

      <Divider />

      <List sx={{ flexGrow: 1, px: 1 }}>
        {navItems.map((item) => (
          <Tooltip
            title={!isSidebarOpen ? item.text : ""}
            placement="right"
            key={item.text}
          >
            {/* TanStack Router Link wrapped in MUI ListItem */}
            <ListItem disablePadding sx={{ display: "block", mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                // Optional: Tailwind class for active states
                activeProps={{
                  className: "bg-blue-50 text-blue-600 rounded-lg",
                }}
                inactiveProps={{
                  className: "text-slate-600 rounded-lg hover:bg-slate-50",
                }}
                onClick={() => isMobile && setSidebarOpen(false)} // Auto-close on mobile click
                sx={{
                  minHeight: 48,
                  justifyContent: isSidebarOpen ? "initial" : "center",
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isSidebarOpen ? 2 : "auto",
                    justifyContent: "center",
                    color: "inherit", // Inherits active color from Tailwind class above
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{ opacity: isSidebarOpen ? 1 : 0 }}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          </Tooltip>
        ))}
      </List>

      <Divider />

      <List sx={{ px: 1 }}>
        <ListItem disablePadding sx={{ display: "block" }}>
          <ListItemButton
            onClick={logout}
            sx={{
              minHeight: 48,
              justifyContent: isSidebarOpen ? "initial" : "center",
              px: 2.5,
              color: "error.main",
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: isSidebarOpen ? 2 : "auto",
                justifyContent: "center",
                color: "inherit",
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Log Out"
              sx={{ opacity: isSidebarOpen ? 1 : 0 }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* --- Top Navigation Bar --- */}
      <MuiAppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "white",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: theme.zIndex.drawer + 1,
          width: isMobile
            ? "100%"
            : `calc(100% - ${isSidebarOpen ? drawerWidth : 65}px)`,
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{
              mr: 2,
              color: "text.secondary",
              ...(isSidebarOpen && !isMobile && { display: "none" }),
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}
          {/* User Profile Area */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {user?.firstName} {user?.lastName}
            </Typography>
            <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
              {user?.firstName?.charAt(0) || "U"}
            </Avatar>
          </Box>
        </Toolbar>
      </MuiAppBar>

      {/* --- The Sidebar Drawer --- */}
      {isMobile ? (
        // Mobile View: Temporary Drawer (Overlays the screen)
        <MuiDrawer
          variant="temporary"
          open={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{ keepMounted: true }} // Better open performance on mobile
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawerContent}
        </MuiDrawer>
      ) : (
        // Desktop View: Permanent Mini-Variant Drawer
        <Drawer variant="permanent" open={isSidebarOpen}>
          {drawerContent}
        </Drawer>
      )}

      {/* --- Main Content Area --- */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: "100%" }}>
        <DrawerHeader /> {/* Invisible spacer to push content below AppBar */}
        {/* Child routes render here perfectly contained! */}
        <Outlet />
      </Box>
    </Box>
  );
}
