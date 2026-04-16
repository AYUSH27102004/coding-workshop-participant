import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box,
  Typography,
  Button,
  Alert,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const pageSx = {
  minHeight: '100svh',
  width: '100%',
  display: 'flex',
  bgcolor: '#f4f6f9',
};

const cardSx = {
  width: '100%',
  maxWidth: 350,
  borderRadius: 3,
  boxShadow: '0 10px 28px rgba(19, 43, 78, 0.14)',
};

const primaryButtonSx = {
  py: 1.2,
  fontWeight: 600,
  textTransform: 'none',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: 3,
  },
};

const secondaryButtonSx = {
  py: 1.1,
  fontWeight: 600,
  textTransform: 'none',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    borderColor: 'primary.main',
    bgcolor: 'rgba(25, 118, 210, 0.04)',
  },
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
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
    <Box sx={pageSx}>
      <Box
        sx={{
          flex: 1.5,
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
          px: 6,
          background: 'linear-gradient(155deg, #0f3f79 0%, #1b5da8 45%, #7f96b3 100%)',
          color: '#ffffff',
        }}
      >
        <Box sx={{ maxWidth: 520 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 1.5 }}>
            ACME
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 2 }}>
            Employee Performance Management System
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Empower teams with role-based dashboards, actionable insights, and modern performance workflows.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          flex: { xs: 1, md: 1 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 2, sm: 3 },
          py: { xs: 3, md: 4 },
          background: 'linear-gradient(180deg, #eef4ff 0%, #f4f6f9 100%)',
        }}
      >
        <Card sx={cardSx}>
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                component="img"
                src="/logo.svg"
                alt="ACME logo"
                sx={{ width: 72, height: 72, mx: 'auto', mb: 1.25 }}
              />
              <Typography component="h1" variant="h5" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                ACME Employee Performance System
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Login to continue
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={2.5}>
              <Grid size={12}>
                <Box component="form" onSubmit={handleSubmit}>
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
                  <Button fullWidth type="submit" variant="contained" size="large" sx={primaryButtonSx}>
                    Login
                  </Button>
                  <Box sx={{ mt: 0.75, textAlign: 'right' }}>
                    <Button size="small" variant="text" onClick={() => setHelpOpen(true)}>
                      Help?
                    </Button>
                  </Box>
                </Box>
              </Grid>

              <Grid size={12}>
                <Divider sx={{ my: 0.5 }} />
              </Grid>

              <Grid size={12}>
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

                <Button fullWidth variant="outlined" onClick={handleRoleLogin} sx={secondaryButtonSx}>
                  Login as Selected Role
                </Button>
              </Grid>
            </Grid>

            <Dialog
              open={helpOpen}
              onClose={() => setHelpOpen(false)}
              fullWidth
              maxWidth="md"
              scroll="paper"
            >
              <DialogTitle sx={{ pr: 6 }}>
                How to Use This System
                <IconButton
                  aria-label="close help"
                  onClick={() => setHelpOpen(false)}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>

              <DialogContent dividers>
                <Box sx={{ display: 'grid', gap: 2.5 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      1. Login Instructions
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      - Enter your email and password.
                    </Typography>
                    <Typography variant="body2">
                      - Select your role for quick login (if applicable).
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      2. User Roles
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Admin</Typography>
                    <Typography variant="body2" sx={{ mb: 0.75 }}>
                      - Manage users (create/delete) and access all system modules.
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 600 }}>HR</Typography>
                    <Typography variant="body2" sx={{ mb: 0.75 }}>
                      - View department performance, payroll status, and manager recommendations.
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Manager</Typography>
                    <Typography variant="body2" sx={{ mb: 0.75 }}>
                      - Assign projects, track team performance, and recommend employees to HR.
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Employee</Typography>
                    <Typography variant="body2">
                      - View assigned projects, check deadlines, and track personal performance reports.
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      3. Navigation Guide
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      - Use the sidebar to switch between dashboards.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      - Each role has different access and visible sections.
                    </Typography>
                    <Typography variant="body2">
                      - Data shown in dashboards is personalized to the logged-in user.
                    </Typography>
                  </Box>
                </Box>
              </DialogContent>

              <DialogActions>
                <Button onClick={() => setHelpOpen(false)} variant="contained">
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          © 2026 ACME Inc. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
