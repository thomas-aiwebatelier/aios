export default function Nav() {
  return (
    <nav className="nav" aria-label="Hoofdnavigatie">
      <div className="container nav__inner">
        <a href="/" className="nav__logo" aria-label="AI Web Atelier — homepage">
          <svg
            className="nav__mark"
            width="28"
            height="28"
            viewBox="0 0 50 50"
            fill="none"
            aria-hidden="true"
          >
            <path d="M11 40 L23 13" stroke="#2F3B30" strokeWidth="4" strokeLinecap="round" />
            <path d="M37 40 L25 13" stroke="#2F3B30" strokeWidth="4" strokeLinecap="round" />
            <circle cx="24" cy="28" r="4.8" fill="#C97B4A" />
          </svg>
          <span className="nav__wordmark">AI&nbsp;Web&nbsp;Atelier</span>
        </a>
        <div className="nav__links">
          <a href="/#diensten">Diensten</a>
          <a href="/#werkwijze">Werkwijze</a>
          <a href="/#prijzen">Prijzen</a>
          <a href="/#getuigenissen">Getuigenissen</a>
          <a href="/#over-ons">Over ons</a>
        </div>
        <a href="/#contact" className="nav__cta">
          Vraag een voorbeeld
        </a>
      </div>
    </nav>
  );
}
