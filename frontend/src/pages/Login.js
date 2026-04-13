// Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.token, data.user);
      toast.success(`Welcome back, ${data.user.full_name}!`);
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit} id="login-form">
        <h2>Sign In</h2>
        <input
          id="email-input"
          type="email" placeholder="Email" required
          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
        />
        <input
          id="password-input"
          type="password" placeholder="Password" required
          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
        />
        <button id="login-btn" type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p>Don't have an account? <Link to="/register">Sign up</Link></p>
      </form>
    </div>
  );
}
