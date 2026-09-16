import { useState } from 'react';

export default function LoadTest() {
  const [iterations, setIterations] = useState(5000);
  const [arraySize, setArraySize] = useState(5000000);
  
  const [loadingCpu, setLoadingCpu] = useState(false);
  const [loadingRam, setLoadingRam] = useState(false);
  
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runCpuDbTest = async () => {
    setLoadingCpu(true);
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
      if (!response.ok) throw new Error(data.error || 'Request failed');
      
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingCpu(false);
    }
  };

  const runRamTest = async () => {
    setLoadingRam(true);
    setResult(null);
    setError(null);
    
    try {
      const response = await fetch('/api/heavy-ram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ arraySize: Number(arraySize) })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingRam(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
      <h2 style={{ marginBottom: '1rem' }}>Heavy Load Tests</h2>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
        Trigger heavy backend operations for stress testing.
      </p>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>CPU & DB Load</h3>
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
            background: 'rgba(0,0,0,0.2)',
            color: '#fff',
            marginBottom: '0.5rem'
          }}
        />
        <button 
          className="btn-primary" 
          onClick={runCpuDbTest} 
          disabled={loadingCpu || loadingRam}
          style={{ width: '100%', padding: '0.75rem' }}
        >
          {loadingCpu ? 'Processing...' : 'Run CPU/DB Test'}
        </button>
      </div>

      <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Memory (RAM) Load</h3>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Array Size (Elements):
        </label>
        <input 
          type="number" 
          value={arraySize} 
          onChange={(e) => setArraySize(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '0.5rem', 
            borderRadius: '4px',
            border: '1px solid #333',
            background: 'rgba(0,0,0,0.2)',
            color: '#fff',
            marginBottom: '0.5rem'
          }}
        />
        <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '1rem' }}>
          5,000,000 elements consumes roughly 40-50MB RAM temporarily.
        </small>
        <button 
          className="btn-primary" 
          onClick={runRamTest} 
          disabled={loadingCpu || loadingRam}
          style={{ width: '100%', padding: '0.75rem', background: '#9c27b0' }}
        >
          {loadingRam ? 'Processing...' : 'Run RAM Test'}
        </button>
      </div>

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
