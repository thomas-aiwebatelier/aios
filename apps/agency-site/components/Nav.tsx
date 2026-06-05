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
          <a href="/diensten">Diensten</a>
          <a href="/#werkwijze">Werkwijze</a>
          <a href="/#prijzen">Prijzen</a>
          <a href="/#getuigenissen">Getuigenissen</a>
          <a href="/blog">Blog</a>
          <a href="/#over-ons">Over ons</a>
        </div>
        <a href="/#contact" className="nav__cta">
          Vraag je site aan
        </a>
      </div>
    </nav>
  );
}
