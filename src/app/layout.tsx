import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XSkill",
  description: "Connect talented students with clients. Validate skills, complete trials, and earn money on XSkill platform.",
  keywords: ["XSkill", "Student Skills", "Freelance", "Trials", "Skill Validation", "Earnings", "Remote Work"],
  authors: [{ name: "XSkill Team" }],
 
  openGraph: {
    title: "XSkill",
    description: "Validate your skills and connect with clients worldwide",
    url: "https://xskill.com",
    siteName: "XSkill",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XSkill Dashboard",
    description: "Student Skill Validation & Earning Platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
