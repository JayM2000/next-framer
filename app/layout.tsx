import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCProvider } from "@/trpc/client";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Fredoka, Cinzel, DM_Sans } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Vault | Premium Secure Manager",
    template: "%s | Vault",
  },
  description:
    "Experience Vault, the ultimate premium glassmorphic password manager and secure note-keeping application. Store credentials, secure snippets, and public notes with bank-level encryption and stunning UI.",
  keywords: [
    "password manager",
    "secure notes",
    "vault",
    "encryption",
    "glassmorphism",
    "clipboard",
    "snippets",
    "security",
    "credentials",
  ],
  authors: [{ name: "Vault Team" }],
  creator: "Vault",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vault.com",
    title: "Vault | Premium Secure Manager",
    description:
      "Experience Vault, the ultimate premium glassmorphic password manager and secure note-keeping application.",
    siteName: "Vault",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vault | Premium Secure Manager",
    description:
      "The ultimate premium password manager and secure note-keeping app.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
};

const googleFonts = Fredoka({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-vault-heading",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vault-body",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en" suppressHydrationWarning>
        <body className={`${googleFonts.className} ${cinzel.variable} ${dmSans.variable} app-bg`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <TRPCProvider>
              <SocketProvider>
                <TooltipProvider delayDuration={200}>
                  <Toaster />
                  {children}
                </TooltipProvider>
              </SocketProvider>
            </TRPCProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

