import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { Button, Icon } from "./ui";

interface SplashScreenProps {
  /** Whether the app backend is ready (loading finished without error). */
  ready: boolean;
  /** Called after the warp-out animation completes. */
  onEnter: () => void;
}

/**
 * BubRail Splash — inspired by Honkai: Star Rail's launcher.
 * Phase 1 (loading): cosmic background + logo + loading indicator.
 * Phase 2 (ready): right-side menu buttons + bottom "click to enter" banner.
 */
export function SplashScreen({ ready, onEnter }: SplashScreenProps) {
  const { t } = useI18n();
  const [warping, setWarping] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | undefined>(undefined);

  const handleEnter = useCallback(() => {
    if (!ready || warping) return;
    setWarping(true);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      onEnter();
    }, 1000);
  }, [ready, warping, onEnter]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  if (!visible) return null;

  return (
    <div className={`splash-root${ready ? " ready" : ""}${warping ? " warping" : ""}`} role="dialog" aria-label={t("splashTitle")}>
      {/* Starfield background */}
      <div className="splash-stars" aria-hidden="true">
        <div className="splash-stars-layer splash-stars-a" />
        <div className="splash-stars-layer splash-stars-b" />
        <div className="splash-stars-layer splash-stars-c" />
      </div>

      {/* Nebula glow orbs */}
      <div className="splash-nebula" aria-hidden="true">
        <div className="splash-nebula-orb splash-nebula-1" />
        <div className="splash-nebula-orb splash-nebula-2" />
      </div>

      {/* Rail track lines */}
      <div className="splash-rails" aria-hidden="true">
        <div className="splash-rail splash-rail-1" />
        <div className="splash-rail splash-rail-2" />
        <div className="splash-rail splash-rail-3" />
      </div>

      {/* Star Rail Train — multi-car */}
      <div className={`splash-train${ready ? " arrived" : ""}`} aria-hidden="true">
        <svg viewBox="0 0 780 140" className="splash-train-svg">
          {/* === Locomotive (head) === */}
          <path d="M620 100 L640 50 L740 50 L770 72 L770 100 Z" className="train-body" />
          <path d="M740 50 L780 72 L770 72 L770 100 L740 100 Z" className="train-nose" />
          <path d="M640 50 L740 50 L735 44 L645 44 Z" className="train-roof" />
          <rect x="655" y="60" width="22" height="18" rx="3" className="train-window" />
          <rect x="685" y="60" width="22" height="18" rx="3" className="train-window" />
          <rect x="715" y="60" width="18" height="18" rx="3" className="train-window train-window-nose" />
          <rect x="635" y="100" width="130" height="7" rx="3" className="train-base" />
          <circle cx="665" cy="114" r="7" className="train-wheel" />
          <circle cx="700" cy="114" r="7" className="train-wheel" />
          <circle cx="735" cy="114" r="7" className="train-wheel" />
          <circle cx="772" cy="80" r="4" className="train-headlight" />
          {/* === Coupler 1 === */}
          <rect x="608" y="88" width="14" height="6" rx="2" className="train-coupler" />
          {/* === Carriage 1 === */}
          <path d="M470 100 L480 52 L600 52 L608 60 L608 100 Z" className="train-body" />
          <path d="M480 52 L600 52 L596 46 L484 46 Z" className="train-roof" />
          <rect x="492" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="520" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="548" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="576" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="478" y="100" width="126" height="7" rx="3" className="train-base" />
          <circle cx="505" cy="114" r="7" className="train-wheel" />
          <circle cx="540" cy="114" r="7" className="train-wheel" />
          <circle cx="575" cy="114" r="7" className="train-wheel" />
          {/* === Coupler 2 === */}
          <rect x="456" y="88" width="14" height="6" rx="2" className="train-coupler" />
          {/* === Carriage 2 === */}
          <path d="M318 100 L328 52 L448 52 L456 60 L456 100 Z" className="train-body" />
          <path d="M328 52 L448 52 L444 46 L332 46 Z" className="train-roof" />
          <rect x="340" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="368" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="396" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="424" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="326" y="100" width="126" height="7" rx="3" className="train-base" />
          <circle cx="353" cy="114" r="7" className="train-wheel" />
          <circle cx="388" cy="114" r="7" className="train-wheel" />
          <circle cx="423" cy="114" r="7" className="train-wheel" />
          {/* === Coupler 3 === */}
          <rect x="304" y="88" width="14" height="6" rx="2" className="train-coupler" />
          {/* === Carriage 3 (tail) === */}
          <path d="M180 100 L190 52 L296 52 L304 60 L304 100 Z" className="train-body" />
          <path d="M190 52 L296 52 L292 46 L194 46 Z" className="train-roof" />
          <path d="M180 100 L190 52 L172 62 L172 100 Z" className="train-tail" />
          <rect x="198" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="226" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="254" y="62" width="20" height="16" rx="3" className="train-window" />
          <rect x="178" y="100" width="122" height="7" rx="3" className="train-base" />
          <circle cx="205" cy="114" r="7" className="train-wheel" />
          <circle cx="240" cy="114" r="7" className="train-wheel" />
          <circle cx="275" cy="114" r="7" className="train-wheel" />
          {/* === Energy trail === */}
          <path d="M172 100 L140 100 L158 88 L120 88 L142 76 L100 76 L125 64 L80 64" className="train-trail" />
          <path d="M172 94 L150 94 L162 84 L130 84" className="train-trail train-trail-2" />
        </svg>
        <div className="splash-train-glow" />
      </div>

      {/* Logo / Title — large centered like Star Rail */}
      <div className="splash-logo-group">
        <span className="splash-logo-prefix">Code</span>
        <h1 className="splash-logo-title">BubRail</h1>
        <p className="splash-logo-subtitle">{t("splashSubtitle")}</p>
      </div>

      {/* Right-side menu (visible when ready) */}
      <nav className="splash-menu" aria-label={t("splashMenuLabel")}>
        <Button unstyled className="splash-menu-btn" title={t("splashMenuSettings")}>
          <Icon name="settings" />
          <span>{t("splashMenuSettings")}</span>
        </Button>
        <Button unstyled className="splash-menu-btn" title={t("splashMenuAccount")}>
          <Icon name="user" />
          <span>{t("splashMenuAccount")}</span>
        </Button>
        <Button unstyled className="splash-menu-btn" title={t("splashMenuUpdate")}>
          <Icon name="refresh" />
          <span>{t("splashMenuUpdate")}</span>
        </Button>
        <Button unstyled className="splash-menu-btn" title={t("splashMenuLogin")}>
          <Icon name="play" />
          <span>{t("splashMenuLogin")}</span>
        </Button>
      </nav>

      {/* Bottom area */}
      <div className="splash-bottom">
        {/* Loading indicator (phase 1) */}
        {!ready && (
          <div className="splash-loading">
            <span className="splash-loading-ring" aria-hidden="true" />
            <span className="splash-loading-text">{t("splashInitializing")}</span>
          </div>
        )}
        {/* Enter banner (phase 2) */}
        {ready && !warping && (
          <Button unstyled className="splash-enter-banner" onClick={handleEnter}>
            <span className="splash-enter-text">{t("splashEnter")}</span>
          </Button>
        )}
        {warping && <p className="splash-warping-text">{t("splashWarping")}</p>}
      </div>

      {/* Bottom-right play button */}
      <Button unstyled className={`splash-play-btn${ready ? " active" : ""}`} onClick={handleEnter} disabled={!ready || warping} aria-label={t("splashEnter")}>
        <Icon name="play" />
      </Button>

      {/* Version footer — bottom left */}
      <footer className="splash-footer">
        <span>BubRail Engine v1.0.0</span>
      </footer>
    </div>
  );
}
