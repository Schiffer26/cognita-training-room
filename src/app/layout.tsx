import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "COGNĪTA — By DICT Iligan",
  description:
    "Computer Training Room Feedback Collection and Management System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
