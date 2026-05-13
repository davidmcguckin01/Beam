"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

interface BrandIconProps {
  src?: string | null;
  label?: string | null;
  size?: number;
  className?: string;
  roundedClassName?: string;
  borderClassName?: string;
}

export function BrandIcon({
  src,
  label,
  size = 40,
  className = "",
  roundedClassName = "rounded-lg",
  borderClassName = "border border-gray-200",
}: BrandIconProps) {
  const [loadErrored, setLoadErrored] = useState(false);
  const dimensionStyle = useMemo(() => ({ width: size, height: size }), [size]);
  const fallbackInitial = useMemo(() => {
    const source = label?.trim();
    if (!source) return "?";
    return source.charAt(0).toUpperCase();
  }, [label]);

  if (!src || loadErrored) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-600 font-semibold uppercase ${roundedClassName} ${borderClassName} ${className}`.trim()}
        style={{
          ...dimensionStyle,
          fontSize: Math.max(10, Math.round(size / 2.4)),
        }}
        aria-hidden={false}
      >
        {fallbackInitial}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={label || "Brand icon"}
      width={size}
      height={size}
      style={dimensionStyle}
      className={`${roundedClassName} ${borderClassName} bg-white object-contain ${className}`.trim()}
      onError={() => setLoadErrored(true)}
    />
  );
}

