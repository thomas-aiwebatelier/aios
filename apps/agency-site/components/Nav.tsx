import NavSession from "@/components/NavSession";
import { visibleServices } from "@/app/diensten/content";

/**
 * The public header.
 *
 * The service tabs are the navigation now — Website · Content · Marketing.
 * Consulting is hidden: it only appears for an admin, and NavSession adds it
 * client-side so this component (and with it every marketing page) can stay
 * statically prerendered. The real gate is middleware.ts, which 404s the hidden
 * service pages for anyone who is not an admin.
 */
export default function Nav() {
  return (
    <nav className="nav" aria-label="Hoofdnavigatie">
      <div className="container nav__inner">
        <a href="/" className="nav__logo" aria-label="AI Web Atelier — homepage">
          <video
            className="nav__mark"
            autoPlay
            muted
            loop
            playsInline
            poster="/video-poster.png"
            aria-hidden="true"
          >
            <source src="/video_logo.mp4" type="video/mp4" />
          </video>
          <span className="nav__wordmark">AI&nbsp;Web&nbsp;Atelier</span>
        </a>
        <div className="nav__links">
          {visibleServices(false).map((s) => (
            <a key={s.slug} href={`/diensten/${s.slug}`}>
              {s.navTitle}
            </a>
          ))}
          <a href="/#prijzen">Prijzen</a>
          <a href="/blog">Blog</a>
          <NavSession />
        </div>
        <a href="/diensten/build" className="nav__cta">
          Vraag je site aan
        </a>
      </div>
    </nav>
  );
}
