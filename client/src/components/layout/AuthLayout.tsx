import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Logo } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-brand p-10 text-primary-foreground lg:flex lg:flex-col">
        <Logo light />
        <div className="relative z-10 my-auto max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Honest ratings for the stores you love.
          </h2>
          <p className="mt-4 text-primary-foreground/75">
            Discover great local shops, share your experience, and help owners do better — one star at a time.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute right-10 top-1/4 w-64 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur-xl"
        >
          <p className="text-sm font-semibold">Corner Street Bakery</p>
          <div className="mt-2 flex items-center gap-2">
            <StarRating value={4.5} size="sm" />
            <span className="text-sm font-semibold">4.5</span>
          </div>
          <p className="mt-2 text-xs text-primary-foreground/70">"Fresh bread every morning, lovely staff."</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="absolute bottom-24 right-24 flex items-center gap-3 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 backdrop-blur-xl"
        >
          <Star className="h-5 w-5 fill-star text-star" />
          <span className="text-sm font-medium">12,480 ratings this month</span>
        </motion.div>
        <p className="relative z-10 text-xs text-primary-foreground/60">© {new Date().getFullYear()} Rateify</p>
      </aside>
      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>
      </main>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}
