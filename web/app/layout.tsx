import "./globals.css";
import Script from "next/script";

// Root shell — required by Next.js. All route-specific content lives in nested layouts.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className="bg-brand-bg text-white font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" && (
          <Script
            src="https://analytics.leonardogranetto.com/stats"
            data-website-id="0092b007-e7f1-4d8b-bcbf-db2789313163"
            data-domains="jemp.app,www.jemp.app"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
