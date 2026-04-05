export function HelipodLogo({
  className = '',
  size,
  color = 'var(--color-brand)',
}: {
  className?: string;
  size?: number;
  color?: string;
}) {
  return (
    <span
      className={`helipod-logo ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        className="helipod-logo-svg"
        style={{ color }}
      >
        <ellipse cx="50" cy="95" rx="20" ry="4" fill="black" className="helipod-logo-shadow" />

        <path
          d="M 20 50 A 30 30 0 1 0 80 50"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />

        <g className="helipod-logo-rotor">
          <line x1="15" y1="20" x2="85" y2="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </g>
        <line x1="50" y1="20" x2="50" y2="35" stroke="currentColor" strokeWidth="4" />

        <path
          d="M 30 75 L 50 35 L 70 75"
          stroke="currentColor"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx="50" cy="52" r="6" fill="currentColor" className="helipod-logo-core" />

        <circle cx="50" cy="52" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      </svg>
    </span>
  );
}