import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Rating,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api';

interface DashboardEmployee {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
}

interface DashboardProject {
  id: number;
  title: string;
  description: string;
  deadline: string | null;
  assigned_by: number;
}

interface DashboardSkill {
  id: number;
  name: string;
  type: 'required' | 'optional' | string;
}

interface DashboardPerformance {
  month: string;
  rating: number;
  tasks_completed: number;
  feedback: string;
}

interface DashboardReport {
  summary: string;
  strengths: string;
  weaknesses: string;
  suggestions: string;
}

interface EmployeeDashboardResponse {
  employee: DashboardEmployee;
  projects: DashboardProject[];
  skills: DashboardSkill[];
  performance: DashboardPerformance | null;
  current_rating?: number | null;
  feedback?: string | null;
  report: DashboardReport | null;
}

export default function EmployeeDashboardPage() {
  const [dashboard, setDashboard] = useState<EmployeeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = async (silent = false) => {
    try {
      setError('');
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await api.get('/employee/dashboard');
      setDashboard(res.data);
    } catch {
      setError('Failed to load employee dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const intervalId = window.setInterval(() => {
      fetchDashboard(true);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  const requiredSkills = useMemo(
    () => (dashboard?.skills ?? []).filter((skill) => skill.type === 'required'),
    [dashboard?.skills],
  );
  const optionalSkills = useMemo(
    () => (dashboard?.skills ?? []).filter((skill) => skill.type === 'optional'),
    [dashboard?.skills],
  );

  const performanceTrendData = useMemo(() => {
    if (!dashboard?.performance) return [];
    return [{ month: dashboard.performance.month, rating: dashboard.performance.rating }];
  }, [dashboard?.performance]);

  const tasksData = useMemo(() => {
    if (!dashboard?.performance) return [];
    return [{ label: dashboard.performance.month, tasks: dashboard.performance.tasks_completed }];
  }, [dashboard?.performance]);

  const currentRatingValue = dashboard?.current_rating ?? dashboard?.performance?.rating ?? 0;
  const managerRatingRounded = Math.round(currentRatingValue);
  const managerRatingText =
    currentRatingValue > 0
      ? `${Number.isInteger(currentRatingValue) ? currentRatingValue : currentRatingValue.toFixed(1)}/5`
      : 'Not rated yet';
  const managerStarsText = managerRatingRounded > 0 ? '⭐'.repeat(managerRatingRounded) : 'Not rated yet';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

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
        <Typography variant='h4' sx={{ fontWeight: 800, lineHeight: 1.2 }} gutterBottom>
          Employee Dashboard
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          Welcome back{dashboard?.employee?.name ? `, ${dashboard.employee.name}` : ''}. Track your assigned work, skills, performance, and report in one view.
        </Typography>
        <Box sx={{ mt: 1.25 }}>
          <Button variant='outlined' size='small' onClick={() => fetchDashboard(true)} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
      {!dashboard && !error && <Alert severity='warning' sx={{ mb: 2 }}>No dashboard data available.</Alert>}

      <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, minHeight: 240, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 1.25 }}>Assigned Projects</Typography>
            <Divider sx={{ mb: 1.5 }} />
            <Stack spacing={1.25}>
              {(dashboard?.projects ?? []).length === 0 && (
                <Typography variant='body2' color='text.secondary'>No assigned projects found.</Typography>
              )}
              {(dashboard?.projects ?? []).map((project) => (
                <Box key={project.id} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#f8fbff', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                    {project.title}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Deadline: {project.deadline ?? 'Not set'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, minHeight: 240, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 1.25 }}>Skills to Learn</Typography>
            <Divider sx={{ mb: 1.5 }} />

            <Typography variant='subtitle2' sx={{ mb: 1, fontWeight: 700 }}>Required Skills</Typography>
            <Stack direction='row' spacing={1} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
              {requiredSkills.length === 0 && <Typography variant='body2' color='text.secondary'>No required skills assigned.</Typography>}
              {requiredSkills.map((skill) => <Chip key={skill.id} label={skill.name} color='primary' variant='filled' />)}
            </Stack>

            <Typography variant='subtitle2' sx={{ mb: 1, fontWeight: 700 }}>Optional Certifications</Typography>
            <Stack direction='row' spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {optionalSkills.length === 0 && <Typography variant='body2' color='text.secondary'>No optional certifications assigned.</Typography>}
              {optionalSkills.map((skill) => <Chip key={skill.id} label={skill.name} variant='outlined' />)}
            </Stack>
          </CardContent>
        </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, minHeight: 320, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 1.25 }}>Performance</Typography>
            <Divider sx={{ mb: 1.5 }} />

            {dashboard?.performance ? (
              <>
                <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                  <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#f8fbff', border: '1px solid', borderColor: 'divider' }}>
                    <Tooltip title='Based on monthly performance metrics' placement='top' arrow>
                      <Typography variant='caption' color='text.secondary'>Last Month Performance Score</Typography>
                    </Tooltip>
                    <Typography variant='h5' sx={{ fontWeight: 800 }}>{dashboard.performance.rating}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Performance Score: {dashboard.performance.rating}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: '#f8fbff', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant='caption' color='text.secondary'>Tasks Completed</Typography>
                    <Typography variant='h5' sx={{ fontWeight: 800 }}>{dashboard.performance.tasks_completed}</Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant='subtitle2' sx={{ mb: 0.75, fontWeight: 700 }}>Performance Trend</Typography>
                  <Box sx={{ height: 150 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart data={performanceTrendData}>
                        <XAxis dataKey='month' />
                        <YAxis domain={[0, 5]} allowDecimals={false} />
                        <RechartsTooltip />
                        <Line type='monotone' dataKey='rating' stroke='#1976d2' strokeWidth={2.5} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>

                <Box>
                  <Typography variant='subtitle2' sx={{ mb: 0.75, fontWeight: 700 }}>Tasks</Typography>
                  <Box sx={{ height: 150 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={tasksData}>
                        <XAxis dataKey='label' />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Bar dataKey='tasks' fill='#2e7d32' radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </>
            ) : (
              <Typography variant='body2' color='text.secondary'>No performance data found for last month.</Typography>
            )}
          </CardContent>
        </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, minHeight: 320, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 1.25 }}>Performance Report</Typography>
            <Divider sx={{ mb: 1.5 }} />

            {dashboard?.report ? (
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Summary</Typography>
                  <Typography variant='body2' color='text.secondary'>{dashboard.report.summary}</Typography>
                </Box>
                <Box>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Strengths</Typography>
                  <Typography variant='body2' color='text.secondary'>{dashboard.report.strengths}</Typography>
                </Box>
                <Box>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Weaknesses</Typography>
                  <Typography variant='body2' color='text.secondary'>{dashboard.report.weaknesses}</Typography>
                </Box>
                <Box>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>Suggestions</Typography>
                  <Typography variant='body2' color='text.secondary'>{dashboard.report.suggestions}</Typography>
                </Box>
              </Stack>
            ) : (
              <Typography variant='body2' color='text.secondary'>No report available for this employee.</Typography>
            )}
          </CardContent>
        </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Tooltip title='Given by your manager' placement='top' arrow>
                <Typography variant='h6' sx={{ mb: 1.25 }}>Manager Rating</Typography>
              </Tooltip>
              <Divider sx={{ mb: 1.5 }} />

              <Stack spacing={1}>
                <Rating value={currentRatingValue} readOnly precision={0.5} />
                <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                  Manager Rating: {managerStarsText} ({managerRatingText})
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {dashboard?.feedback?.trim() ? dashboard.feedback : 'No feedback available yet.'}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
