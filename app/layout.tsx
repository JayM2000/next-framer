import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "Animate | UI";
const siteDescription = "Reactjs animation with framer motion";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  openGraph: {},
  icons: {
    icon: [
      {
        rel: "icon",
        media: "(prefers-color-scheme: light)",
        url: "/images/double-check.png",
        href: "/images/double-check.png",
      },
      {
        rel: "icon",
        media: "(prefers-color-scheme: dark)",
        url: "/images/double-check.png",
        href: "/images/double-check.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
