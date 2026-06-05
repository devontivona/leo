// The classic six-color "rainbow" Apple logo — the authentic Mac OS 8/9 menu
// icon (the monochrome Apple came with Mac OS X). The silhouette clips six
// horizontal color bands; the leaf falls in the top green band, as on the
// original. Stripes top→bottom: green, yellow, orange, red, violet, blue.
export function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Apple menu"
      className={className}
    >
      <defs>
        <clipPath id="apple-rainbow-clip">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </clipPath>
      </defs>
      <g clipPath="url(#apple-rainbow-clip)">
        <rect x="0" y="0" width="24" height="4" fill="#5EB14E" />
        <rect x="0" y="4" width="24" height="4" fill="#F6BC15" />
        <rect x="0" y="8" width="24" height="4" fill="#F07F18" />
        <rect x="0" y="12" width="24" height="4" fill="#DD3E35" />
        <rect x="0" y="16" width="24" height="4" fill="#92278F" />
        <rect x="0" y="20" width="24" height="4" fill="#1C95D4" />
      </g>
    </svg>
  );
}
