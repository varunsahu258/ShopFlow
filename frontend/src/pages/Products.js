import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';

export default function Products() {
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage]         = useState(1);
  const token = useAuthStore(s => s.token);
  const qc    = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, category, page }],
    queryFn: () => api.get('/products', { params: { search, category, page } }).then(r => r.data),
  });

  const addToCart = useMutation({
    mutationFn: (product_id) => api.post('/cart', { product_id, quantity: 1 }),
    onSuccess: () => { toast.success('Added to cart!'); qc.invalidateQueries(['cart']); },
    onError: () => toast.error('Login to add items'),
  });

  return (
    <div className="page products-page">
      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Search products…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
          <option value="home-garden">Home & Garden</option>
        </select>
      </div>

      {isLoading ? (
        <div className="loading-grid">
          {[...Array(8)].map((_, i) => <div key={i} className="product-skeleton" />)}
        </div>
      ) : (
        <div className="products-grid" id="products-grid">
          {data?.products?.map(p => (
            <div key={p.id} className="product-card" data-testid="product-card">
              <Link to={`/products/${p.id}`}>
                <div className="product-img-wrap">
                  <img src={p.image_url || `https://picsum.photos/seed/${p.id}/400/300`} alt={p.name} />
                </div>
                <div className="product-info">
                  <span className="product-category">{p.category_name}</span>
                  <h3>{p.name}</h3>
                  <p className="product-price">${parseFloat(p.price).toFixed(2)}</p>
                  <p className="product-stock">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</p>
                </div>
              </Link>
              <button
                className="btn btn-primary add-to-cart-btn"
                disabled={!p.stock || addToCart.isPending}
                onClick={() => token ? addToCart.mutate(p.id) : toast.error('Please login first')}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span>Page {page}</span>
        <button
          disabled={!data?.products?.length || data.products.length < 12}
          onClick={() => setPage(p => p + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
