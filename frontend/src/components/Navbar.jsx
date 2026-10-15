import { useEffect, useState } from "react";
import "../styles/navbar.css";

const LINKS = [
  { id: "purpose", label: "Purpose" },
  { id: "features", label: "Features" },
  { id: "design", label: "Design" },
  { id: "stack", label: "Stack" },
  { id: "pricing", label: "Pricing" },
  { id: "for", label: "For" },
];

export default function Navbar({
  onLogin,
  onRegister,
  onTry,
  onEnter,
  theme,
  onToggleTheme,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("purpose");
  const close = () => setOpen(false);

  const goLogin = onLogin || onEnter;
  const goTry = onTry || onRegister || onEnter;

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      Boolean,
    );
    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const themeIcon = theme === "dark" ? "bi-sun" : "bi-moon-stars";
  const themeLabel =
    theme === "dark" ? "Switch to day desk" : "Switch to night desk";

  return (
    <nav className="nav">
      <div className="nav-row">
        <a href="#purpose" className="nav-brand" onClick={close}>
          <span className="nav-mark">SC</span>
          <span className="nav-name">StudyCite</span>
        </a>

        <div className="nav-links">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={`nav-link${active === l.id ? " is-active" : ""}`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="nav-actions">
          <button
            className="nav-theme"
            onClick={onToggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            <i className={`bi ${themeIcon}`} />
          </button>
          <button
            type="button"
            className="nav-login"
            onClick={() => goLogin?.()}
          >
            Log in
          </button>
          <button type="button" className="nav-cta" onClick={() => goTry?.()}>
            <span>Try StudyCite</span>
            <i className="bi bi-arrow-right" />
          </button>
        </div>

        <button
          className={`nav-burger${open ? " is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`nav-panel${open ? " is-open" : ""}`} aria-hidden={!open}>
        <div className="nav-panel-inner">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={`nav-panel-link${active === l.id ? " is-active" : ""}`}
              onClick={close}
              tabIndex={open ? 0 : -1}
            >
              {l.label}
            </a>
          ))}
          <div className="nav-panel-actions">
            <button
              className="nav-panel-theme"
              onClick={onToggleTheme}
              tabIndex={open ? 0 : -1}
            >
              <i className={`bi ${themeIcon}`} />
              <span>{theme === "dark" ? "Day desk" : "Night desk"}</span>
            </button>
            <button
              type="button"
              className="nav-login"
              onClick={() => {
                close();
                goLogin?.();
              }}
              tabIndex={open ? 0 : -1}
            >
              Log in
            </button>
            <button
              type="button"
              className="nav-cta"
              onClick={() => {
                close();
                goTry?.();
              }}
              tabIndex={open ? 0 : -1}
            >
              <span>Try StudyCite</span>
              <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
