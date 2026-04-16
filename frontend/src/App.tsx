import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/Layout';
import AdminPanelPage from './pages/AdminPanelPage.tsx';
import ManagerDashboardPage from './pages/ManagerDashboardPage.tsx';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage.tsx';
import HRDashboardPage from './pages/HRDashboardPage.tsx';

const customTheme = createTheme({
  palette: { primary: { main: '#1976d2' }, background: { default: '#f4f6f8' } },
});

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? <>{children}</> : <Navigate to='/login' replace />;
};

const RoleRoute = ({
  roles,
  children,
}: {
  roles: Array<'admin' | 'hr' | 'manager' | 'employee'>;
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  if (!user) return <Navigate to='/login' replace />;
  return roles.includes(user.role) ? <>{children}</> : <Navigate to='/dashboard' replace />;
};

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/' element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to='/dashboard' replace />} />
              <Route path='dashboard' element={<DashboardPage />} />
              <Route path='admin' element={<RoleRoute roles={['admin']}><AdminPanelPage /></RoleRoute>} />
              <Route path='manager' element={<RoleRoute roles={['manager']}><ManagerDashboardPage /></RoleRoute>} />
              <Route path='employee' element={<RoleRoute roles={['employee']}><EmployeeDashboardPage /></RoleRoute>} />
              <Route path='hr' element={<RoleRoute roles={['hr']}><HRDashboardPage /></RoleRoute>} />
              <Route path='*' element={<div>Page not found</div>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
