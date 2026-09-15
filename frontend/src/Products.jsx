import { useState, useEffect } from 'react';

export default function Products({ addToCart }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Error fetching products:", err));
  }, []);

  const handleImageUpload = (id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    fetch(`/api/products/${id}/image`, {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        if (data.product) {
          setProducts(products.map(p => p.id === id ? data.product : p));
        }
      })
      .catch(err => console.error("Error uploading image:", err));
  };

  return (
    <div className="grid">
      {products.map(product => (
        <div key={product.id} className="glass-card">
          <img src={product.imageUrl} alt={product.name} className="product-img" />
          <h3 style={{ marginBottom: '0.5rem' }}>{product.name}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>${product.price}</p>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Update Image (Mock)
              <input 
                type="file" 
                style={{ display: 'none' }} 
                onChange={(e) => handleImageUpload(product.id, e)} 
              />
            </label>
          </div>

          <button className="btn-primary" onClick={() => addToCart(product)}>
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
}
