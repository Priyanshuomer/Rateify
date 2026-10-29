import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

/** Text input that debounces (400ms) before reporting changes. Never loses keystrokes while typing. */
export function FilterInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  // The last value we reported (or received). Prevents the URL echo from overwriting newer typing.
  const emitted = useRef(value);
  const cb = useRef(onChange);
  cb.current = onChange;
  const debounced = useDebounce(text, 400);

  // External change (back button, "Clear filters") -> update the box
  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setText(value);
    }
  }, [value]);

  // Debounced typing -> report upward once
  useEffect(() => {
    if (debounced !== emitted.current) {
      emitted.current = debounced;
      cb.current(debounced);
    }
  }, [debounced]);

  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={className ?? "h-9 w-full sm:w-44"}
    />
  );
}