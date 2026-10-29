import { useState, type KeyboardEvent } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = { sm: "h-3.5 w-3.5", md: "h-4.5 w-4.5", lg: "h-6 w-6", xl: "h-10 w-10" };

/** Read-only stars, supports fractional (half/partial) display. */
export function StarRating({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const v = Math.max(0, Math.min(5, value || 0));
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${v.toFixed(1)} out of 5`} role="img">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        const pct = fill >= 0.75 ? 100 : fill >= 0.25 ? 50 : 0;
        return (
          <span key={i} className={cn("relative inline-block", sizes[size])}>
            <Star className={cn("absolute inset-0 fill-star-empty text-star-empty", sizes[size])} strokeWidth={1.5} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
              <Star className={cn("fill-star text-star", sizes[size])} strokeWidth={1.5} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Interactive 1–5 star input with hover preview + keyboard support. */
export function StarInput({
  value,
  onChange,
  size = "xl",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: keyof typeof sizes;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const labels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    }
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Rating"
        tabIndex={0}
        onKeyDown={onKey}
        className="flex gap-1 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            tabIndex={-1}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="transition-transform duration-150 hover:scale-115 active:scale-95"
          >
            <Star
              className={cn(
                sizes[size],
                "transition-colors",
                n <= shown ? "fill-star text-star" : "fill-star-empty text-star-empty",
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <span className="h-5 text-sm font-medium text-muted-foreground">{labels[shown] ?? ""}</span>
    </div>
  );
}

export function RatingSummary({ rating, count, size = "md" }: { rating: number; count: number; size?: keyof typeof sizes }) {
  return (
    <div className="flex items-center gap-2">
      <StarRating value={rating} size={size} />
      <span className="font-semibold tabular-nums">{rating > 0 ? rating.toFixed(1) : "—"}</span>
      <span className="text-sm text-muted-foreground">
        ({count} rating{count === 1 ? "" : "s"})
      </span>
    </div>
  );
}
