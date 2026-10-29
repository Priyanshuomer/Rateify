import type { ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/common/misc";
import type { Role } from "@/types/api";

export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === "loading") return <FullScreenLoader />;
  if (status === "anonymous" || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <ForbiddenView />;
  return <>{children}</>;
}

/** Redirects logged-in users away from /login, /signup. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === "authenticated" && user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <>{children}</>;
}

export function ForbiddenView() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldX className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight">403</h1>
        <h2 className="mt-2 text-xl font-semibold">Not allowed</h2>
        <p className="mt-2 text-muted-foreground">Your account doesn't have access to this page.</p>
        <Button variant="hero" className="mt-6" asChild>
          <Link to={user ? ROLE_HOME[user.role] : "/login"}>Take me home</Link>
        </Button>
      </div>
    </div>
  );
}
