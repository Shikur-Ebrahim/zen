import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zen Boss",
  description: "Zen Boss Application",
  manifest: "/manifest.json",
  icons: {
    icon: "/zen-3d-logo-v2.png",
    apple: "/zen-3d-logo-v2.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zen Boss",
    startupImage: "/zen-3d-logo-v2.png"
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#ffffff",
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
        <ServiceWorkerRegister />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
