import { useState, useEffect } from 'react';

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Initial fetch
    fetchOrders();
    
    // Poll for live status updates every 2 seconds
    const interval = setInterval(fetchOrders, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => setOrders(data))
      .catch(err => console.error("Error fetching orders:", err));
  };

  const formatStatus = (status) => {
    return status.replace('_', ' ');
  };

  if (orders.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>No Orders Yet</h2>
        <p style={{ color: 'var(--text-muted)' }}>Orders will appear here once you check out.</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem' }}>Order Dashboard</h2>
      
      {orders.map(order => (
        <div key={order.id} className="order-row" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{order.id}</strong>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>
            <span className={`status-badge status-${order.status}`}>
              {formatStatus(order.status)}
            </span>
          </div>
          
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {order.items.length} item(s) • Total: ${order.total}
          </div>
        </div>
      ))}
    </div>
  );
}
