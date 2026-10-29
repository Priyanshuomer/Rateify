import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";

/**
 * Shown on every page (except /profile) while the profile is under 50% complete or has no address.
 * Dismissing it hides it for the rest of the browser session.
 */
export function ProfileReminder() {
  const { user, completion, addresses } = useAuth();
  const [dismissed, setDismissed] = useState(true); // hidden until we've read sessionStorage (SSR-safe)
  const key = user ? `profileReminder:${user.id}` : "";

  useEffect(() => {
    if (key) setDismissed(sessionStorage.getItem(key) === "1");
  }, [key]);

  if (!user || !completion || dismissed) return null;

  const noAddress = addresses.length === 0;
  const low = completion.percentage < 50;
  if (!noAddress && !low) return null;

  const dismiss = () => {
    sessionStorage.setItem(key, "1");
    setDismissed(true);
  };

  return (
    <div role="status" className="mb-6 flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning-foreground">
        {noAddress ? <MapPin className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{noAddress ? "Add your address" : "Complete your profile"}</p>
        <p className="text-sm text-muted-foreground">
          {noAddress
            ? "You haven't added an address yet. Add one so your profile is complete."
            : `Your profile is only ${completion.percentage}% complete. Finish it to get the most out of the app.`}
        </p>
        <Progress value={completion.percentage} className="mt-2 h-1.5 max-w-xs" />
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="hero" size="sm">
          <Link to="/profile" search={(noAddress ? { tab: "address", add: 1 } : { tab: "personal" }) as never}>
            {noAddress ? "Add address" : "Complete profile"}
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismiss} aria-label="Dismiss reminder">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}