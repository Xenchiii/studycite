import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../styles/authpage.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FLIP_MS = 800;
const MODES = ["login", "register"];

const RULES = [
  { id: "len", label: "8+ characters", test: (p) => p.length >= 8 },
  {
    id: "case",
    label: "Upper and lower case",
    test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  },
  { id: "num", label: "A number", test: (p) => /\d/.test(p) },
  { id: "sym", label: "A symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];

function validate(mode, v) {
  const e = {};
  if (mode === "register" && !v.name.trim())
    e.name = "Tell us what to call you.";
  if (!v.email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(v.email.trim()))
    e.email = "That doesn't look like an email address.";
  if (!v.password) e.password = "Enter your password.";
  else if (mode === "register" && v.password.length < 8)
    e.password = "Use at least 8 characters.";
  if (mode === "register" && !v.agree)
    e.agree = "Please accept the terms to continue.";
  return e;
}

export default function AuthPage({
  initialMode = "login",
  onSubmit = async () => {
    throw new Error("Sign-in isn't connected yet. Pass an onSubmit prop.");
  },
  onForgot,
  onGuest,
  onBack,
}) {
  const [mode, setMode] = useState(initialMode);
  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    remember: true,
    agree: false,
  });
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [success, setSuccess] = useState(false);
  const [height, setHeight] = useState(null);
  const tabRefs = useRef({});
  const faceRefs = useRef({});
  const flipTimer = useRef(null);

  const isLogin = mode === "login";
  const errors = validate(mode, values);
  const show = (field) => (touched[field] || attempted) && errors[field];

  useLayoutEffect(() => {
    const el = faceRefs.current[mode];
    if (!el) return undefined;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => () => clearTimeout(flipTimer.current), []);

  const set = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
  };
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const switchMode = (next, focus = false) => {
    if (next === mode) return;
    clearTimeout(flipTimer.current);
    setFlipping(true);
    flipTimer.current = setTimeout(() => setFlipping(false), FLIP_MS);
    setMode(next);
    setError(null);
    setAttempted(false);
    setTouched({});
    setShowPassword(false);
    setCapsOn(false);
    if (focus)
      requestAnimationFrame(() => tabRefs.current[`${next}-${next}`]?.focus());
  };

  const onTabKey = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      switchMode(isLogin ? "register" : "login", true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setAttempted(true);
    const firstBad = ["name", "email", "password", "agree"].find(
      (f) => errors[f],
    );
    if (firstBad) {
      document.getElementById(`au-${mode}-${firstBad}`)?.focus();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        mode,
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        remember: values.remember,
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const passed = RULES.filter((r) => r.test(values.password)).length;
  const tooShort = values.password.length > 0 && values.password.length < 8;
  const segs = !values.password ? 0 : tooShort ? 1 : Math.max(1, passed);

  const renderFace = (m) => {
    const login = m === "login";
    const active = m === mode;
    const err = (field) => (active ? show(field) : undefined);
    const fid = (field) => `au-${m}-${field}`;

    return (
      <section
        ref={(el) => (faceRefs.current[m] = el)}
        className={`au-face ${login ? "au-front" : "au-back"} au-form-side`}
        aria-hidden={!active}
      >
        <div className="requisition-head au-head">
          <span>MEMBER ACCESS</span>
          <span>FORM {login ? "A-1" : "A-2"}</span>
        </div>

        <div className="au-body">
          <h1 className="au-title">
            {login ? "Welcome back" : "Open your account"}
          </h1>
          <p className="au-sub">
            {login
              ? "Sign in to pick up where your last session left off."
              : "Free to start. Add a few documents and ask your first question in a minute."}
          </p>

          <div
            className="au-tabs"
            data-active={login ? 0 : 1}
            role="tablist"
            aria-label="Sign in or create account"
            onKeyDown={onTabKey}
          >
            {MODES.map((t) => (
              <button
                key={t}
                ref={(el) => (tabRefs.current[`${m}-${t}`] = el)}
                type="button"
                role="tab"
                id={`au-tab-${m}-${t}`}
                aria-selected={m === t}
                aria-controls={`au-form-${m}`}
                tabIndex={m === t ? 0 : -1}
                className={`au-tab${m === t ? " active" : ""}`}
                onClick={() => switchMode(t)}
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {active && error && (
            <div className="status-banner error" role="alert">
              {error}
            </div>
          )}

          <form
            id={`au-form-${m}`}
            className="au-form"
            role="tabpanel"
            aria-labelledby={`au-tab-${m}-${m}`}
            onSubmit={handleSubmit}
            noValidate
          >
            {!login && (
              <Field id={fid("name")} label="Full name" error={err("name")}>
                <input
                  id={fid("name")}
                  value={values.name}
                  onChange={set("name")}
                  onBlur={blur("name")}
                  autoComplete="name"
                  aria-invalid={!!err("name")}
                  aria-describedby={
                    err("name") ? `${fid("name")}-err` : undefined
                  }
                />
              </Field>
            )}

            <Field id={fid("email")} label="Email" error={err("email")}>
              <input
                id={fid("email")}
                type="email"
                inputMode="email"
                value={values.email}
                onChange={set("email")}
                onBlur={blur("email")}
                autoComplete="email"
                aria-invalid={!!err("email")}
                aria-describedby={
                  err("email") ? `${fid("email")}-err` : undefined
                }
              />
            </Field>

            <Field
              id={fid("password")}
              label="Password"
              error={err("password")}
            >
              <div className="au-pass-row">
                <input
                  id={fid("password")}
                  type={active && showPassword ? "text" : "password"}
                  value={values.password}
                  onChange={set("password")}
                  onBlur={blur("password")}
                  onKeyUp={(e) =>
                    setCapsOn(e.getModifierState?.("CapsLock") ?? false)
                  }
                  autoComplete={login ? "current-password" : "new-password"}
                  aria-invalid={!!err("password")}
                  aria-describedby={
                    [
                      err("password") && `${fid("password")}-err`,
                      active && capsOn && fid("caps"),
                      !login && fid("rules"),
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                />
                <button
                  type="button"
                  className="au-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={active && showPassword}
                >
                  {active && showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {active && capsOn && (
                <span id={fid("caps")} className="au-caps">
                  Caps Lock is on
                </span>
              )}

              {!login && (
                <div id={fid("rules")} className="au-rules">
                  <div className="au-strength" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        className={`au-seg${segs > 0 && n <= segs ? ` s${tooShort ? 0 : segs}` : ""}`}
                      />
                    ))}
                  </div>
                  <span className="au-strength-label" aria-live="polite">
                    {!values.password
                      ? "Choose a password"
                      : tooShort
                        ? "Too short"
                        : STRENGTH_LABEL[segs]}
                  </span>
                  <ul>
                    {RULES.map((r) => (
                      <li
                        key={r.id}
                        className={r.test(values.password) ? "ok" : ""}
                      >
                        {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Field>

            {login ? (
              <div className="au-row">
                <label className="au-check">
                  <input
                    type="checkbox"
                    checked={values.remember}
                    onChange={set("remember")}
                  />
                  Keep me signed in
                </label>
                {onForgot && (
                  <button type="button" className="au-link" onClick={onForgot}>
                    Forgot password?
                  </button>
                )}
              </div>
            ) : (
              <div>
                <label className="au-check">
                  <input
                    id={fid("agree")}
                    type="checkbox"
                    checked={values.agree}
                    onChange={set("agree")}
                    aria-invalid={!!err("agree")}
                    aria-describedby={
                      err("agree") ? `${fid("agree")}-err` : undefined
                    }
                  />
                  I agree to the terms and privacy policy
                </label>
                {err("agree") && (
                  <span
                    id={`${fid("agree")}-err`}
                    className="au-err"
                    role="alert"
                  >
                    {errors.agree}
                  </span>
                )}
              </div>
            )}

            <button
              className="hero-cta-primary au-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? "Please wait…" : login ? "Sign in →" : "Create account →"}
            </button>
          </form>

          {onGuest && (
            <>
              <div className="au-or">
                <span>or</span>
              </div>
              <button
                type="button"
                className="hero-cta-secondary-btn"
                onClick={onGuest}
              >
                Try the demo without an account
              </button>
            </>
          )}

          <p className="au-switch-line">
            {login ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="au-link"
              onClick={() => switchMode(login ? "register" : "login")}
            >
              {login ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    );
  };

  return (
    <div className="au-shell">
      <div className="top-stripe" />

      <div className="au-wrap">
        {onBack && (
          <button type="button" className="exit-link au-exit" onClick={onBack}>
            ← Back to site
          </button>
        )}

        <div className="au-layout">
          <aside className="au-brand">
            <div className="au-brand-top">
              <span className="brand-mark au-mark">SC</span>
              <strong>StudyCite</strong>
            </div>

            <h2 className="au-headline">
              Every claim, traced to <em>its source.</em>
            </h2>
            <p className="au-copy">
              Upload your notes and readings, ask questions, and get answers
              where every sentence points back to the exact excerpt.
            </p>

            <div className="citation-card au-sample" aria-hidden="true">
              <div className="citation-card-head">
                <span className="doc-name">[1] Biology_Ch4.pdf</span>
                <span className="score-pill high">VERIFIED · 62%</span>
              </div>
              <p className="citation-excerpt">
                Photosynthesis converts light energy into chemical energy stored
                in glucose.
              </p>
            </div>
            <p className="au-sample-note">
              Sample card. Your own documents show up here after you sign in.
            </p>

            <ul className="au-points">
              <li>Citations link to the real passage</li>
              <li>Weak matches are flagged, not hidden</li>
              <li>Your files stay in your account</li>
            </ul>
          </aside>

          <main
            className={`au-flip${flipping ? " is-flipping" : ""}${success ? " is-success" : ""}`}
            data-side={mode}
          >
            <div
              className="au-flip-inner"
              style={height ? { "--au-flip-h": `${height}px` } : undefined}
            >
              {renderFace("login")}
              {renderFace("register")}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, error, children }) {
  return (
    <div className="au-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span id={`${id}-err`} className="au-err" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
