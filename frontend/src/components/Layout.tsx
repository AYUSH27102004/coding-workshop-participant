import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Typography, AppBar, Toolbar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupsIcon from '@mui/icons-material/Groups';
import WorkIcon from '@mui/icons-material/Work';
import InsightsIcon from '@mui/icons-material/Insights';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const Layout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#1976d2' }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ACME Performance & Development
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user?.name} ({user?.role})
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <ExitToAppIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Left Sidebar Navigation */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar /> {/* Creates spacing under the top app bar */}
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {navItems
              .filter((item) => user && item.roles.includes(user.role))
              .map((item) => (
                <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet /> {/* This is where the react-router child pages inject their code */}
      </Box>
    </Box>
  );
};

export default Layout;
