import { useEffect, useState } from 'react';
import { Typography, Card, CardContent, Box, CircularProgress, Alert, Button, Stack, Grid } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

interface SummaryCard {
  label: string;
  value: number | string;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<SummaryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        setError('');
        if (user.role === 'admin') {
          const res = await api.get('/dashboard/summary');
          setCards([
            { label: 'Total Users', value: res.data.total_users ?? 0 },
            { label: 'Total Projects', value: res.data.total_projects ?? 0 },
            { label: 'Total Reviews', value: res.data.total_reviews ?? 0 },
          ]);
        } else if (user.role === 'hr') {
          const [dashboardRes, payrollRes] = await Promise.all([
            api.get('/hr/dashboard'),
            api.get('/hr/payroll-status'),
          ]);

          const departmentSummaries = dashboardRes.data?.department_summaries ?? [];
          const recommendations = dashboardRes.data?.recommendations ?? [];
          const paidCount = (payrollRes.data ?? []).filter((row: { salary_status: string }) => row.salary_status === 'paid').length;
          const pendingCount = (payrollRes.data ?? []).filter((row: { salary_status: string }) => row.salary_status === 'pending').length;
          const onboarded = departmentSummaries.reduce((total: number, row: { employees_onboarded?: number }) => total + (row.employees_onboarded ?? 0), 0);

          setCards([
            { label: 'Handled Departments', value: (dashboardRes.data?.handled_departments ?? []).length },
            { label: 'Employees Onboarded', value: onboarded },
            { label: 'Payroll Paid', value: paidCount },
            { label: 'Payroll Pending', value: pendingCount },
            { label: 'Recommendations', value: recommendations.length },
          ]);
        } else if (user.role === 'manager') {
          const res = await api.get('/manager/dashboard');
          setCards([
            { label: 'Team Size', value: res.data.team_size ?? 0 },
            { label: 'Pending Projects', value: res.data.pending_projects_count ?? 0 },
            { label: 'Underperforming', value: res.data.underperforming_count ?? 0 },
            { label: 'Top Performers', value: (res.data.top_performers ?? []).length },
          ]);
        } else {
          const res = await api.get('/employee/dashboard');
          const skills = res.data?.skills ?? [];
          setCards([
            { label: 'Assigned Projects', value: (res.data?.projects ?? []).length },
            { label: 'Required Skills', value: skills.filter((s: { type: string }) => s.type === 'required').length },
            { label: 'Optional Skills', value: skills.filter((s: { type: string }) => s.type === 'optional').length },
            { label: 'Performance Month', value: res.data?.performance?.month ?? 'N/A' },
          ]);
        }
      } catch {
        setError('Failed to load dashboard summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [navigate, user?.role]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) return <Typography>No data returned from backend.</Typography>;
  if (cards.length === 0) return <Typography>No data returned from backend.</Typography>;

  const routeByRole: Record<string, string> = {
    admin: '/admin',
    hr: '/hr',
    manager: '/manager',
    employee: '/employee',
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box
        sx={{
          mb: 4,
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #eef4ff 100%)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }} color="primary" gutterBottom>
          Welcome, {user.name}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          You are signed in as <strong>{user.role}</strong>
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.5,
                bgcolor: '#ffffff',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={1}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                    {card.value}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Button variant="contained" size="large" onClick={() => navigate(routeByRole[user.role])}>
        Open {user.role} dashboard
      </Button>
    </Box>
  );
};

export default DashboardPage;
