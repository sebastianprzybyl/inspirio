import "./globals.css";

export const metadata = {
  title: "Inspirio — Panel zatwierdzania",
  description: "Panel zarządzania postami Instagram",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

