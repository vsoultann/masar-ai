import Link from "next/link";

/**
 * Root-level 404, reached only for paths the locale middleware did not rewrite.
 * It cannot use the locale context (there is no locale), so it is bilingual by
 * showing both languages at once.
 */
export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          background: "#ffffff",
          color: "#111827",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "3rem", fontWeight: 900, color: "#00732f", margin: 0 }}>404</p>
          <p style={{ marginTop: "1rem" }}>That page does not exist.</p>
          <p style={{ marginTop: "0.25rem" }} lang="ar" dir="rtl">
            هذه الصفحة غير موجودة.
          </p>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/en" style={{ color: "#00732f", fontWeight: 600 }}>
              Masar AI
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
