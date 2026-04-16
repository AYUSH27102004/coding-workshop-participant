import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Box, Typography, Button, Paper, Alert, TextField, MenuItem
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const demoByRole: Record<string, string> = {
    admin: 'admin@acme.com',
    hr: 'hr1@acme.com',
    manager: 'manager1@acme.com',
    employee: 'employee1@acme.com',
  };

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    try {
      setError('');
      const formData = new URLSearchParams();
      formData.append('username', loginEmail);
      formData.append('password', loginPassword);

      const res = await api.post('/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const token = res.data.access_token;
      
      const userRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      login(token, userRes.data);
      navigate('/dashboard');

    } catch {
      setError('Invalid credentials or backend unavailable.');
    }
  };

  const handleRoleLogin = () => {
    if (!selectedRole) {
      setError('Please select a role first.');
      return;
    }
    handleLogin(demoByRole[selectedRole], 'demo123');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={4} sx={{ p: 5, width: '100%', mt: 3, borderRadius: 3 }}>
          <Typography component="h1" variant="h3" align="center" sx={{ fontWeight: 'bold' }} gutterBottom color="primary">
            ACME Portal
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Sign in with email/password or use role quick login
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <Button fullWidth type="submit" variant="contained" size="large">
              Login
            </Button>
          </Box>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Quick role login
          </Typography>

          <TextField
            select
            fullWidth
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            label="Select Role"
            sx={{ mb: 2 }}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="hr">HR</MenuItem>
            <MenuItem value="manager">Manager</MenuItem>
            <MenuItem value="employee">Employee</MenuItem>
          </TextField>

          <Button fullWidth variant="outlined" onClick={handleRoleLogin} sx={{ mb: 2 }}>
            Login as Selected Role
          </Button>
          
          <Box>
            <Typography variant="caption" color="text.secondary">Demo credentials:</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>admin@acme.com, hr1@acme.com, manager1@acme.com, employee1@acme.com | Password: demo123</Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
