import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JEMP — Train like a pro athlete",
  description: "The training app built for serious athletes.",
  icons: {
    icon: "/logo.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-brand-bg text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
