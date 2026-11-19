import Link from 'next/link';
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Slotdove home">
      <svg width="34" height="34" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="brand-a" x1="3" x2="38" y1="3" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#35c6b5" />
            <stop offset=".48" stopColor="#0d7f79" />
            <stop offset="1" stopColor="#0b3b40" />
          </linearGradient>
        </defs>
        <path
          d="M18 6c2-2 4-3 7-3h14c2 0 3 2 2 4l-8 11H23c-2 0-3 1-4 2l-5 7H3c-2 0-3-2-2-4L18 6Z"
          fill="url(#brand-a)"
        />
        <path
          d="M26 18c2-2 4-3 6-3h9c2 0 3 2 2 4L27 38c-2 2-5 3-8 3H4c-2 0-3-2-2-4l8-11h10c2 0 3-1 4-2l2-6Z"
          fill="url(#brand-a)"
          opacity=".9"
        />
      </svg>
      {!compact && (
        <span>
          slotdove<span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
