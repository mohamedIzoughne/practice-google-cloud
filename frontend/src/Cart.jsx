import { useState } from 'react';

export default function Cart({ cartItems, clearCart, goToOrders }) {
  const [loading, setLoading] = useState(false);

  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setLoading(true);

    fetch('http://localhost:3005/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems, total })
    })
      .then(res => res.json())
      .then(() => {
        setLoading(false);
        clearCart();
        goToOrders();
      })
      .catch(err => {
        console.error("Checkout error:", err);
        setLoading(false);
      });
  };

  if (cartItems.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Your Cart is Empty</h2>
        <p style={{ color: 'var(--text-muted)' }}>Add some cloud-native gear to get started.</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem' }}>Checkout</h2>
      
      {cartItems.map((item, index) => (
        <div key={index} className="order-row">
          <span>{item.name}</span>
          <span>${item.price}</span>
        </div>
      ))}
      
      <div className="order-row" style={{ marginTop: '1rem', borderBottom: 'none', fontWeight: 'bold' }}>
        <span>Total</span>
        <span>${total}</span>
      </div>

      <button 
        className="btn-primary" 
        style={{ marginTop: '2rem' }}
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Place Order'}
      </button>
    </div>
  );
}
