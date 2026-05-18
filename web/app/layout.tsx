import "./globals.css";

// Root shell — required by Next.js. All route-specific content lives in nested layouts.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
