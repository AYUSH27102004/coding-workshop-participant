import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'manager' | 'employee';
  department_id: number | null;
}

interface Department {
  id: number;
  name: string;
}

interface EmployeeProfile {
  id: number;
  user_id: number;
  manager_id: number | null;
}

interface EmployeeFilters {
  performance: string;
  department: string;
}

interface AdminOverviewItem {
  department_name: string;
  avg_manager_rating: number;
  avg_performance_score: number;
  projects_on_time: number;
  projects_delayed: number;
  completion_rate: number;
}

const initialUserForm = {
  name: '',
  email: '',
  password: 'demo123',
  role: 'employee',
  department_id: '',
};

export default function AdminPanelPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [employeeList, setEmployeeList] = useState<EmployeeProfile[]>([]);
  const [form, setForm] = useState(initialUserForm);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [employeeFilters, setEmployeeFilters] = useState<EmployeeFilters>({ performance: '', department: '' });
  const [departmentOverview, setDepartmentOverview] = useState<AdminOverviewItem[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchEmployeeList = async (filters = employeeFilters) => {
    const params = new URLSearchParams();
    if (filters.performance) params.set('performance', filters.performance);
    if (filters.department) params.set('department', filters.department);
    const endpoint = params.toString() ? `/employees?${params.toString()}` : '/employees';
    const employeesRes = await api.get(endpoint);
    setEmployeeList(employeesRes.data);
  };

  const loadData = async () => {
    const [usersRes, depRes, employeesRes, overviewRes] = await Promise.all([
      api.get('/users'),
      api.get('/departments'),
      api.get('/users/employees'),
      api.get('/admin/overview'),
    ]);
    setUsers(usersRes.data);
    setDepartments(depRes.data);
    setEmployees(employeesRes.data);
    setEmployeeList(employeesRes.data);
    setDepartmentOverview(overviewRes.data);
  };

  useEffect(() => {
    loadData().catch(() => setError('Failed to load admin data'));
  }, []);

  const createUser = async () => {
    try {
      setError('');
      await api.post('/users', {
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
      });
      setForm(initialUserForm);
      setSuccess('User created');
      await loadData();
    } catch {
      setError('Failed to create user');
    }
  };

  const deleteUser = async (id: number) => {
    try {
      setError('');
      await api.delete(`/users/${id}`);
      setSuccess('User deleted');
      await loadData();
    } catch {
      setError('Failed to delete user');
    }
  };

  const assignManager = async () => {
    try {
      setError('');
      await api.post(`/users/employees/${selectedEmployee}/manager`, {
        manager_employee_id: Number(selectedManager),
      });
      setSuccess('Manager assigned');
      await loadData();
    } catch {
      setError('Failed to assign manager');
    }
  };

  const employeeUsers = users.filter((u) => u.role === 'employee');
  const managerUsers = users.filter((u) => u.role === 'manager');

  const managerNameByEmployeeId = useMemo(() => {
    const employeeToUserId: Record<number, number> = {};
    employees.forEach((employee) => {
      employeeToUserId[employee.id] = employee.user_id;
    });

    const map: Record<number, string> = {};
    employeeList.forEach((employee) => {
      if (employee.manager_id === null) {
        map[employee.id] = '-';
        return;
      }
      const managerUserId = employeeToUserId[employee.manager_id];
      const managerUser = users.find((u) => u.id === managerUserId);
      map[employee.id] = managerUser?.name ?? '-';
    });
    return map;
  }, [employees, employeeList, users]);

  const bestDepartmentInsight = useMemo(() => {
    if (departmentOverview.length === 0) return 'No department analytics available yet.';
    const best = [...departmentOverview].sort((a, b) => b.avg_performance_score - a.avg_performance_score)[0];
    return `${best.department_name} is performing best`;
  }, [departmentOverview]);

  const delayedDepartmentInsight = useMemo(() => {
    if (departmentOverview.length === 0) return 'No delayed project data available yet.';
    const mostDelayed = [...departmentOverview].sort((a, b) => b.projects_delayed - a.projects_delayed)[0];
    return `${mostDelayed.department_name} has most delayed projects`;
  }, [departmentOverview]);

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
          Admin Panel
        </Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          Create users, assign managers, and control access in one place.
        </Typography>
      </Box>

      <Typography variant='h4' gutterBottom sx={{ display: 'none' }}>
        Admin Panel
      </Typography>

      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 2 }}>{success}</Alert>}

      <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant='h6' sx={{ mb: 2 }}>Departmental Performance Overview</Typography>

          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {departmentOverview.map((item) => (
              <Grid key={`summary-${item.department_name}`} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: '#f8fbff', height: '100%' }}>
                  <Typography variant='overline' color='text.secondary'>{item.department_name}</Typography>
                  <Typography variant='body2' sx={{ mt: 0.5 }}>
                    Avg Rating: {item.avg_manager_rating > 0 ? item.avg_manager_rating.toFixed(2) : 'No Data'}
                  </Typography>
                  <Typography variant='body2'>Completion: {item.completion_rate.toFixed(2)}%</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant='subtitle1' sx={{ mb: 1.5, fontWeight: 700 }}>Avg Performance Score by Department</Typography>
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={departmentOverview}>
                        <CartesianGrid strokeDasharray='3 3' />
                        <XAxis dataKey='department_name' />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey='avg_performance_score' fill='#1976d2' name='Avg Performance Score' radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant='subtitle1' sx={{ mb: 1.5, fontWeight: 700 }}>Project Status by Department</Typography>
                  <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={departmentOverview}>
                        <CartesianGrid strokeDasharray='3 3' />
                        <XAxis dataKey='department_name' />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey='projects_on_time' stackId='projects' fill='#2e7d32' name='On-time' />
                        <Bar dataKey='projects_delayed' stackId='projects' fill='#ed6c02' name='Delayed' />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant='subtitle1' sx={{ mb: 1.25, fontWeight: 700 }}>Insights</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 0.5 }}>{bestDepartmentInsight}</Typography>
              <Typography variant='body2' color='text.secondary'>{delayedDepartmentInsight}</Typography>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
        <Box>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Create User</Typography>
            <TextField fullWidth label='Name' sx={{ mb: 2 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField fullWidth label='Email' sx={{ mb: 2 }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField fullWidth label='Password' sx={{ mb: 2 }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <TextField select fullWidth label='Role' sx={{ mb: 2 }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <MenuItem value='admin'>admin</MenuItem>
              <MenuItem value='hr'>hr</MenuItem>
              <MenuItem value='manager'>manager</MenuItem>
              <MenuItem value='employee'>employee</MenuItem>
            </TextField>
            <TextField select fullWidth label='Department' sx={{ mb: 2 }} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </TextField>
            <Button fullWidth variant='contained' sx={{ mb: 0.5 }} onClick={createUser}>Create</Button>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Assign Manager</Typography>
            <TextField select fullWidth label='Employee' sx={{ mb: 2 }} value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              {employees
                .filter((e) => employeeUsers.some((u) => u.id === e.user_id))
                .map((e) => {
                  const user = users.find((u) => u.id === e.user_id);
                  return <MenuItem key={e.id} value={e.id}>{user?.name ?? 'Unknown Employee'}</MenuItem>;
                })}
            </TextField>
            <TextField select fullWidth label='Manager' sx={{ mb: 2 }} value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
              {employees
                .filter((e) => managerUsers.some((u) => u.id === e.user_id))
                .map((e) => {
                  const user = users.find((u) => u.id === e.user_id);
                  return <MenuItem key={e.id} value={e.id}>{user?.name ?? 'Unknown Manager'}</MenuItem>;
                })}
            </TextField>
            <Button fullWidth variant='contained' sx={{ mb: 0.5 }} onClick={assignManager} disabled={!selectedEmployee || !selectedManager}>
              Assign
            </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
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
                      await fetchEmployeeList(next);
                    } catch {
                      setError('Failed to filter employees');
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
                      await fetchEmployeeList(next);
                    } catch {
                      setError('Failed to filter employees');
                    }
                  }}
                >
                  <MenuItem value=''>All</MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
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
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Manager</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employeeList.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant='body2' color='text.secondary'>No results found.</Typography>
                </TableCell>
              </TableRow>
            )}
            {employeeList.map((emp) => {
              const linkedUser = users.find((u) => u.id === emp.user_id);
              const linkedDepartment = departments.find((d) => d.id === linkedUser?.department_id);
              return (
                <TableRow key={emp.id}>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{linkedUser?.name ?? '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{linkedUser?.email ?? '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{linkedUser?.role ?? '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{linkedDepartment?.name ?? '-'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{managerNameByEmployeeId[emp.id] ?? '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
          </Box>

          <Box sx={{ display: { xs: 'grid', sm: 'none' }, gap: 1.25, px: 2.5, pb: 2.5 }}>
            {employeeList.length === 0 && (
              <Typography variant='body2' color='text.secondary' sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                No results found.
              </Typography>
            )}
            {employeeList.map((emp) => {
              const linkedUser = users.find((u) => u.id === emp.user_id);
              const linkedDepartment = departments.find((d) => d.id === linkedUser?.department_id);
              return (
                <Box key={`emp-mobile-${emp.id}`} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', mb: 0.5 }}>{linkedUser?.name ?? '-'}</Typography>
                  <Typography sx={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>Email: {linkedUser?.email ?? '-'}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}>Role: {linkedUser?.role ?? '-'}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}>Department: {linkedDepartment?.name ?? '-'}</Typography>
                  <Typography sx={{ fontSize: '0.85rem' }}>Manager: {managerNameByEmployeeId[emp.id] ?? '-'}</Typography>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, pt: 2.5 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Users</Typography>
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
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.id}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.name}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.email}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.role}</TableCell>
                    <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.department_id ?? '-'}</TableCell>
                    <TableCell>
                      {u.role !== 'admin' && (
                        <Button color='error' onClick={() => deleteUser(u.id)}>Delete</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ display: { xs: 'grid', sm: 'none' }, gap: 1.25, px: 2.5, pb: 2.5 }}>
            {users.map((u) => (
              <Box key={`user-mobile-${u.id}`} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', mb: 0.5 }}>{u.name}</Typography>
                <Typography sx={{ fontSize: '0.85rem' }}>ID: {u.id}</Typography>
                <Typography sx={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>Email: {u.email}</Typography>
                <Typography sx={{ fontSize: '0.85rem' }}>Role: {u.role}</Typography>
                <Typography sx={{ fontSize: '0.85rem', mb: 0.75 }}>Department: {u.department_id ?? '-'}</Typography>
                {u.role !== 'admin' && (
                  <Button size='small' color='error' onClick={() => deleteUser(u.id)}>Delete</Button>
                )}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
