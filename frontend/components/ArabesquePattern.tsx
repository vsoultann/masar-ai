/**
 * A geometric eight-point-star tessellation, drawn as an inline SVG pattern.
 *
 * Inline rather than an image file for three reasons: it inherits the current
 * text colour so it works in both themes, it costs no extra request, and it
 * carries no third-party licence. The motif is a generic Islamic geometric
 * construction, not any organisation's emblem.
 */
export default function ArabesquePattern({
  className = "",
  opacity = 0.06,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      width="100%"
      height="100%"
      style={{ opacity }}
    >
      <defs>
        <pattern
          id="masar-arabesque"
          width="64"
          height="64"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(0)"
        >
          {/* eight-point star: two overlaid squares */}
          <path
            d="M32 4 L44 16 L60 16 L60 32 L44 44 L44 60 L32 60 L20 44 L4 44 L4 32 L20 20 L20 4 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M32 12 L52 32 L32 52 L12 32 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          />
          <circle cx="32" cy="32" r="4" fill="none" stroke="currentColor" strokeWidth="0.8" />
          {/* corner quarters, so the tile reads as continuous */}
          <path d="M0 0 L8 8 M64 0 L56 8 M0 64 L8 56 M64 64 L56 56"
                stroke="currentColor" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#masar-arabesque)" />
    </svg>
  );
}
