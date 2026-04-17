import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Rating,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

interface ManagerDashboardData {
  manager: {
    id: number;
    name: string;
    email: string;
    role: string;
    department_id: number;
  };
  department_name: string;
  team_size: number;
  pending_projects_count: number;
  underperforming_count: number;
  underperforming_employees: string[];
  top_performers: Array<{ name: string; rating: number }>;
  team_average_ratings: Array<{ employee_name: string; average_rating: number }>;
  department_performance_trend: Array<{ month: string; average_rating: number }>;
  trend_status: 'improving' | 'declining' | string;
}

export default function ManagerDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<ManagerDashboardData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [projectForm, setProjectForm] = useState({ title: '', description: '', deadline: '', assigned_to: '' });
  const [reviewForm, setReviewForm] = useState({ employee_id: '', rating: '3', feedback: '', date: new Date().toISOString().slice(0, 10) });
  const [planForm, setPlanForm] = useState({ employee_id: '', goal: '', progress: '0', status: 'Not Started' });
  const [recommendationForm, setRecommendationForm] = useState({ employee_id: '', message: '' });
  const [projectFilter, setProjectFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [ratingOverrides, setRatingOverrides] = useState<Record<number, number>>({});

  const fetchProjects = async (filter = projectFilter) => {
    const params = new URLSearchParams();
    if (filter === 'pending' || filter === 'completed') {
      params.set('status', filter);
    }
    if (filter === 'overdue' || filter === 'upcoming') {
      params.set('deadline', filter);
    }
    const endpoint = params.toString() ? `/projects?${params.toString()}` : '/projects';
    const res = await api.get(endpoint);
    setProjects(res.data);
  };

  const fetchReviews = async (filter = reviewFilter) => {
    const params = new URLSearchParams();
    if (filter) params.set('rating', filter);
    const endpoint = params.toString() ? `/reviews?${params.toString()}` : '/reviews';
    const res = await api.get(endpoint);
    setReviews(res.data);
  };

  const fetchPlans = async (filter = planFilter) => {
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    const endpoint = params.toString() ? `/dev-plans?${params.toString()}` : '/dev-plans';
    const res = await api.get(endpoint);
    setPlans(res.data);
  };

  const fetchDashboard = async () => {
    const res = await api.get('/manager/dashboard');
    setDashboard(res.data);
  };

  const load = async () => {
    const [userRes, employeeRes] = await Promise.all([
      api.get('/users'),
      api.get('/users/employees'),
    ]);
    setUsers(userRes.data);
    setEmployees(employeeRes.data);

    await fetchDashboard();

    await Promise.all([
      fetchProjects(''),
      fetchReviews(''),
      fetchPlans(''),
    ]);
  };

  useEffect(() => {
    load().catch(() => setError('Failed to load manager data'));
  }, []);

  const employeeOptions = useMemo(() => {
    return employees
      .map((e) => {
        const linkedUser = users.find((u) => u.id === e.user_id);
        return {
          employeeId: e.id,
          name: linkedUser?.name || 'Unknown Employee',
          role: linkedUser?.role || '',
        };
      })
      .filter((item) => item.role === 'employee');
  }, [employees, users]);

  const employeeNameById = useMemo(() => {
    const map: Record<number, string> = {};
    employeeOptions.forEach((employee) => {
      map[employee.employeeId] = employee.name;
    });
    return map;
  }, [employeeOptions]);

  const teamAverageByName = useMemo(() => {
    const map: Record<string, number> = {};
    (dashboard?.team_average_ratings ?? []).forEach((item) => {
      map[item.employee_name] = item.average_rating;
    });
    return map;
  }, [dashboard?.team_average_ratings]);

  const handleEmployeeRatingChange = async (employeeId: number, employeeName: string, newValue: number | null) => {
    if (newValue === null) return;
    const previousValue = ratingOverrides[employeeId];

    setError('');
    setSuccess('');
    setRatingOverrides((prev) => ({ ...prev, [employeeId]: newValue }));

    try {
      await api.post('/ratings', {
        employee_id: employeeId,
        rating: newValue,
      });
      await fetchDashboard();
      setRatingOverrides((prev) => {
        const next = { ...prev };
        delete next[employeeId];
        return next;
      });
      setSuccess(`Rating saved for ${employeeName}`);
    } catch {
      setRatingOverrides((prev) => {
        const next = { ...prev };
        if (previousValue === undefined) {
          delete next[employeeId];
        } else {
          next[employeeId] = previousValue;
        }
        return next;
      });
      setError('Failed to save employee rating');
    }
  };

  const submitProject = async () => {
    try {
      setError('');
      setSuccess('');
      await api.post('/projects', {
        ...projectForm,
        deadline: projectForm.deadline || null,
        assigned_to: Number(projectForm.assigned_to),
      });
      setSuccess('Project assigned');
      setProjectForm({ title: '', description: '', deadline: '', assigned_to: '' });
      await fetchProjects(projectFilter);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create project');
    }
  };

  const submitReview = async () => {
    try {
      setError('');
      setSuccess('');
      await api.post('/reviews', {
        ...reviewForm,
        employee_id: Number(reviewForm.employee_id),
        rating: Number(reviewForm.rating),
      });
      setSuccess('Review created');
      setReviewForm({ employee_id: '', rating: '3', feedback: '', date: new Date().toISOString().slice(0, 10) });
      await fetchReviews(reviewFilter);
    } catch {
      setError('Failed to create review');
    }
  };

  const submitPlan = async () => {
    try {
      setError('');
      setSuccess('');
      await api.post('/dev-plans', {
        ...planForm,
        employee_id: Number(planForm.employee_id),
        progress: Number(planForm.progress),
      });
      setSuccess('Development plan created');
      setPlanForm({ employee_id: '', goal: '', progress: '0', status: 'Not Started' });
      await fetchPlans(planFilter);
    } catch {
      setError('Failed to create development plan');
    }
  };

  const submitRecommendation = async () => {
    try {
      setError('');
      setSuccess('');
      await api.post('/recommendations', {
        employee_id: Number(recommendationForm.employee_id),
        message: recommendationForm.message,
      });
      setSuccess('Recommendation sent to HR');
      setRecommendationForm({ employee_id: '', message: '' });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to send recommendation');
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #eef4ff 100%)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant='h4' sx={{ fontWeight: 800, lineHeight: 1.2 }} gutterBottom>Manager Dashboard</Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          {dashboard?.manager?.name ? `${dashboard.manager.name} - ` : ''}
          {dashboard?.department_name ? `${dashboard.department_name} Department` : 'Assign work, run reviews, and monitor team development progress.'}
        </Typography>
      </Box>

      <Typography variant='h4' gutterBottom sx={{ display: 'none' }}>Manager Dashboard</Typography>
      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='overline' color='text.secondary'>Team Size</Typography>
              <Typography variant='h4' sx={{ fontWeight: 800 }}>{dashboard?.team_size ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='overline' color='text.secondary'>Pending Projects</Typography>
              <Typography variant='h4' sx={{ fontWeight: 800 }}>{dashboard?.pending_projects_count ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='overline' color='text.secondary'>Underperforming Employees</Typography>
              <Typography variant='h4' sx={{ fontWeight: 800 }}>{dashboard?.underperforming_count ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='overline' color='text.secondary'>Trend Status</Typography>
              <Chip
                label={dashboard?.trend_status ?? 'declining'}
                color={dashboard?.trend_status === 'improving' ? 'success' : 'warning'}
                sx={{ mt: 0.75, textTransform: 'capitalize' }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1.25 }}>Top Performers (Department)</Typography>
              <Stack spacing={0.75}>
                {(dashboard?.top_performers ?? []).length === 0 && <Typography variant='body2' color='text.secondary'>No top performer data.</Typography>}
                {(dashboard?.top_performers ?? []).map((item, idx) => (
                  <Typography key={`${item.name}-${idx}`} variant='body2'>
                    {idx + 1}. {item.name} - {item.rating}/5
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1.25 }}>Department Performance Trend</Typography>
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={dashboard?.department_performance_trend ?? []}>
                    <XAxis dataKey='month' />
                    <YAxis domain={[0, 5]} allowDecimals />
                    <Tooltip />
                    <Line type='monotone' dataKey='average_rating' stroke='#1976d2' strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1.25 }}>Team Star Ratings</Typography>
              <Grid container spacing={1.25}>
                {employeeOptions.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='body2' color='text.secondary'>No team employees available for rating.</Typography>
                  </Grid>
                )}
                {employeeOptions.map((employee) => {
                  const currentRating = ratingOverrides[employee.employeeId] ?? teamAverageByName[employee.name] ?? 0;
                  return (
                    <Grid key={`team-rating-${employee.employeeId}`} size={{ xs: 12, sm: 6, lg: 4 }}>
                      <Box sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{employee.name}</Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mb: 0.75 }}>
                          Current rating: {Number(currentRating).toFixed(1)}/5
                        </Typography>
                        <Rating
                          name={`employee-rating-${employee.employeeId}`}
                          precision={1}
                          value={currentRating}
                          onChange={(_, value) => handleEmployeeRatingChange(employee.employeeId, employee.name, value)}
                        />
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 1.25 }}>Assign Project</Typography>
            <TextField fullWidth label='Title' sx={{ mb: 1 }} value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
            <TextField fullWidth label='Description' sx={{ mb: 1 }} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
            <TextField
              fullWidth
              label='Deadline'
              type='date'
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ mb: 1 }}
              value={projectForm.deadline}
              onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
            />
            <TextField select fullWidth label='Assign To' sx={{ mb: 1 }} value={projectForm.assigned_to} onChange={(e) => setProjectForm({ ...projectForm, assigned_to: e.target.value })}>
              {employeeOptions.map((e) => <MenuItem key={e.employeeId} value={e.employeeId}>{e.name}</MenuItem>)}
            </TextField>
            <Button fullWidth variant='contained' sx={{ mb: 0.5 }} onClick={submitProject}>Create</Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 1.25 }}>Create Review</Typography>
            <TextField select fullWidth label='Employee' sx={{ mb: 1 }} value={reviewForm.employee_id} onChange={(e) => setReviewForm({ ...reviewForm, employee_id: e.target.value })}>
              {employeeOptions.map((e) => <MenuItem key={e.employeeId} value={e.employeeId}>{e.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth label='Rating (1-5)' type='number' sx={{ mb: 1 }} value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })} />
            <TextField fullWidth label='Feedback' sx={{ mb: 1 }} value={reviewForm.feedback} onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })} />
            <TextField fullWidth type='date' sx={{ mb: 1 }} value={reviewForm.date} onChange={(e) => setReviewForm({ ...reviewForm, date: e.target.value })} />
            <Button fullWidth variant='contained' sx={{ mb: 0.5 }} onClick={submitReview}>Create</Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 1.25 }}>Create Dev Plan</Typography>
            <TextField select fullWidth label='Employee' sx={{ mb: 1 }} value={planForm.employee_id} onChange={(e) => setPlanForm({ ...planForm, employee_id: e.target.value })}>
              {employeeOptions.map((e) => <MenuItem key={e.employeeId} value={e.employeeId}>{e.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth label='Goal' sx={{ mb: 1 }} value={planForm.goal} onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })} />
            <TextField fullWidth label='Progress %' type='number' sx={{ mb: 1 }} value={planForm.progress} onChange={(e) => setPlanForm({ ...planForm, progress: e.target.value })} />
            <TextField fullWidth label='Status' sx={{ mb: 1 }} value={planForm.status} onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })} />
            <Button fullWidth variant='contained' sx={{ mb: 0.5 }} onClick={submitPlan}>Create</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1 }}>Projects</Typography>
              <Grid container spacing={1} sx={{ mb: 1.25 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    fullWidth
                    size='small'
                    label='Project Filter'
                    value={projectFilter}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setProjectFilter(value);
                      try {
                        setError('');
                        await fetchProjects(value);
                      } catch {
                        setError('Failed to filter projects');
                      }
                    }}
                  >
                    <MenuItem value=''>All</MenuItem>
                    <MenuItem value='pending'>Pending</MenuItem>
                    <MenuItem value='completed'>Completed</MenuItem>
                    <MenuItem value='overdue'>Overdue</MenuItem>
                    <MenuItem value='upcoming'>Upcoming</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
              <Stack spacing={0.75}>
                {projects.length === 0 && <Typography variant='body2' color='text.secondary'>No results found.</Typography>}
                {projects.map((p) => (
                  <Typography key={p.id} variant='body2'>
                    #{p.id} {p.title} to {p.assigned_to_name || employeeNameById[p.assigned_to] || 'Unknown Employee'}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1 }}>Reviews</Typography>
              <Grid container spacing={1} sx={{ mb: 1.25 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    fullWidth
                    size='small'
                    label='Rating'
                    value={reviewFilter}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setReviewFilter(value);
                      try {
                        setError('');
                        await fetchReviews(value);
                      } catch {
                        setError('Failed to filter reviews');
                      }
                    }}
                  >
                    <MenuItem value=''>All</MenuItem>
                    <MenuItem value='high'>High Rating (&gt;=4)</MenuItem>
                    <MenuItem value='average'>Average (3)</MenuItem>
                    <MenuItem value='low'>Low (&lt;3)</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
              <Stack spacing={0.75}>
                {reviews.length === 0 && <Typography variant='body2' color='text.secondary'>No results found.</Typography>}
                {reviews.map((r) => (
                  <Typography key={r.id} variant='body2'>
                    {r.employee_name || employeeNameById[r.employee_id] || 'Unknown Employee'}: {r.rating}/5
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1 }}>Development Plans</Typography>
              <Grid container spacing={1} sx={{ mb: 1.25 }}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    fullWidth
                    size='small'
                    label='Plan Status'
                    value={planFilter}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setPlanFilter(value);
                      try {
                        setError('');
                        await fetchPlans(value);
                      } catch {
                        setError('Failed to filter development plans');
                      }
                    }}
                  >
                    <MenuItem value=''>All</MenuItem>
                    <MenuItem value='active'>Active</MenuItem>
                    <MenuItem value='completed'>Completed</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
              <Stack spacing={0.75}>
                {plans.length === 0 && <Typography variant='body2' color='text.secondary'>No results found.</Typography>}
                {plans.map((p) => (
                  <Typography key={p.id} variant='body2'>
                    {p.employee_name || employeeNameById[p.employee_id] || 'Unknown Employee'}: {p.goal}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant='h6' sx={{ mb: 1.25 }}>Recommend Employee To HR</Typography>
          <TextField
            select
            fullWidth
            label='Employee'
            sx={{ mb: 1 }}
            value={recommendationForm.employee_id}
            onChange={(e) => setRecommendationForm({ ...recommendationForm, employee_id: e.target.value })}
          >
            {employeeOptions.map((e) => <MenuItem key={e.employeeId} value={e.employeeId}>{e.name}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label='Recommendation Message'
            sx={{ mb: 1.25 }}
            value={recommendationForm.message}
            onChange={(e) => setRecommendationForm({ ...recommendationForm, message: e.target.value })}
          />
          <Button fullWidth variant='contained' sx={{ mb: 0.5 }} onClick={submitRecommendation} disabled={!recommendationForm.employee_id || recommendationForm.message.trim().length < 3}>
            Send Recommendation
          </Button>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, pt: 2.5 }}>
        <Typography variant='h6' sx={{ mb: 1.5 }}>Team Performance Snapshot</Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'hidden' }}>
        <Table
          size='small'
          sx={{
            tableLayout: 'fixed',
            width: '100%',
            '& .MuiTableCell-root': {
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              fontSize: { sm: '0.8rem', md: '0.875rem' },
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Last Rating</TableCell>
              <TableCell>Pending Plans</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employeeOptions.map((e) => {
              const liveRating = ratingOverrides[e.employeeId] ?? teamAverageByName[e.name];
              const lastRating = liveRating !== undefined ? Number(liveRating).toFixed(1) : '-';
              const pendingPlans = plans.filter((p) => p.employee_id === e.employeeId && p.status !== 'Completed').length;
              return (
                <TableRow key={e.employeeId}>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.name}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{lastRating}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{pendingPlans}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
          </Box>

          <Box sx={{ display: { xs: 'grid', sm: 'none' }, gap: 1.25, px: 2.5, pb: 2.5 }}>
            {employeeOptions.map((e) => {
              const liveRating = ratingOverrides[e.employeeId] ?? teamAverageByName[e.name];
              const lastRating = liveRating !== undefined ? Number(liveRating).toFixed(1) : '-';
              const pendingPlans = plans.filter((p) => p.employee_id === e.employeeId && p.status !== 'Completed').length;
              return (
                <Box key={`snapshot-mobile-${e.employeeId}`} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', mb: 0.5 }}>{e.name}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}>Last Rating: {lastRating}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}>Pending Plans: {pendingPlans}</Typography>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
