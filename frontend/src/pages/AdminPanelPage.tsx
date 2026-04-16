import { useEffect, useState } from 'react';
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
  const [form, setForm] = useState(initialUserForm);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    const [usersRes, depRes, employeesRes] = await Promise.all([
      api.get('/users'),
      api.get('/departments'),
      api.get('/users/employees'),
    ]);
    setUsers(usersRes.data);
    setDepartments(depRes.data);
    setEmployees(employeesRes.data);
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

  return (
    <Box>
      <Typography variant='h4' gutterBottom>
        Admin Panel
      </Typography>

      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 2 }}>
        <Box>
          <Paper sx={{ p: 2 }}>
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
            <Button variant='contained' onClick={createUser}>Create</Button>
          </Paper>
        </Box>

        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Assign Manager</Typography>
            <TextField select fullWidth label='Employee' sx={{ mb: 2 }} value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              {employees
                .filter((e) => employeeUsers.some((u) => u.id === e.user_id))
                .map((e) => {
                  const user = users.find((u) => u.id === e.user_id);
                  return <MenuItem key={e.id} value={e.id}>{user?.name} (emp #{e.id})</MenuItem>;
                })}
            </TextField>
            <TextField select fullWidth label='Manager' sx={{ mb: 2 }} value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
              {employees
                .filter((e) => managerUsers.some((u) => u.id === e.user_id))
                .map((e) => {
                  const user = users.find((u) => u.id === e.user_id);
                  return <MenuItem key={e.id} value={e.id}>{user?.name} (mgr #{e.id})</MenuItem>;
                })}
            </TextField>
            <Button variant='contained' onClick={assignManager} disabled={!selectedEmployee || !selectedManager}>
              Assign
            </Button>
          </Paper>
        </Box>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant='h6' sx={{ mb: 2 }}>Users</Typography>
        <Table size='small'>
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
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.department_id ?? '-'}</TableCell>
                <TableCell>
                  {u.role !== 'admin' && (
                    <Button color='error' onClick={() => deleteUser(u.id)}>Delete</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
