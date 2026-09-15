import { useState } from 'react';

export default function LoadTest() {
  const [iterations, setIterations] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runLoadTest = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/heavy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ iterations: Number(iterations) })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
      <h2 style={{ marginBottom: '1rem' }}>Heavy Load Test</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
        Trigger a heavy CPU and DB operation on the backend.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          CPU Iterations:
        </label>
        <input
          type="number"
          value={iterations}
          onChange={(e) => setIterations(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #333',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff'
          }}
        />
        <small style={{ color: 'var(--text-muted)' }}>Warning: high values will slow down the backend significantly.</small>
      </div>

      <button
        className="btn-primary"
        onClick={runLoadTest}
        disabled={loading}
        style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', marginBottom: '1rem' }}
      >
        {loading ? 'Processing...' : 'Run Load Test (POST)'}
      </button>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255,0,0,0.1)', color: '#ff6b6b', borderRadius: '4px' }}>
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Results:</h3>
          <pre style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '1rem',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '0.85rem'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
