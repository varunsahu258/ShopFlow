import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setAuth(data.token, data.user);
      toast.success('Account created!');
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit} id="register-form">
        <h2>Create Account</h2>
        <input
          id="fullname-input"
          type="text" placeholder="Full Name" required
          value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
        />
        <input
          id="reg-email-input"
          type="email" placeholder="Email" required
          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
        />
        <input
          id="reg-password-input"
          type="password" placeholder="Password (min 6 chars)" minLength={6} required
          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
        />
        <button id="register-btn" type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>
        <p>Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
