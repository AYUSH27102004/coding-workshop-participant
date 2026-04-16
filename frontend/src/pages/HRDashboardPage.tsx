import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api';

interface DepartmentItem {
  id: number;
  name: string;
}

interface DepartmentSummaryItem {
  department_id: number;
  department_name: string;
  employees_onboarded: number;
  average_rating: number;
  payroll_paid_count: number;
  payroll_unpaid_count: number;
  top_performer_name: string | null;
  top_performer_rating: number | null;
}

interface RecommendationItem {
  employee_name: string;
  manager_name: string;
  message: string;
  timestamp: string;
}

interface HRDashboardData {
  handled_departments: DepartmentItem[];
  department_summaries: DepartmentSummaryItem[];
  recommendations: RecommendationItem[];
}

interface PayrollStatusItem {
  employee_name: string;
  role: 'employee' | 'manager' | string;
  department: string;
  salary_status: 'paid' | 'pending' | string;
}

interface EmployeeListItem {
  id: number;
  user_id: number;
  manager_id: number | null;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
}

export default function HRDashboardPage() {
  const [dashboard, setDashboard] = useState<HRDashboardData | null>(null);
  const [payrollRows, setPayrollRows] = useState<PayrollStatusItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [employeeRows, setEmployeeRows] = useState<EmployeeListItem[]>([]);
  const [employeeFilters, setEmployeeFilters] = useState({ performance: '', department: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmployees = async (filters = employeeFilters) => {
    const params = new URLSearchParams();
    if (filters.performance) params.set('performance', filters.performance);
    if (filters.department) params.set('department', filters.department);
    const endpoint = params.toString() ? `/employees?${params.toString()}` : '/employees';
    const res = await api.get(endpoint);
    setEmployeeRows(res.data);
  };

  const load = async () => {
    const [dashboardRes, payrollRes, usersRes] = await Promise.all([
      api.get('/hr/dashboard'),
      api.get('/hr/payroll-status'),
      api.get('/users'),
    ]);
    setDashboard(dashboardRes.data);
    setPayrollRows(payrollRes.data);
    setUsers(usersRes.data);
    await fetchEmployees({ performance: '', department: '' });
  };

  useEffect(() => {
    load()
      .catch(() => setError('Failed to load HR dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const departmentSummaries = useMemo(() => dashboard?.department_summaries ?? [], [dashboard?.department_summaries]);
  const recommendations = useMemo(() => dashboard?.recommendations ?? [], [dashboard?.recommendations]);

  const managerNameByEmployeeId = useMemo(() => {
    const employeeToUserId: Record<number, number> = {};
    employeeRows.forEach((row) => {
      employeeToUserId[row.id] = row.user_id;
    });

    const nameMap: Record<number, string> = {};
    employeeRows.forEach((row) => {
      if (row.manager_id === null) {
        nameMap[row.id] = '-';
        return;
      }
      const managerUserId = employeeToUserId[row.manager_id];
      const managerUser = users.find((u) => u.id === managerUserId);
      nameMap[row.id] = managerUser?.name ?? '-';
    });
    return nameMap;
  }, [employeeRows, users]);

  const payrollTotals = useMemo(() => {
    const paid = payrollRows.filter((row) => row.salary_status === 'paid').length;
    const pending = payrollRows.filter((row) => row.salary_status === 'pending').length;
    return { paid, pending };
  }, [payrollRows]);

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
          HR Dashboard
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          Department-wise HR insights for onboarding, performance, payroll, and manager recommendations.
        </Typography>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1.25 }}>Employees Per Department</Typography>
              <Grid container spacing={1.5}>
                {departmentSummaries.map((item) => (
                  <Grid key={item.department_id} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#f8fbff' }}>
                      <Typography variant='overline' color='text.secondary'>{item.department_name}</Typography>
                      <Typography variant='h5' sx={{ fontWeight: 800 }}>{item.employees_onboarded}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5, height: '100%' }}>
              <Typography variant='h6' sx={{ mb: 1.25 }}>Department Performance</Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={departmentSummaries}>
                    <XAxis dataKey='department_name' />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Bar dataKey='average_rating' fill='#1976d2' radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1.25 }}>Top Performer Per Department</Typography>
              <Stack spacing={1}>
                {departmentSummaries.map((item) => (
                  <Box key={`top-${item.department_id}`} sx={{ p: 1.2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>{item.department_name}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {item.top_performer_name ? `${item.top_performer_name} (${item.top_performer_rating}/5)` : 'No performer data'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant='h6' sx={{ mb: 1.25 }}>Payroll Status</Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#f3fff4' }}>
                    <Typography variant='overline' color='text.secondary'>Paid</Typography>
                    <Typography variant='h5' sx={{ fontWeight: 800, color: 'success.main' }}>{payrollTotals.paid}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#fff8f2' }}>
                    <Typography variant='overline' color='text.secondary'>Pending</Typography>
                    <Typography variant='h5' sx={{ fontWeight: 800, color: 'warning.main' }}>{payrollTotals.pending}</Typography>
                  </Box>
                </Grid>
              </Grid>

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
                      <TableCell>Name</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payrollRows.map((row, idx) => (
                      <TableRow key={`${row.employee_name}-${row.department}-${idx}`}>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.employee_name}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize', whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.role}</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.department}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize', whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.salary_status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Box sx={{ display: { xs: 'grid', sm: 'none' }, gap: 1.25 }}>
                {payrollRows.map((row, idx) => (
                  <Box key={`payroll-mobile-${idx}`} sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', mb: 0.5 }}>{row.employee_name}</Typography>
                    <Typography sx={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>Role: {row.role}</Typography>
                    <Typography sx={{ fontSize: '0.85rem' }}>Department: {row.department}</Typography>
                    <Typography sx={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>Status: {row.salary_status}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, pt: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Employee List</Typography>
            <Grid container spacing={1.25} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='Performance'
                  value={employeeFilters.performance}
                  onChange={async (e) => {
                    const next = { ...employeeFilters, performance: e.target.value };
                    setEmployeeFilters(next);
                    try {
                      setError('');
                      await fetchEmployees(next);
                    } catch {
                      setError('Failed to filter employee list');
                    }
                  }}
                >
                  <MenuItem value=''>All</MenuItem>
                  <MenuItem value='high'>High Performers</MenuItem>
                  <MenuItem value='low'>Low Performers</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='Department'
                  value={employeeFilters.department}
                  onChange={async (e) => {
                    const next = { ...employeeFilters, department: e.target.value };
                    setEmployeeFilters(next);
                    try {
                      setError('');
                      await fetchEmployees(next);
                    } catch {
                      setError('Failed to filter employee list');
                    }
                  }}
                >
                  <MenuItem value=''>All</MenuItem>
                  {(dashboard?.handled_departments ?? []).map((department) => (
                    <MenuItem key={department.id} value={String(department.id)}>{department.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Box sx={{ display: { xs: 'none', sm: 'block' }, overflowX: 'hidden', mb: 2 }}>
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
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Manager</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employeeRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant='body2' color='text.secondary'>No results found.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {employeeRows.map((employee) => {
                    const linkedUser = users.find((u) => u.id === employee.user_id);
                    const linkedDepartment = (dashboard?.handled_departments ?? []).find((d) => d.id === linkedUser?.department_id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{linkedUser?.name ?? '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{linkedUser?.email ?? '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{linkedUser?.role ?? '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{linkedDepartment?.name ?? '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{managerNameByEmployeeId[employee.id] ?? '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ display: { xs: 'grid', sm: 'none' }, gap: 1.25, mb: 2 }}>
              {employeeRows.length === 0 && (
                <Typography variant='body2' color='text.secondary' sx={{ fontSize: '0.85rem' }}>
                  No results found.
                </Typography>
              )}
              {employeeRows.map((employee) => {
                const linkedUser = users.find((u) => u.id === employee.user_id);
                const linkedDepartment = (dashboard?.handled_departments ?? []).find((d) => d.id === linkedUser?.department_id);
                return (
                  <Box key={`emp-mobile-${employee.id}`} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', mb: 0.5 }}>{linkedUser?.name ?? '-'}</Typography>
                    <Typography sx={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>Email: {linkedUser?.email ?? '-'}</Typography>
                    <Typography sx={{ fontSize: '0.85rem' }}>Role: {linkedUser?.role ?? '-'}</Typography>
                    <Typography sx={{ fontSize: '0.85rem' }}>Department: {linkedDepartment?.name ?? '-'}</Typography>
                    <Typography sx={{ fontSize: '0.85rem' }}>Manager: {managerNameByEmployeeId[employee.id] ?? '-'}</Typography>
                  </Box>
                );
              })}
            </Box>

            <Typography variant='h6' sx={{ mb: 2 }}>Manager Recommendations</Typography>
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
                  <TableCell>Manager</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recommendations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant='body2' color='text.secondary'>No recommendations found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {recommendations.map((rec, idx) => (
                  <TableRow key={`${rec.employee_name}-${rec.timestamp}-${idx}`}>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{rec.employee_name}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{rec.manager_name}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{rec.message}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{new Date(rec.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ display: { xs: 'grid', sm: 'none' }, gap: 1.25, px: 2.5, pb: 2.5 }}>
            {recommendations.length === 0 && (
              <Typography variant='body2' color='text.secondary' sx={{ fontSize: '0.85rem' }}>
                No recommendations found.
              </Typography>
            )}
            {recommendations.map((rec, idx) => (
              <Box key={`rec-mobile-${idx}`} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', mb: 0.5 }}>{rec.employee_name}</Typography>
                <Typography sx={{ fontSize: '0.85rem' }}>Manager: {rec.manager_name}</Typography>
                <Typography sx={{ fontSize: '0.85rem', wordBreak: 'break-word', my: 0.25 }}>Message: {rec.message}</Typography>
                <Typography sx={{ fontSize: '0.85rem' }}>{new Date(rec.timestamp).toLocaleString()}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
