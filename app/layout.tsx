import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCProvider } from "@/trpc/client";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Fredoka, Cinzel, DM_Sans } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vault — Password Manager",
  description:
    "Vault — A premium password manager and secure note-keeping app.",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
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

