import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../hooks/useApi';

export default function Navbar() {
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const cartCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">🛒 ShopFlow</Link>
      <div className="navbar-links">
        <Link to="/products">Products</Link>
        {token ? (
          <>
            <Link to="/cart" className="cart-link">
              Cart {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </Link>
            <Link to="/orders">Orders</Link>
            <span className="user-greeting">Hi, {user?.full_name?.split(' ')[0]}</span>
            <button onClick={handleLogout} className="btn btn-outline">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn btn-primary">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
