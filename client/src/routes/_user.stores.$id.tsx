import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Pencil, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PageFade, UserAvatar } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";
import { RatingDialog } from "@/components/stores/RatingDialog";
import { storesApi } from "@/api/endpoints";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_user/stores/$id")({
  head: () => ({
    meta: [
      { title: "Store details — Rateify" },
      { name: "description", content: "See a store's overall rating and share your own." },
      { property: "og:title", content: "Store details — Rateify" },
      { property: "og:description", content: "See a store's overall rating and share your own." },
    ],
  }),
  component: StoreDetail,
});

function StoreDetail() {
  const { id } = Route.useParams();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["stores", "detail", id], queryFn: () => storesApi.get(id) });

  return (
    <PageFade>
      <Link to="/stores" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All stores
      </Link>
      {q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <Skeleton className="h-80 rounded-3xl" />
      ) : (
        (() => {
          const s = q.data;
          const place = s.address || s.city;
          return (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
                <div className="h-44 bg-gradient-brand sm:h-56">
                  {s.bannerUrl && <img src={s.bannerUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
                  <UserAvatar name={s.name} src={s.logoUrl} className="-mt-16 h-24 w-24 rounded-2xl border-4 border-card [&>*]:rounded-2xl" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight">{s.name}</h1>
                      {s.category && <Badge variant="secondary" className="rounded-full">{s.category}</Badge>}
                    </div>
                    {place && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" /> {place}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border bg-card p-6 shadow-soft lg:col-span-2">
                  <h2 className="font-semibold">About</h2>
                  <p className="mt-2 whitespace-pre-line text-muted-foreground">{s.description || "No description yet."}</p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-card p-6 text-center shadow-soft">
                    <p className="text-sm text-muted-foreground">Overall rating</p>
                    <p className="mt-1 text-5xl font-bold tabular-nums">{s.rating > 0 ? s.rating.toFixed(1) : "—"}</p>
                    <StarRating value={s.rating} size="lg" className="mt-2" />
                    <p className="mt-1 text-sm text-muted-foreground">{s.ratingCount} rating{s.ratingCount === 1 ? "" : "s"}</p>
                  </div>
                  <div className="rounded-2xl border bg-card p-6 shadow-soft">
                    <p className="text-sm text-muted-foreground">Your rating</p>
                    {s.myRating ? (
                      <>
                        <StarRating value={s.myRating.value} size="lg" className="mt-2" />
                        {s.myRating.comment && <p className="mt-2 text-sm italic text-muted-foreground">"{s.myRating.comment}"</p>}
                        <Button variant="outline" className="mt-4 w-full" onClick={() => setOpen(true)}>
                          <Pencil className="h-4 w-4" /> Edit rating
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="mt-1">You haven't rated this store yet.</p>
                        <Button variant="hero" className="mt-4 w-full" onClick={() => setOpen(true)}>
                          <Star className="h-4 w-4" /> Rate this store
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <RatingDialog open={open} onOpenChange={setOpen} storeId={s.id} storeName={s.name} existing={s.myRating} />
            </div>
          );
        })()
      )}
    </PageFade>
  );
}