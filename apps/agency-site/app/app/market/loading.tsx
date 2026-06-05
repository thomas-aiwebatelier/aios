/**
 * Instant loading UI for the Market sub-tabs. The sub-pages are server
 * components that query Supabase on navigation; without this, switching tabs
 * blocks with no feedback until the query returns. Next shows this immediately
 * while the next page streams in.
 */
export default function MarketLoading() {
  return (
    <main className="container portal-home">
      <div className="processing">
        <span className="processing__spinner" aria-hidden="true" />
        <p className="portal-home__lead">Laden…</p>
      </div>
    </main>
  );
}
