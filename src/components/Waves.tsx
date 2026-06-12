/** Hand-cut wave divider between sections. */
export function Waves({ className = '' }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="block h-8 w-full">
        <path
          d="M0 24 Q 30 8, 60 24 T 120 24 T 180 24 T 240 24 T 300 24 T 360 24 T 420 24 T 480 24 T 540 24 T 600 24 T 660 24 T 720 24 T 780 24 T 840 24 T 900 24 T 960 24 T 1020 24 T 1080 24 T 1140 24 T 1200 24"
          fill="none"
          stroke="#1f6079"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M0 34 Q 30 20, 60 34 T 120 34 T 180 34 T 240 34 T 300 34 T 360 34 T 420 34 T 480 34 T 540 34 T 600 34 T 660 34 T 720 34 T 780 34 T 840 34 T 900 34 T 960 34 T 1020 34 T 1080 34 T 1140 34 T 1200 34"
          fill="none"
          stroke="#1d2b49"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    </div>
  )
}
