import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  role: string;
}

interface EmployeeProfile {
  id: number;
  user_id: number;
}

export default function ManagerDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [projectForm, setProjectForm] = useState({ title: '', description: '', assigned_to: '' });
  const [reviewForm, setReviewForm] = useState({ employee_id: '', rating: '3', feedback: '', date: new Date().toISOString().slice(0, 10) });
  const [planForm, setPlanForm] = useState({ employee_id: '', goal: '', progress: '0', status: 'Not Started' });

  const load = async () => {
    const [userRes, employeeRes, projectRes, reviewRes, planRes] = await Promise.all([
      api.get('/users'),
      api.get('/users/employees'),
      api.get('/projects'),
      api.get('/reviews'),
      api.get('/dev-plans'),
    ]);
    setUsers(userRes.data);
    setEmployees(employeeRes.data);
    setProjects(projectRes.data);
    setReviews(reviewRes.data);
    setPlans(planRes.data);
  };

  useEffect(() => {
    load().catch(() => setError('Failed to load manager data'));
  }, []);

  const employeeOptions = useMemo(() => {
    return employees.map((e) => ({
      employeeId: e.id,
      name: users.find((u) => u.id === e.user_id)?.name || `Employee #${e.id}`,
    }));
  }, [employees, users]);

  const submitProject = async () => {
    try {
      await api.post('/projects', { ...projectForm, assigned_to: Number(projectForm.assigned_to) });
      setSuccess('Project assigned');
      setProjectForm({ title: '', description: '', assigned_to: '' });
      await load();
    } catch {
      setError('Failed to create project');
    }
  };

  const submitReview = async () => {
    try {
      await api.post('/reviews', {
        ...reviewForm,
        employee_id: Number(reviewForm.employee_id),
        rating: Number(reviewForm.rating),
      });
      setSuccess('Review created');
      setReviewForm({ employee_id: '', rating: '3', feedback: '', date: new Date().toISOString().slice(0, 10) });
      await load();
    } catch {
      setError('Failed to create review');
    }
  };

  const submitPlan = async () => {
    try {
      await api.post('/dev-plans', {
        ...planForm,
        employee_id: Number(planForm.employee_id),
        progress: Number(planForm.progress),
      });
      setSuccess('Development plan created');
      setPlanForm({ employee_id: '', goal: '', progress: '0', status: 'Not Started' });
      await load();
    } catch {
      setError('Failed to create development plan');
    }
  };

  return (
    <Box>
      <Typography variant='h4' gutterBottom>Manager Dashboard</Typography>
      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6'>Assign Project</Typography>
            <TextField fullWidth label='Title' sx={{ mb: 1, mt: 1 }} value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
            <TextField fullWidth label='Description' sx={{ mb: 1 }} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
            <TextField select fullWidth label='Assign To' sx={{ mb: 1 }} value={projectForm.assigned_to} onChange={(e) => setProjectForm({ ...projectForm, assigned_to: e.target.value })}>
              {employeeOptions.map((e) => <MenuItem key={e.employeeId} value={e.employeeId}>{e.name}</MenuItem>)}
            </TextField>
            <Button variant='contained' onClick={submitProject}>Create</Button>
          </Paper>
        </Box>

        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6'>Create Review</Typography>
            <TextField select fullWidth label='Employee' sx={{ mb: 1, mt: 1 }} value={reviewForm.employee_id} onChange={(e) => setReviewForm({ ...reviewForm, employee_id: e.target.value })}>
              {employeeOptions.map((e) => <MenuItem key={e.employeeId} value={e.employeeId}>{e.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth label='Rating (1-5)' type='number' sx={{ mb: 1 }} value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })} />
            <TextField fullWidth label='Feedback' sx={{ mb: 1 }} value={reviewForm.feedback} onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })} />
            <TextField fullWidth type='date' sx={{ mb: 1 }} value={reviewForm.date} onChange={(e) => setReviewForm({ ...reviewForm, date: e.target.value })} />
            <Button variant='contained' onClick={submitReview}>Create</Button>
          </Paper>
        </Box>

        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6'>Create Dev Plan</Typography>
            <TextField select fullWidth label='Employee' sx={{ mb: 1, mt: 1 }} value={planForm.employee_id} onChange={(e) => setPlanForm({ ...planForm, employee_id: e.target.value })}>
              {employeeOptions.map((e) => <MenuItem key={e.employeeId} value={e.employeeId}>{e.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth label='Goal' sx={{ mb: 1 }} value={planForm.goal} onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })} />
            <TextField fullWidth label='Progress %' type='number' sx={{ mb: 1 }} value={planForm.progress} onChange={(e) => setPlanForm({ ...planForm, progress: e.target.value })} />
            <TextField fullWidth label='Status' sx={{ mb: 1 }} value={planForm.status} onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })} />
            <Button variant='contained' onClick={submitPlan}>Create</Button>
          </Paper>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2 }}>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Projects</Typography>
            {projects.map((p) => <Typography key={p.id} variant='body2'>#{p.id} {p.title} to Emp {p.assigned_to}</Typography>)}
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Reviews</Typography>
            {reviews.map((r) => <Typography key={r.id} variant='body2'>Emp {r.employee_id}: {r.rating}/5</Typography>)}
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>Development Plans</Typography>
            {plans.map((p) => <Typography key={p.id} variant='body2'>Emp {p.employee_id}: {p.goal}</Typography>)}
          </Paper>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant='h6' sx={{ mb: 1 }}>Team Performance Snapshot</Typography>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Employee ID</TableCell>
              <TableCell>Last Rating</TableCell>
              <TableCell>Pending Plans</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employeeOptions.map((e) => {
              const employeeReviews = reviews.filter((r) => r.employee_id === e.employeeId);
              const lastRating = employeeReviews.length ? employeeReviews[employeeReviews.length - 1].rating : '-';
              const pendingPlans = plans.filter((p) => p.employee_id === e.employeeId && p.status !== 'Completed').length;
              return (
                <TableRow key={e.employeeId}>
                  <TableCell>{e.employeeId}</TableCell>
                  <TableCell>{lastRating}</TableCell>
                  <TableCell>{pendingPlans}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
