import Link from "next/link";

type BlitzPayLogoProps = {
  size?: "sm" | "md" | "lg";
  href?: string;
  subtitle?: string;
};

const sizes = {
  sm: { icon: 28, word: 18, sub: 11, gap: 8 },
  md: { icon: 36, word: 22, sub: 12, gap: 10 },
  lg: { icon: 44, word: 28, sub: 13, gap: 12 },
};

function LogoIcon({ size }: { size: number }) {
  const id = `bp-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7B5CFF" />
          <stop stopColor="#5535CC" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      {/* QR corner marks */}
      <rect x="8" y="8" width="9" height="9" rx="1.5" fill="white" fillOpacity="0.22" />
      <rect x="23" y="8" width="9" height="9" rx="1.5" fill="white" fillOpacity="0.22" />
      <rect x="8" y="23" width="9" height="9" rx="1.5" fill="white" fillOpacity="0.22" />
      {/* Lightning bolt */}
      <path
        d="M22.5 10L15.5 21.5H20.5L17.5 30L26.5 18.5H21.5L22.5 10Z"
        fill="white"
        filter={`url(#${id}-glow)`}
      />
    </svg>
  );
}

export function BlitzPayLogo({ size = "md", href = "/", subtitle }: BlitzPayLogoProps) {
  const s = sizes[size];

  const content = (
    <div className="bp-logo" style={{ gap: s.gap }}>
      <LogoIcon size={s.icon} />
      <div className="bp-logo-text">
        <span className="bp-logo-word" style={{ fontSize: s.word }}>
          <span className="bp-logo-blitz">Blitz</span>
          <span className="bp-logo-pay">Pay</span>
        </span>
        {subtitle && (
          <span className="bp-logo-sub" style={{ fontSize: s.sub }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="bp-logo-link">
        {content}
      </Link>
    );
  }

  return content;
}
