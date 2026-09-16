require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const { Pool } = require('pg');
const { Storage } = require('@google-cloud/storage');
const storageClient = new Storage();
const gcsBucketName = process.env.GCS_BUCKET_NAME;

// Initialize the DB pool globally so we don't open a new pool on every request
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

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

// Initialize database schema
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.log("No DB URL provided. API calls will fail.");
    return;
  }
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    
    const { rows } = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO products (id, name, price, image_url) VALUES 
        ('1', 'Cloud Native T-Shirt', 25, 'https://placehold.co/400x400/png?text=T-Shirt'),
        ('2', 'K8s Coffee Mug', 15, 'https://placehold.co/400x400/png?text=Mug'),
        ('3', 'Serverless Hoodie', 45, 'https://placehold.co/400x400/png?text=Hoodie')
      `);
    }
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("DB Init Error:", err);
  }
}
initDB();

// Routes

// 1. Get products
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Upload image for product to GCS
app.post('/api/products/:id/image', upload.single('image'), async (req, res) => {
  const productId = req.params.id;
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!gcsBucketName) {
      return res.status(500).json({ error: 'GCS_BUCKET_NAME is not configured' });
    }

    const bucket = storageClient.bucket(gcsBucketName);
    const fileName = `product-${productId}-${Date.now()}-${req.file.originalname}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false
    });

    const publicUrl = `https://storage.googleapis.com/${gcsBucketName}/${fileName}`;
    const updated = await pool.query('UPDATE products SET image_url = $1 WHERE id = $2 RETURNING *', [publicUrl, productId]);
    
    res.json({ message: 'Image uploaded successfully to GCS', product: updated.rows[0] });
  } catch (err) {
    console.error("GCS Upload Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Create an order
app.post('/api/orders', async (req, res) => {
  const { items, total } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const orderId = `ORD-${Date.now()}`;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO orders (id, total, status) VALUES ($1, $2, $3)', [orderId, total, 'PENDING']);
    for (const item of items) {
      await client.query('INSERT INTO order_items (order_id, product_id, price) VALUES ($1, $2, $3)', [orderId, item.id, item.price]);
    }
    await client.query('COMMIT');

    // Simulate Async Order Processing Pipeline
    simulateOrderProcessing(orderId);

    res.status(201).json({ id: orderId, total, status: 'PENDING', items });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    const order = orderRes.rows[0];
    order.items = itemsRes.rows;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Heavy endpoint for load testing
app.post('/api/heavy', async (req, res) => {
  const startTime = Date.now();
  // We'll reduce default CPU iterations because of the nested O(n^2) loop you added, 
  // otherwise 50M * 50M = 2.5 quadrillion iterations, which freezes Node.js forever!
  const { iterations = 5000 } = req.body;

  // CPU-heavy task
  let result = 0;
  const iters = Number(iterations);
  for (let i = 0; i < iters; i++) {
    for (let j = 0; j < iters; j++) {
      result += Math.sqrt(i) * Math.sin(j);
    }
  }
  const cpuTime = Date.now() - startTime;

  let dbResult = null;
  let dbTime = 0;

  // DB-heavy task (complex JOIN querying all tables in your schema)
  if (process.env.DATABASE_URL) {
    const dbStartTime = Date.now();
    try {
      const client = await pool.connect();

      const query = `
        SELECT 
            o.id AS order_id,
            o.status,
            o.total,
            COUNT(oi.id) AS items_count,
            STRING_AGG(p.name, ', ') AS product_names
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 500;
      `;

      // We can also run this query multiple times to simulate heavier concurrent DB load
      const dbRes = await client.query(query);
      const dbRes2 = await client.query(query);
      const dbRes3 = await client.query(query);

      dbResult = {
        rowCount: dbRes.rowCount,
        sample: dbRes.rows.slice(0, 3)
      };

      client.release();
    } catch (err) {
      console.error('DB Error', err);
      dbResult = { error: err.message };
    }
    dbTime = Date.now() - dbStartTime;
  }

  const durationMs = Date.now() - startTime;
  res.json({
    message: 'Heavy endpoint finished processing',
    cpu: { iterations: iters, timeMs: cpuTime, result },
    db: { timeMs: dbTime, result: dbResult },
    totalDurationMs: durationMs
  });
});

// 7. RAM-heavy endpoint for load testing
app.post('/api/heavy-ram', (req, res) => {
  const { arraySize = 5000000 } = req.body; // Default 5M elements (roughly 40-50MB per request)
  const startTime = Date.now();
  
  try {
    // Create a huge array and fill it with strings to consume RAM
    const hugeArray = new Array(Number(arraySize)).fill('RAM_LOAD_TEST_STRING_TO_CONSUME_MEMORY');
    
    // Do a quick operation so it's not optimized away by V8
    const length = hugeArray.length;
    
    const durationMs = Date.now() - startTime;
    
    res.json({
      message: 'RAM load test finished successfully',
      elementsCreated: length,
      durationMs
    });
  } catch (err) {
    console.error('RAM Allocation Error:', err);
    res.status(500).json({ error: 'Failed to allocate memory', details: err.message });
  }
});

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Background simulation of processing
function simulateOrderProcessing(orderId) {
  // Step 1: Payment processed after 3 seconds
  setTimeout(async () => {
    try {
      await pool.query("UPDATE orders SET status = 'PAYMENT_PROCESSED' WHERE id = $1", [orderId]);
      console.log(`Order ${orderId} -> PAYMENT_PROCESSED`);

      // Step 2: Stock reserved after 3 more seconds
      setTimeout(async () => {
        await pool.query("UPDATE orders SET status = 'STOCK_RESERVED' WHERE id = $1", [orderId]);
        console.log(`Order ${orderId} -> STOCK_RESERVED`);

        // Step 3: Shipped after 4 more seconds
        setTimeout(async () => {
          await pool.query("UPDATE orders SET status = 'SHIPPED' WHERE id = $1", [orderId]);
          console.log(`Order ${orderId} -> SHIPPED`);
        }, 4000);
      }, 3000);
    } catch (err) {
      console.error(`Error processing order ${orderId}:`, err);
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
