import "./globals.css";
import AppShell from "./components/AppShell";

export const metadata = {
  title: "QueueLess",
  description: "Patient queue management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><AppShell>{children}</AppShell></body>
    </html>
  );
}
