"use client";

import { useState } from "react";

interface PlaceholderImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackText?: string;
  fallbackClassName?: string;
}

export default function PlaceholderImage({
  src,
  alt,
  width,
  height,
  className = "",
  fallbackText,
  fallbackClassName = "",
}: PlaceholderImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`img-fallback ${fallbackClassName} ${className}`}
        style={{ width: width ?? "auto", height: height ?? "auto" }}
        role="img"
        aria-label={alt}
      >
        {fallbackText || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
