import type { SVGProps } from 'react';

interface LogoProps {
  /** Use the dark-mode values even on always-dark surfaces (e.g. the Sidebar). */
  onDark?: boolean;
  className?: string;
}

export default function Logo({ onDark = false, className }: LogoProps) {
  return (
    <div
      className={`flex items-center gap-2 ${onDark ? 'logo-on-dark' : ''} ${
        className ?? ''
      }`}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="8"
          width="4"
          height="8"
          rx="2"
          fill="var(--logo-ink)"
          fill-opacity="0.45"
        />
        <rect
          x="10"
          y="4"
          width="4"
          height="16"
          rx="2"
          fill="var(--logo-ink)"
          fill-opacity="0.75"
        />
        <rect
          x="16"
          y="8"
          width="4"
          height="8"
          rx="2"
          fill="var(--logo-ink)"
          fill-opacity="1"
        />
        <circle cx="20" cy="20" r="2" fill="var(--logo-accent)" />
      </svg>
      <span
        className="text-base font-semibold tracking-tight"
        style={{ color: 'var(--logo-ink)' }}
      >
        LumiDash
      </span>
    </div>
  );
}
