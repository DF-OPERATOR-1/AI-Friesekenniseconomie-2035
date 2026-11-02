import logoDark from '../assets/brand/df-logo.svg';
import logoLight from '../assets/brand/df-logo-light.svg';
import artworkDark from '../assets/brand/frl-dark.svg';
import artworkLight from '../assets/brand/frl-light.svg';
import footerOnLight from '../assets/brand/footer-logo-on-light.svg';
import footerOnDark from '../assets/brand/footer-logo-on-dark.svg';

export function BrandLogo() {
  return (
    <span className="company-logo" role="img" aria-label="DataFryslân">
      <img
        className="company-logo-default"
        src={logoDark}
        alt=""
        width="48"
        height="48"
      />
      <img
        className="company-logo-light"
        src={logoLight}
        alt=""
        width="48"
        height="48"
      />
    </span>
  );
}
export function BrandArtwork() {
  return (
    <div className="brand-artwork" aria-hidden="true">
      <img
        className="brand-artwork-dark"
        src={artworkDark}
        alt=""
        width="1080"
        height="1080"
        loading="lazy"
      />
      <img
        className="brand-artwork-light"
        src={artworkLight}
        alt=""
        width="1080"
        height="1080"
        loading="lazy"
      />
    </div>
  );
}

export function FooterBrand() {
  return (
    <span
      className="footer-brand-image"
      role="img"
      aria-label="DataFryslân — Boarne fan ynsicht"
    >
      <img
        className="footer-brand-on-light"
        src={footerOnLight}
        alt=""
        width="180"
        height="62"
      />
      <img
        className="footer-brand-on-dark"
        src={footerOnDark}
        alt=""
        width="180"
        height="62"
      />
    </span>
  );
}
