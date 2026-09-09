import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Render Event-Driven Demo',
  description: 'Outbox + events + transactions on Render',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          background: '#0b0c10',
          color: '#e8e8e8',
        }}
      >
        {children}
      </body>
    </html>
  );
}
