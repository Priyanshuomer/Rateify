import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Pencil, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RatingSummary, StarRating } from "@/components/common/StarRating";
import { UserAvatar } from "@/components/common/misc";
import { cn } from "@/lib/utils";
import type { Store } from "@/types/api";
import { RatingDialog } from "./RatingDialog";

export function StoreCard({ store, view, index }: { store: Store; view: "grid" | "list"; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className={cn(
        "group flex rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift",
        view === "grid" ? "flex-col" : "flex-col gap-4 sm:flex-row sm:items-center",
      )}
    >
      <Link to="/stores/$id" params={{ id: store.id }} className="flex min-w-0 flex-1 items-start gap-4">
        <UserAvatar name={store.name} src={store.logoUrl} className="h-14 w-14 rounded-2xl [&>*]:rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold group-hover:text-primary">{store.name}</h3>
            {store.category && <Badge variant="secondary" className="rounded-full">{store.category}</Badge>}
          </div>
          {store.address && (
            <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{store.address}</span>
            </p>
          )}
          <div className="mt-3">
            <RatingSummary rating={store.rating} count={store.ratingCount} size="sm" />
          </div>
        </div>
      </Link>
      <div className={cn("flex items-center justify-between gap-3", view === "grid" ? "mt-5 border-t pt-4" : "sm:flex-col sm:items-end")}>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Your rating</p>
          {store.myRating ? <StarRating value={store.myRating.value} size="sm" /> : <p className="text-muted-foreground">Not rated yet</p>}
        </div>
        {store.myRating ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit rating
          </Button>
        ) : (
          <Button size="sm" variant="hero" onClick={() => setOpen(true)}>
            <Star className="mr-1.5 h-3.5 w-3.5" /> Rate
          </Button>
        )}
      </div>
      <RatingDialog open={open} onOpenChange={setOpen} storeId={store.id} storeName={store.name} existing={store.myRating} />
    </motion.article>
  );
}
