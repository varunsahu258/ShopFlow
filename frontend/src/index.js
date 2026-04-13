import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import Navbar      from './components/Navbar';
import Home        from './pages/Home';
import Products    from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart        from './pages/Cart';
import Checkout    from './pages/Checkout';
import Orders      from './pages/Orders';
import Login       from './pages/Login';
import Register    from './pages/Register';
import './index.css';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

const PrivateRoute = ({ children }) => {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Navbar />
        <Toaster position="top-right" />
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/products"  element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />
          <Route path="/cart"      element={<PrivateRoute><Cart /></PrivateRoute>} />
          <Route path="/checkout"  element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/orders"    element={<PrivateRoute><Orders /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
