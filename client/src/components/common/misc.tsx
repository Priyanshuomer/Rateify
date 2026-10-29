import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, animate } from "framer-motion";
import { AlertTriangle, Inbox, RotateCw, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountStatus, Role, StoreStatus } from "@/types/api";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary shadow-glow">
        <Star className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
      </span>
      <span className={cn("text-lg", light && "text-primary-foreground")}>Rateify</span>
    </div>
  );
}

const avatarTones = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/20 text-warning-foreground",
  "bg-chart-5/15 text-chart-5",
];
export function initials(name?: string | null) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
export function UserAvatar({
  name,
  src,
  className,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
}) {
  const tone = avatarTones[(name ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % avatarTones.length];
  return (
    <Avatar className={cn("h-9 w-9", className)}>
      {src ? <AvatarImage src={src} alt={name ?? ""} className="object-cover" /> : null}
      <AvatarFallback className={cn("font-semibold", tone)}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

const roleStyle: Record<Role, string> = {
  ADMIN: "bg-primary/12 text-primary border-primary/20",
  OWNER: "bg-chart-2/12 text-chart-2 border-chart-2/25",
  USER: "bg-chart-3/12 text-chart-3 border-chart-3/25",
};
export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", roleStyle[role])}>
      {role === "USER" ? "User" : role === "OWNER" ? "Owner" : "Admin"}
    </Badge>
  );
}

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-success/12 text-success border-success/25",
  INACTIVE: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-warning/15 text-warning-foreground border-warning/30",
  SUSPENDED: "bg-destructive/10 text-destructive border-destructive/25",
  DELETED: "bg-destructive/10 text-destructive border-destructive/25",
};
export function StatusBadge({ status }: { status: AccountStatus | StoreStatus }) {
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium capitalize", statusStyle[status])}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {status.toLowerCase()}
    </Badge>
  );
}

export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 1.1, ease: "easeOut", onUpdate: setDisplay });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref}>{display.toFixed(decimals)}</span>;
}

export function StatCard({
  label,
  value,
  icon,
  decimals,
  footer,
  index = 0,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  decimals?: number;
  footer?: ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-primary opacity-10 blur-xl" />
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
        <CountUp value={value} decimals={decimals} />
      </p>
      {footer && <div className="mt-2">{footer}</div>}
    </motion.div>
  );
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`ring-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary-2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          stroke={`url(#ring-${size})`}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (Math.min(100, value) / 100) * c }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <h3 className="mt-3 font-semibold">Couldn't load this</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message ?? "Something went wrong."}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function FullScreenLoader({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <Logo />
        </motion.div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-primary"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function CharCount({ value, max, min }: { value: number; max: number; min?: number }) {
  const bad = value > max || (min !== undefined && value > 0 && value < min);
  return (
    <span className={cn("text-xs tabular-nums", bad ? "text-destructive" : "text-muted-foreground")}>
      {value}/{max}
    </span>
  );
}

export function PageFade({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  );
}
