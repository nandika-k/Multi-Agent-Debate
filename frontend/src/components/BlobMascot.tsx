interface BlobMascotProps {
  side: "pro" | "con";
  size?: number;
  className?: string;
}

export function BlobMascot({ side, size = 120, className = "" }: BlobMascotProps) {
  const fill = side === "pro" ? "#e8a0a0" : "#9db5e8";

  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 120 120"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Organic blob body */}
      <path
        d="M60 8 C84 6, 110 26, 112 56 C114 82, 92 112, 62 114 C32 116, 8 94, 8 66 C8 38, 36 10, 60 8 Z"
        fill={fill}
        stroke="#3d2000"
        strokeWidth="3"
      />
      {/* Left eye white */}
      <circle cx="43" cy="53" fill="white" r="9" />
      {/* Left pupil */}
      <circle cx="45" cy="55" fill="#111" r="6" />
      {/* Left eye shine */}
      <circle cx="42" cy="51" fill="white" r="2" />
      {/* Right eye white */}
      <circle cx="69" cy="51" fill="white" r="9" />
      {/* Right pupil */}
      <circle cx="71" cy="53" fill="#111" r="6" />
      {/* Right eye shine */}
      <circle cx="68" cy="49" fill="white" r="2" />
      {/* Smile */}
      <path
        d="M 44 72 Q 60 84 76 72"
        fill="none"
        stroke="#3d2000"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
