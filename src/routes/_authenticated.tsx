import React, { useState } from "react";
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
  Collapse,
} from "@mui/material";

// MUI Icons
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory2";
import PeopleIcon from "@mui/icons-material/Group";
import ReceiptIcon from "@mui/icons-material/ReceiptLong";
import StorageIcon from "@mui/icons-material/Storage";
import LogoutIcon from "@mui/icons-material/Logout";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import HistoryIcon from "@mui/icons-material/History";
import BadgeIcon from "@mui/icons-material/Badge";
import ConstructionIcon from "@mui/icons-material/Construction";
import CategoryIcon from "@mui/icons-material/Category";
import HandymanIcon from "@mui/icons-material/Handyman";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord"; // Fallback bullet

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
  ...theme.mixins.toolbar,
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
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();

  // State to track which sub-menus are expanded
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    Inventory: false,
  });

  // 1. Updated Nav Items with distinct icons and nested children
  const allNavItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    {
      text: "Inventory",
      icon: <InventoryIcon />,
      requiredPermission: "inventory_permission",
      children: [
        {
          text: "All Equipment",
          path: "/equipment",
          icon: <ConstructionIcon fontSize="small" />,
        },
        {
          text: "Categories",
          path: "/equipment-category",
          icon: <CategoryIcon fontSize="small" />,
        },
        {
          text: "Maintenance",
          path: "/maintenance",
          icon: <HandymanIcon fontSize="small" />,
        },
      ],
    },
    {
      text: "Customers",
      icon: <PeopleIcon />,
      path: "/customers",
      requiredPermission: "inventory_permission",
    },
    {
      text: "Invoices",
      icon: <ReceiptIcon />,
      path: "/invoices",
      requiredPermission: "inventory_permission",
    },
    {
      text: "Data Arena",
      icon: <StorageIcon />,
      path: "/data-arena",
      requiredPermission: "inventory_permission",
    },
    {
      text: "Rental History",
      icon: <HistoryIcon />,
      path: "/rental-history",
      requiredPermission: "inventory_permission",
    },
    {
      text: "Workforce",
      icon: <BadgeIcon />,
      path: "/workforce",
      requiredPermission: "inventory_permission",
    },
  ];

  // 2. Filter the items based on the user's permission array
  const visibleNavItems = allNavItems.filter((item) => {
    if (!item.requiredPermission) return true;
    return user?.permissions?.includes(item.requiredPermission) || false;
  });

  const handleDrawerToggle = () => {
    toggleSidebar();
  };

  // Smart handler: Opens sidebar if closed, otherwise toggles the collapse
  const handleParentClick = (text: string) => {
    if (!isSidebarOpen) {
      setSidebarOpen(true);
      setOpenMenus((prev) => ({ ...prev, [text]: true }));
    } else {
      setOpenMenus((prev) => ({ ...prev, [text]: !prev[text] }));
    }
  };

  const drawerContent = (
    <>
      <DrawerHeader>
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
        {visibleNavItems.map((item) => (
          <React.Fragment key={item.text}>
            {/* If the item has children, render an expandable parent */}
            {item.children ? (
              <>
                <Tooltip
                  title={!isSidebarOpen ? item.text : ""}
                  placement="right"
                >
                  <ListItem disablePadding sx={{ display: "block", mb: 0.5 }}>
                    <ListItemButton
                      onClick={() => handleParentClick(item.text)}
                      sx={{
                        minHeight: 48,
                        justifyContent: isSidebarOpen ? "initial" : "center",
                        px: 2.5,
                        borderRadius: 2,
                        "&:hover": { bgcolor: "slate.50" },
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
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        sx={{ opacity: isSidebarOpen ? 1 : 0 }}
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                      {isSidebarOpen &&
                        (openMenus[item.text] ? (
                          <ExpandLess color="action" />
                        ) : (
                          <ExpandMore color="action" />
                        ))}
                    </ListItemButton>
                  </ListItem>
                </Tooltip>

                {/* The collapsible sub-menu */}
                <Collapse
                  in={openMenus[item.text] && isSidebarOpen}
                  timeout="auto"
                  unmountOnExit
                >
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.text}
                        component={Link}
                        to={child.path}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        activeProps={{
                          className: "bg-blue-50 text-blue-600 rounded-lg",
                        }}
                        inactiveProps={{
                          className:
                            "text-slate-600 rounded-lg hover:bg-slate-50",
                        }}
                        sx={{
                          pl: 4, // Indent the sub-items
                          mb: 0.5,
                          minHeight: 40,
                        }}
                      >
                        <ListItemIcon
                          sx={{ minWidth: 0, mr: 2, color: "inherit" }}
                        >
                          {child.icon ? (
                            child.icon
                          ) : (
                            <FiberManualRecordIcon
                              sx={{ fontSize: 10, color: "inherit" }}
                            />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={child.text}
                          primaryTypographyProps={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              /* Normal standalone items (Dashboard, Customers, etc) */
              <Tooltip
                title={!isSidebarOpen ? item.text : ""}
                placement="right"
              >
                <ListItem disablePadding sx={{ display: "block", mb: 0.5 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    activeProps={{
                      className: "bg-blue-50 text-blue-600 rounded-lg",
                    }}
                    inactiveProps={{
                      className: "text-slate-600 rounded-lg hover:bg-slate-50",
                    }}
                    onClick={() => isMobile && setSidebarOpen(false)}
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
                        color: "inherit",
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
            )}
          </React.Fragment>
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
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {user?.username}
            </Typography>
            <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </Avatar>
          </Box>
        </Toolbar>
      </MuiAppBar>

      {isMobile ? (
        <MuiDrawer
          variant="temporary"
          open={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
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
        <Drawer variant="permanent" open={isSidebarOpen}>
          {drawerContent}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: "100%" }}>
        <DrawerHeader />
        <Outlet />
      </Box>
    </Box>
  );
}
