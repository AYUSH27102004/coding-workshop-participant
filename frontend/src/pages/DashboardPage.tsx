import { useEffect, useState } from 'react';
import { Typography, Paper, Box, CircularProgress, Alert, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Record<string, number | string | Array<{ name: string; count?: number; rating?: number }>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        setData(res.data);
      } catch {
        setError('Failed to load dashboard summary');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data || !user) return <Typography>No data returned from backend.</Typography>;

  const routeByRole: Record<string, string> = {
    admin: '/admin',
    hr: '/hr',
    manager: '/manager',
    employee: '/employee',
  };

  const cards = Object.entries(data).filter(([, value]) => typeof value === 'number');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }} color="primary" gutterBottom>
          Welcome, {user.name}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Role: <strong>{user.role}</strong>
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
        {cards.map(([key, value]) => (
          <Box key={key}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="overline">{key.replaceAll('_', ' ')}</Typography>
              <Typography variant="h4">{value as number}</Typography>
            </Paper>
          </Box>
        ))}
      </Box>

      <Button variant="contained" onClick={() => navigate(routeByRole[user.role])}>
        Open {user.role} dashboard
      </Button>
    </Box>
  );
};

export default DashboardPage;
