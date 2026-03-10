import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exam Trainer",
  description: "RU/KZ exam trainer with statistics and mistake correction"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <div className="app-bg" />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
