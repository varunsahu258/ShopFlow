import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';

export default function ProductDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const token    = useAuthStore(s => s.token);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
  });

  const addToCart = useMutation({
    mutationFn: () => api.post('/cart', { product_id: id, quantity: 1 }),
    onSuccess: () => { toast.success('Added to cart!'); qc.invalidateQueries(['cart']); },
  });

  if (isLoading) return <div className="page"><p>Loading…</p></div>;
  if (!product)  return <div className="page"><p>Product not found.</p></div>;

  return (
    <div className="page product-detail-page">
      <button className="btn btn-outline back-btn" onClick={() => navigate(-1)}>← Back</button>
      <div className="product-detail-layout">
        <img
          className="product-detail-img"
          src={product.image_url || `https://picsum.photos/seed/${product.id}/600/450`}
          alt={product.name}
        />
        <div className="product-detail-info">
          <span className="product-category">{product.category_name}</span>
          <h1>{product.name}</h1>
          <p className="product-price-lg">${parseFloat(product.price).toFixed(2)}</p>
          <p className="product-desc">{product.description}</p>
          <p className="product-stock">{product.stock > 0 ? `✅ ${product.stock} in stock` : '❌ Out of stock'}</p>
          <button
            id="add-to-cart-detail"
            className="btn btn-primary btn-lg"
            disabled={!product.stock || addToCart.isPending}
            onClick={() => token ? addToCart.mutate() : toast.error('Please login first')}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
