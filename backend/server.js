const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Set up mock multer for image uploads (just memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// In-memory data store
let products = [
  { id: '1', name: 'Cloud Native T-Shirt', price: 25, imageUrl: 'https://placehold.co/400x400/png?text=T-Shirt' },
  { id: '2', name: 'K8s Coffee Mug', price: 15, imageUrl: 'https://placehold.co/400x400/png?text=Mug' },
  { id: '3', name: 'Serverless Hoodie', price: 45, imageUrl: 'https://placehold.co/400x400/png?text=Hoodie' },
];

let orders = {};

// Routes

// 1. Get products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// 2. Mock image upload for product
app.post('/api/products/:id/image', upload.single('image'), (req, res) => {
  const productId = req.params.id;
  const productIndex = products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // In a real app (Lab 1.3), this would upload to Cloud Storage and save the URL.
  // For now, we mock it by returning success.
  console.log(`Received image upload for product ${productId}. Size: ${req.file ? req.file.size : 0} bytes`);
  
  // Simulate updating the product image with a random placeholder to show change
  products[productIndex].imageUrl = `https://placehold.co/400x400/png?text=Updated+${Math.floor(Math.random() * 100)}`;
  
  res.json({ message: 'Image uploaded successfully (mock)', product: products[productIndex] });
});

// 3. Create an order
app.post('/api/orders', (req, res) => {
  const { items, total } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const orderId = `ORD-${Date.now()}`;
  
  const newOrder = {
    id: orderId,
    items,
    total,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  orders[orderId] = newOrder;

  // Simulate Async Order Processing Pipeline
  simulateOrderProcessing(orderId);

  res.status(201).json(newOrder);
});

// 4. Get all orders
app.get('/api/orders', (req, res) => {
  // Return orders sorted by newest first
  const orderList = Object.values(orders).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orderList);
});

// 5. Get order by ID
app.get('/api/orders/:id', (req, res) => {
  const order = orders[req.params.id];
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Background simulation of processing
function simulateOrderProcessing(orderId) {
  // Step 1: Payment processed after 3 seconds
  setTimeout(() => {
    if (orders[orderId]) {
      orders[orderId].status = 'PAYMENT_PROCESSED';
      console.log(`Order ${orderId} -> PAYMENT_PROCESSED`);
      
      // Step 2: Stock reserved after 3 more seconds
      setTimeout(() => {
        if (orders[orderId]) {
          orders[orderId].status = 'STOCK_RESERVED';
          console.log(`Order ${orderId} -> STOCK_RESERVED`);
          
          // Step 3: Shipped after 4 more seconds
          setTimeout(() => {
            if (orders[orderId]) {
              orders[orderId].status = 'SHIPPED';
              console.log(`Order ${orderId} -> SHIPPED`);
            }
          }, 4000);
        }
      }, 3000);
    }
  }, 3000);
}

// Global error handler (catches all sync errors in routes)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(port, () => {
  console.log(`ShopFlow backend listening on port ${port}`);
});
