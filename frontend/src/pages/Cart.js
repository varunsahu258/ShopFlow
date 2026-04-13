import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';

export default function Cart() {
  const qc       = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, quantity }) => api.put(`/cart/${id}`, { quantity }),
    onSuccess: () => qc.invalidateQueries(['cart']),
  });

  const removeItem = useMutation({
    mutationFn: (id) => api.delete(`/cart/${id}`),
    onSuccess: () => { qc.invalidateQueries(['cart']); toast.success('Item removed'); },
  });

  if (isLoading) return <div className="page"><p>Loading cart…</p></div>;

  const items = data?.items || [];
  const total = data?.total || '0.00';

  return (
    <div className="page cart-page">
      <h1>Your Cart</h1>
      {items.length === 0 ? (
        <div className="empty-state">
          <span>🛒</span>
          <p>Your cart is empty</p>
          <button className="btn btn-primary" onClick={() => navigate('/products')}>
            Browse Products
          </button>
        </div>
      ) : (
        <>
          <div className="cart-items" id="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item" data-testid="cart-item">
                <img src={item.image_url || `https://picsum.photos/seed/${item.product_id}/80/80`} alt={item.name} />
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p>${parseFloat(item.unit_price || item.price).toFixed(2)}</p>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })}>−</button>
                  <span id={`qty-${item.id}`}>{item.quantity}</span>
                  <button onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })}>+</button>
                </div>
                <span className="cart-item-subtotal">${parseFloat(item.subtotal).toFixed(2)}</span>
                <button className="btn btn-danger remove-btn" onClick={() => removeItem.mutate(item.id)}>✕</button>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <div className="cart-total">
              <strong>Total:</strong> <span id="cart-total">${total}</span>
            </div>
            <button
              id="checkout-btn"
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
