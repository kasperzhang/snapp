// The snapp mark. Draws in `currentColor` so it inherits from whatever it sits
// in — white inside the mocha tile, ink when standing on its own.
// Source of truth for the shape is also kept at /public/logo.svg, which is what
// Google's OAuth consent screen and other external surfaces point at.

interface LogoMarkProps {
  className?: string;
}

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M31.6442 3.07696C32.622 3.22502 33.3448 4.06548 33.3448 5.05441L33.3448 18.8127L11.3252 16.6727L11.3252 4.9504e-07L31.6442 3.07696Z"
        fill="currentColor"
      />
      <path
        d="M22.0196 16.6727L22.0196 33.347L1.70041 30.2685C0.72269 30.1204 6.90753e-07 29.28 7.33978e-07 28.2911L1.33541e-06 14.532L22.0196 16.6727Z"
        fill="currentColor"
      />
    </svg>
  );
}
