interface BlobMascotProps {
  side: "pro" | "con";
  size?: number;
  className?: string;
}

export function BlobMascot({ side, size = 120, className = "" }: BlobMascotProps) {
  const src = side === "pro" ? "/images/blob-pro.png" : "/images/blob-con.png";
  const alt = side === "pro" ? "Pro blob mascot" : "Con blob mascot";

  return (
    <img
      alt={alt}
      className={className}
      height={size}
      src={src}
      width={size}
    />
  );
}
