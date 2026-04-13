// Home.js
import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to <span className="brand">ShopFlow</span></h1>
          <p>Discover thousands of products. Fast delivery. Great prices.</p>
          <Link to="/products" className="btn btn-primary btn-lg">Shop Now</Link>
        </div>
      </section>
      <section className="features">
        {[
          { icon: '🚀', title: 'Fast Delivery',   desc: 'Get your orders in 2-3 days' },
          { icon: '🔒', title: 'Secure Payment',  desc: 'SSL-encrypted transactions' },
          { icon: '↩️', title: 'Easy Returns',    desc: '30-day hassle-free returns' },
          { icon: '💬', title: '24/7 Support',    desc: 'Always here to help you' },
        ].map(f => (
          <div key={f.title} className="feature-card">
            <span>{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
