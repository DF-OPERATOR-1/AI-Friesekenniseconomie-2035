import { BrandLogo } from './BrandLogo';
import darkModeIcon from '../assets/brand/darkmode.svg';
import lightModeIcon from '../assets/brand/lightmode.svg';
import { useEffect, useRef, useState } from 'react';
import { navigation } from '../content/nl';
import { useTheme } from '../hooks/useTheme';
export function Navigation({
  activeTab,
  route = '',
}: {
  activeTab: string;
  route?: string;
}) {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const aiMenu = useRef<HTMLDivElement>(null);
  const aiTrigger = useRef<HTMLButtonElement>(null);
  const closeMenus = () => {
    setOpen(false);
    setAiOpen(false);
  };
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!aiMenu.current?.contains(event.target as Node)) setAiOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && aiOpen) {
        setAiOpen(false);
        aiTrigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('hashchange', closeMenus);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('hashchange', closeMenus);
    };
  }, [aiOpen]);
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="site-header">
      <div className="nav-inner">
        <a
          className="brand"
          href="#home"
          aria-label="AI Index Fryslân, naar de homepage"
        >
          <BrandLogo />
          <span className="brand-title">
            AI Index <strong>Fryslân</strong>
            <small>DataFryslân</small>
          </span>
        </a>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Sluiten' : 'Menu'}
        </button>
        <nav
          id="main-navigation"
          aria-label="Hoofdnavigatie"
          className={open ? 'navigation is-open' : 'navigation'}
        >
          {navigation.map((item) =>
            item.href === '#invloed-ai' ? (
              <div
                className="nav-ai-disclosure"
                key={item.href}
                ref={aiMenu}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                    setAiOpen(false);
                }}
              >
                <button
                  ref={aiTrigger}
                  className={`nav-ai-trigger${activeTab === 'invloed-ai' ? ' is-active' : ''}`}
                  type="button"
                  aria-expanded={aiOpen}
                  aria-controls="ai-navigation-options"
                  onClick={() => setAiOpen(!aiOpen)}
                >
                  Invloed van AI{' '}
                  <span
                    aria-hidden="true"
                    className={aiOpen ? 'nav-chevron is-open' : 'nav-chevron'}
                  >
                    ⌄
                  </span>
                </button>
                <div
                  id="ai-navigation-options"
                  className="nav-ai-options"
                  hidden={!aiOpen}
                >
                  <p>Verken invloed van AI met jouw beroep</p>
                  <a
                    href="#invloed-ai"
                    onClick={closeMenus}
                    aria-current={
                      activeTab === 'invloed-ai' && route !== '#invloed-ai/exposure'
                        ? 'page'
                        : undefined
                    }
                  >
                    <strong>Perceptuele kaart</strong>
                    <small>Ontdek de positie van je beroep</small>
                  </a>
                  <a
                    href="#invloed-ai/exposure"
                    onClick={closeMenus}
                    aria-current={
                      activeTab === 'invloed-ai' && route === '#invloed-ai/exposure'
                        ? 'page'
                        : undefined
                    }
                  >
                    <strong>AI-exposure per beroep</strong>
                    <small>Vergelijk scores en bekijk de tabel</small>
                  </a>
                </div>
              </div>
            ) : (
              <a
                key={item.href}
                href={item.href}
                aria-current={activeTab === item.href.slice(1) ? 'page' : undefined}
                onClick={closeMenus}
              >
                {item.label}
              </a>
            ),
          )}
        </nav>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={
            theme === 'dark' ? 'Lichte modus inschakelen' : 'Donkere modus inschakelen'
          }
          title={
            theme === 'dark' ? 'Lichte modus inschakelen' : 'Donkere modus inschakelen'
          }
        >
          <img
            className="theme-toggle-icon"
            src={theme === 'dark' ? lightModeIcon : darkModeIcon}
            alt=""
            width="28"
            height="28"
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  );
}
