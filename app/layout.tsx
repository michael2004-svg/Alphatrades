import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BinaryFlow",
  description: "Advanced trading and analytics platform",

  openGraph: {
    title: "BinaryFlow",
    description: "Advanced trading and analytics platform",
    url: "https://yourdomain.com",
    siteName: "BinaryFlow",

    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "BinaryFlow",
      },
    ],

    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "BinaryFlow",
    description: "Advanced trading and analytics platform",
    images: ["/logo.png"],
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}