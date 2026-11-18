"use client";
// Last-resort boundary (root layout failed): no providers available, plain HTML + inline copy in all 3 languages.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="rw">
      <body style={{ fontFamily: "system-ui", padding: 32, background: "#ffffff", color: "#12161f" }}>
        <h1 style={{ color: "#1d2b7e" }}>Habaye ikibazo · Something went wrong · Un problème est survenu</h1>
        <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 0, background: "#1d2b7e", color: "#ffffff", border: 0, cursor: "pointer" }}>
          Ongera ugerageze · Try again · Réessayer
        </button>
      </body>
    </html>
  );
}
