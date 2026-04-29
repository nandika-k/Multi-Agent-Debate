// Bell icon sourced from Icons8 (https://icons8.com/icon/82789/bell)
type Props = {
  size?: number
  color?: string
  className?: string
}

export function Icons8Bell({ size = 18, color = '#F5A623', className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Bell body */}
      <path
        fill={color}
        d="M25 3C18.37 3 13 8.37 13 15v2.09C9.58 18.56 7 21.48 7 25v14h36V25c0-3.52-2.58-6.44-6-7.91V15C37 8.37 31.63 3 25 3z"
      />
      {/* Bell dome shine */}
      <path
        fill="rgba(255,255,255,0.25)"
        d="M25 5C19.48 5 15 9.48 15 15v1.26A13.95 13.95 0 0 1 25 13c3.54 0 6.77 1.32 9.24 3.49C34.58 16.23 35 15.63 35 15c0-5.52-4.48-10-10-10z"
      />
      {/* Bell clapper */}
      <ellipse fill={color} cx="25" cy="40" rx="5" ry="5" />
      {/* Clapper highlight */}
      <ellipse fill="rgba(255,255,255,0.2)" cx="23" cy="38.5" rx="2" ry="1.5" />
      {/* Bell base/rim */}
      <rect fill={color} x="5" y="37" width="40" height="4" rx="2" />
      {/* Bell handle/hanger */}
      <path
        fill={color}
        d="M22 3c0-1.66 1.34-3 3-3s3 1.34 3 3"
        stroke={color}
        strokeWidth="1"
      />
    </svg>
  )
}
