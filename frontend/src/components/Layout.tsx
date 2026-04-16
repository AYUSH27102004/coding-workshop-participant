import { useState } from 'react';
import {
  Box,
  Drawer,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  AppBar,
  Toolbar,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupsIcon from '@mui/icons-material/Groups';
import WorkIcon from '@mui/icons-material/Work';
import InsightsIcon from '@mui/icons-material/Insights';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import MenuIcon from '@mui/icons-material/Menu';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: ['admin', 'hr', 'manager', 'employee'] },
    { label: 'Admin Panel', path: '/admin', icon: <AdminPanelSettingsIcon />, roles: ['admin'] },
    { label: 'HR Dashboard', path: '/hr', icon: <InsightsIcon />, roles: ['hr'] },
    { label: 'Manager Dashboard', path: '/manager', icon: <GroupsIcon />, roles: ['manager'] },
    { label: 'Employee Dashboard', path: '/employee', icon: <WorkIcon />, roles: ['employee'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const drawerContent = (
    <>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} color="primary.main">
          Navigation
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ overflow: 'auto', py: 1 }}>
        <List>
          {navItems
            .filter((item) => user && item.roles.includes(user.role))
            .map((item) => (
              <ListItemButton
                key={item.path}
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  mx: 1,
                  borderRadius: 1.5,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
        </List>
      </Box>
    </>
  );

  return (
    <Box sx={{ minHeight: '100vh', width: '100%', bgcolor: '#f3f6fb' }}>
      <Grid container sx={{ minHeight: '100vh', width: '100%', flexWrap: 'nowrap' }}>
        <Grid
          size={{ xs: 0, md: 3, lg: 2.5 }}
          sx={{
            display: { xs: 'none', md: 'block' },
            minWidth: { md: 220 },
            maxWidth: { md: 280 },
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#ffffff',
          }}
        >
          <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {drawerContent}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 9, lg: 9.5 }} sx={{ minWidth: 0, width: '100%' }}>
          <AppBar
            position="sticky"
            color="inherit"
            elevation={0}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: '#ffffff',
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 1.5, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 700 }}>
                Employee Performance Management
              </Typography>
              <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
                {user?.name} ({user?.role})
              </Typography>
              <IconButton color="primary" onClick={handleLogout}>
                <ExitToAppIcon />
              </IconButton>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              width: '100%',
              minWidth: 0,
              px: { xs: 2, sm: 3, md: 4 },
              py: { xs: 2, sm: 3 },
            }}
          >
            <Box sx={{ width: '100%', minWidth: 0 }}>
              <Outlet />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: { xs: '78vw', sm: 320 },
            maxWidth: '100%',
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Layout;
