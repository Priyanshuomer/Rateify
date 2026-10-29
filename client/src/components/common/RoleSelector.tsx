import { ShieldCheck, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/api";

const OPTIONS: { value: Role; label: string; icon: React.ReactNode }[] = [
  { value: "USER", label: "User", icon: <User className="h-5 w-5" /> },
  { value: "OWNER", label: "Store owner", icon: <Store className="h-5 w-5" /> },
  { value: "ADMIN", label: "Admin", icon: <ShieldCheck className="h-5 w-5" /> },
];

/** 3-way role picker used on the login and signup pages. */
export function RoleSelector({
  value,
  onChange,
  label = "I am a",
}: {
  value: Role;
  onChange: (r: Role) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium leading-none">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}