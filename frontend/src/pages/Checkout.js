import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';

export default function Checkout() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [addr, setAddr] = useState({ street: '', city: '', state: '', zip: '', country: 'IN' });

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data),
  });

  const placeOrder = useMutation({
    mutationFn: () => api.post('/orders', { shipping_addr: addr }),
    onSuccess: (res) => {
      qc.invalidateQueries(['cart']);
      qc.invalidateQueries(['orders']);
      toast.success('Order placed successfully! 🎉');
      navigate(`/orders`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Order failed'),
  });

  const items = cart?.items || [];

  return (
    <div className="page checkout-page">
      <h1>Checkout</h1>
      <div className="checkout-layout">
        <div className="shipping-form">
          <h2>Shipping Address</h2>
          {[
            { id: 'street', label: 'Street', placeholder: '123 Main St' },
            { id: 'city',   label: 'City',   placeholder: 'Mumbai' },
            { id: 'state',  label: 'State',  placeholder: 'Maharashtra' },
            { id: 'zip',    label: 'ZIP',    placeholder: '400001' },
          ].map(f => (
            <div key={f.id} className="form-group">
              <label htmlFor={`addr-${f.id}`}>{f.label}</label>
              <input
                id={`addr-${f.id}`}
                placeholder={f.placeholder}
                value={addr[f.id]}
                onChange={e => setAddr({ ...addr, [f.id]: e.target.value })}
                required
              />
            </div>
          ))}
        </div>

        <div className="order-summary">
          <h2>Order Summary</h2>
          {items.map(item => (
            <div key={item.id} className="summary-item">
              <span>{item.name} × {item.quantity}</span>
              <span>${parseFloat(item.subtotal).toFixed(2)}</span>
            </div>
          ))}
          <div className="summary-total">
            <strong>Total</strong>
            <strong>${cart?.total || '0.00'}</strong>
          </div>
          <button
            id="place-order-btn"
            className="btn btn-primary btn-lg"
            disabled={!items.length || placeOrder.isPending}
            onClick={() => placeOrder.mutate()}
          >
            {placeOrder.isPending ? 'Placing Order…' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
