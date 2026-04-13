// Orders.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../hooks/useApi';

export default function Orders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then(r => r.data),
  });

  if (isLoading) return <div className="page"><p>Loading orders…</p></div>;

  return (
    <div className="page orders-page">
      <h1>My Orders</h1>
      {orders.length === 0 ? (
        <p className="empty-state">No orders yet.</p>
      ) : (
        <div className="orders-list" id="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card" data-testid="order-card">
              <div className="order-header">
                <span className="order-id">#{order.id.slice(0, 8)}</span>
                <span className={`order-status status-${order.status}`}>{order.status}</span>
                <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                <span className="order-total">${parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
              <div className="order-items">
                {order.items?.filter(Boolean).map((item, i) => (
                  <span key={i} className="order-item-tag">
                    {item.name} × {item.quantity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
