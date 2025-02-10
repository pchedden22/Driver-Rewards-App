import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar, Footer } from "../components";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Driver Rewards App",
  description: "Reward your drivers with safe driving",
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
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)", height: "100vh" }}
      >
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
