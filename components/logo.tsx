export function HelipodLogo({ size = 32, color = "#10b981" }: { size?: number, color?: string }) {
  return (
    <div className="logo-container group" style={{ width: size, height: size }}>
      <style>
        {`
          .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            /* Transition for the takeoff/landing movement */
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          /* --- HOVER STATE (ACTIVE FLIGHT) --- */
          .logo-container:hover {
            transform: translateY(-10px); /* Lifts up */
          }

          /* Only animate the rotor when the parent is hovered */
          .logo-container:hover .rotor-blade {
            animation: rotor-blade-spin 0.4s linear infinite;
          }

          /* Only pulse the core when flying */
          .logo-container:hover .logo-core {
            animation: core-pulse 1.5s ease-in-out infinite;
          }

          /* --- ANIMATION KEYFRAMES --- */
          @keyframes rotor-blade-spin {
            0% { transform: scaleX(1); opacity: 1; }
            50% { transform: scaleX(0.1); opacity: 0.7; }
            100% { transform: scaleX(1); opacity: 1; }
          }

          @keyframes core-pulse {
            0%, 100% { opacity: 1; filter: brightness(1); }
            50% { opacity: 0.6; filter: brightness(1.8); }
          }

          /* --- STATIC ELEMENTS --- */
          .rotor-blade {
            transform-origin: center;
            /* No animation here - it stays still by default */
          }

          .logo-core {
             transition: filter 0.3s ease;
          }
          
          .pod-shadow {
            transition: all 0.3s ease;
            opacity: 0.2;
            transform-origin: center;
          }

          .logo-container:hover .pod-shadow {
            transform: scale(0.5); /* Shadow gets smaller as pod gets higher */
            opacity: 0.05;
            filter: blur(2px);
          }
        `}
      </style>

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ color: color, filter: `drop-shadow(0 0 12px ${color}40)` }}
      >
        {/* Ground Shadow */}
        <ellipse cx="50" cy="95" rx="20" ry="4" fill="black" className="pod-shadow" />

        {/* Outer Circular Frame */}
        <path
          d="M 20 50 A 30 30 0 1 0 80 50"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />

        {/* Top Rotor Assembly */}
        <g className="rotor-blade">
          <line x1="15" y1="20" x2="85" y2="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </g>
        <line x1="50" y1="20" x2="50" y2="35" stroke="currentColor" strokeWidth="4" />

        {/* Main Body */}
        <path
          d="M 30 75 L 50 35 L 70 75"
          stroke="currentColor"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The Signal Core */}
        <circle
          cx="50"
          cy="52"
          r="6"
          fill="currentColor"
          className="logo-core"
        />

        {/* Static Landing Detail */}
        <circle cx="50" cy="52" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      </svg>
    </div>
  );
}