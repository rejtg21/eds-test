'use client';

import { useCallback, useEffect, useState } from 'react';

type Order = {
  id: string;
  customer: string;
  amount: number;
  status: 'PENDING' | 'PROCESSED';
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
};

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) throw new Error(`GET /orders -> ${res.status}`);
      setOrders(await res.json());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  const placeOrder = async () => {
    setBusy(true);
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const pending = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ marginBottom: 4 }}>Event-Driven Demo</h1>
      <p style={{ color: '#9aa0a6', marginTop: 0 }}>
        Button &rarr; API writes <code>orders</code> + <code>outbox_events</code>{' '}
        in one transaction &rarr; outbox relay publishes to Redis &rarr; one of
        two consumers runs the task.
      </p>

      <button
        onClick={placeOrder}
        disabled={busy}
        style={{
          background: busy ? '#3a3f47' : '#4f8cff',
          color: '#fff',
          border: 0,
          borderRadius: 8,
          padding: '12px 20px',
          fontSize: 16,
          cursor: busy ? 'default' : 'pointer',
          marginTop: 8,
        }}
      >
        {busy ? 'Placing…' : 'Place order'}
      </button>

      <div style={{ margin: '16px 0', color: '#9aa0a6', fontSize: 14 }}>
        {orders.length} order(s) &middot; {pending} pending
        {error ? (
          <span style={{ color: '#ff6b6b', marginLeft: 12 }}>{error}</span>
        ) : null}
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
        }}
      >
        <thead>
          <tr style={{ textAlign: 'left', color: '#9aa0a6' }}>
            <th style={th}>Order</th>
            <th style={th}>Customer</th>
            <th style={th}>Amount</th>
            <th style={th}>Status</th>
            <th style={th}>Processed by</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ borderTop: '1px solid #23262d' }}>
              <td style={td}>
                <code>{o.id.slice(0, 8)}</code>
              </td>
              <td style={td}>{o.customer}</td>
              <td style={td}>${o.amount}</td>
              <td style={td}>
                <span
                  style={{
                    color: o.status === 'PROCESSED' ? '#5ad17f' : '#ffd166',
                  }}
                >
                  {o.status}
                </span>
              </td>
              <td style={td}>{o.processedBy ?? '—'}</td>
            </tr>
          ))}
          {orders.length === 0 ? (
            <tr>
              <td style={td} colSpan={5}>
                No orders yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}

const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600 };
const td: React.CSSProperties = { padding: '8px 10px' };
