"use client";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  label?: string;
}

export default function StarRating({
  value,
  onChange,
  max = 5,
  size = "md",
  readOnly = false,
  label,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => !readOnly && onChange?.(starValue)}
            disabled={readOnly}
            className={`${sizeClasses[size]} transition-colors ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            } ${starValue <= value ? "text-star" : "text-star-empty"}`}
            aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
