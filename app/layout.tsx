import type { ReactNode } from "react";

export const metadata = {
  title: "Contentstack Concierge — streamText Demo",
  description: "Minimal Next.js app exercising @contentstack/agents-sdk streamText",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#0e1116",
          color: "#e6edf3",
        }}
      >
        {children}
      </body>
    </html>
  );
}
