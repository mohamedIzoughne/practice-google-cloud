import { useState } from 'react';
import Products from './Products';
import Cart from './Cart';
import Orders from './Orders';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('products');
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product) => {
    setCartItems([...cartItems, product]);
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <div className="app-container">
      <header>
        <h1>ShopFlow</h1>
        <nav>
          <button 
            className={activeTab === 'products' ? 'active' : ''} 
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button 
            className={activeTab === 'cart' ? 'active' : ''} 
            onClick={() => setActiveTab('cart')}
          >
            Cart ({cartItems.length})
          </button>
          <button 
            className={activeTab === 'orders' ? 'active' : ''} 
            onClick={() => setActiveTab('orders')}
          >
            Dashboard
          </button>
        </nav>
      </header>

      <main>
        {activeTab === 'products' && <Products addToCart={addToCart} />}
        {activeTab === 'cart' && (
          <Cart 
            cartItems={cartItems} 
            clearCart={clearCart} 
            goToOrders={() => setActiveTab('orders')} 
          />
        )}
        {activeTab === 'orders' && <Orders />}
      </main>
    </div>
  );
}

export default App;
