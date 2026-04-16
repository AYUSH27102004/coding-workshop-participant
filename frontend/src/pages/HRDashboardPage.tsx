import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
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

export default function HRDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const [summaryRes, usersRes, competencyRes] = await Promise.all([
      api.get('/dashboard/summary'),
      api.get('/users'),
      api.get('/competencies/'),
    ]);
    setSummary(summaryRes.data);
    setUsers(usersRes.data);
    setCompetencies(competencyRes.data);
  };

  useEffect(() => {
    load().catch(() => setError('Failed to load HR data'));
  }, []);

  const addCompetency = async () => {
    try {
      await api.post('/competencies/', { name, description });
      setName('');
      setDescription('');
      setSuccess('Competency created');
      await load();
    } catch {
      setError('Failed to create competency');
    }
  };

  const deleteCompetency = async (id: number) => {
    try {
      await api.delete(`/competencies/${id}`);
      setSuccess('Competency deleted');
      await load();
    } catch {
      setError('Failed to delete competency');
    }
  };

  const departmentCounts = useMemo(() => summary?.department_counts ?? [], [summary]);

  return (
    <Box>
      <Typography variant='h4' gutterBottom>HR Dashboard</Typography>
      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity='success' sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6'>Total Users</Typography>
            <Typography variant='h3'>{summary?.total_users ?? 0}</Typography>
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6'>Total Projects</Typography>
            <Typography variant='h3'>{summary?.total_projects ?? 0}</Typography>
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6'>Total Reviews</Typography>
            <Typography variant='h3'>{summary?.total_reviews ?? 0}</Typography>
          </Paper>
        </Box>
      </Box>

      <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 2 }}>
        <Box>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Department Headcount</Typography>
            <ResponsiveContainer width='100%' height='85%'>
              <BarChart data={departmentCounts}>
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='count' fill='#1976d2' />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>Manage Competencies</Typography>
            <TextField fullWidth label='Name' sx={{ mb: 1 }} value={name} onChange={(e) => setName(e.target.value)} />
            <TextField fullWidth label='Description' sx={{ mb: 1 }} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button variant='contained' sx={{ mb: 2 }} onClick={addCompetency}>Add</Button>
            {competencies.map((c) => (
              <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant='body2'>{c.name}</Typography>
                <Button color='error' size='small' onClick={() => deleteCompetency(c.id)}>Delete</Button>
              </Box>
            ))}
          </Paper>
        </Box>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant='h6' sx={{ mb: 2 }}>All Employees/Users</Typography>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Department</TableCell>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
