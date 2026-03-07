import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Brightness4,
  Brightness7,
  Logout,
  Public,
  Security,
  Flight,
  Radar,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const drawerWidth = 280;

const categoryIcons = {
  general: <Public />,
  defence: <Security />,
  aviation: <Flight />,
  telecommunication: <Radar />,
};

const categoryLabels = {
  general: 'General Dashboard',
  defence: 'Defence Dashboard',
  aviation: 'Aviation Dashboard',
  telecommunication: 'Telecommunication Dashboard',
};

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, accessibleDashboards } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDashboardClick = (dashboardType) => {
    navigate(`/dashboard/${dashboardType}`);
    setMobileOpen(false);
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <DashboardIcon sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap component="div">
          GNSS System
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 2, pt: 2 }}>
        <Typography variant="overline" color="text.secondary" sx={{ px: 2, mb: 1 }}>
          Dashboards
        </Typography>
        {accessibleDashboards.map((dashboard) => {
          const isActive = location.pathname === `/dashboard/${dashboard}`;
          return (
            <ListItem key={dashboard} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => handleDashboardClick(dashboard)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {categoryIcons[dashboard]}
                </ListItemIcon>
                <ListItemText
                  primary={categoryLabels[dashboard]}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Access Level
        </Typography>
        <Chip
          icon={user?.role === 'admin' ? <AdminPanelSettings /> : undefined}
          label={user?.role === 'admin' ? 'Administrator' : user?.category || 'User'}
          color={user?.role === 'admin' ? 'error' : 'primary'}
          size="small"
          variant="outlined"
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            GNSS Error Forecasting System
          </Typography>
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
              <Typography variant="subtitle2">{user?.username}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
