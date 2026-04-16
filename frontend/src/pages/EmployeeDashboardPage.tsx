import { useEffect, useState } from 'react';
import { Box, Paper, Typography, Alert } from '@mui/material';
import api from '../services/api';

export default function EmployeeDashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/projects'), api.get('/reviews'), api.get('/dev-plans')])
      .then(([p, r, d]) => {
        setProjects(p.data);
        setReviews(r.data);
        setPlans(d.data);
      })
      .catch(() => setError('Failed to load employee data'));
  }, []);

  return (
    <Box>
      <Typography variant='h4' gutterBottom>Employee Dashboard</Typography>
      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2 }}>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Assigned Tasks / Projects</Typography>
            {projects.map((p) => (
              <Typography key={p.id} variant='body2'>#{p.id} {p.title}</Typography>
            ))}
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Performance Reviews</Typography>
            {reviews.map((r) => (
              <Typography key={r.id} variant='body2'>Rating {r.rating}: {r.feedback}</Typography>
            ))}
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Development Plans</Typography>
            {plans.map((p) => (
              <Typography key={p.id} variant='body2'>{p.goal} ({p.progress}%)</Typography>
            ))}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
