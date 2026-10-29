import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Pagination, nextSort, type Column } from "@/components/common/DataTable";
import { EmptyState, PageFade, PageHeader, UserAvatar } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";
import { RatingDialog } from "@/components/stores/RatingDialog";
import { storesApi } from "@/api/endpoints";
import { useUrlState } from "@/hooks/useUrlState";
import { errorMessage } from "@/lib/errors";
import type { MyRatingItem } from "@/types/api";

export const Route = createFileRoute("/_user/my-ratings")({
  head: () => ({
    meta: [
      { title: "My ratings — Rateify" },
      { name: "description", content: "Review and edit every rating you've submitted." },
      { property: "og:title", content: "My ratings — Rateify" },
      { property: "og:description", content: "Review and edit every rating you've submitted." },
    ],
  }),
  component: MyRatings,
});

const DEFAULTS = { sortBy: "date", order: "desc", page: 1, limit: 10 };

function MyRatings() {
  const [s, set] = useUrlState(DEFAULTS);
  const [editing, setEditing] = useState<MyRatingItem | null>(null);
  const params = { sortBy: s.sortBy, order: s.order as "asc" | "desc", page: s.page, limit: s.limit };
  const q = useQuery({ queryKey: ["ratings", "me", params], queryFn: () => storesApi.myRatings(params), placeholderData: keepPreviousData });

  const cols: Column<MyRatingItem>[] = [
    {
      key: "store",
      header: "Store",
      sortKey: "storeName",
      hideMobile: true,
      cell: (r) => (
        <Link to="/stores/$id" params={{ id: r.store.id }} className="flex items-center gap-3 font-medium hover:text-primary">
          <UserAvatar name={r.store.name} src={r.store.logoUrl} className="rounded-xl [&>*]:rounded-xl" />
          {r.store.name}
        </Link>
      ),
    },
    { key: "value", header: "Your rating", sortKey: "rating", cell: (r) => <StarRating value={r.value} size="sm" /> },
    {
      key: "overall",
      header: "Overall",
      cell: (r) => (
        <span className="text-muted-foreground">
          {r.store.averageRating.toFixed(1)} · {r.store.ratingCount}
        </span>
      ),
    },
    { key: "comment", header: "Comment", className: "max-w-xs", cell: (r) => <span className="line-clamp-2 text-muted-foreground">{r.comment || "—"}</span> },
    { key: "date", header: "Updated", sortKey: "date", cell: (r) => <span className="text-muted-foreground">{formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}</span> },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
      ),
    },
  ];

  return (
    <PageFade>
      <PageHeader title="My ratings" description="Every store you've rated, in one place." />
      <DataTable
        columns={cols}
        rows={q.data?.data}
        loading={q.isFetching}
        error={q.isError ? errorMessage(q.error) : null}
        onRetry={() => q.refetch()}
        sortBy={s.sortBy}
        order={s.order as "asc" | "desc"}
        onSort={(k) => set(nextSort({ sortBy: s.sortBy, order: s.order as "asc" | "desc" }, k))}
        mobileTitle={(r) => <p className="font-semibold">{r.store.name}</p>}
        empty={
          <EmptyState
            icon={<Star className="h-6 w-6" />}
            title="No ratings yet"
            description="Rate a store and it'll show up here."
            action={<Button variant="hero" asChild><Link to="/stores">Browse stores</Link></Button>}
          />
        }
      />
      <Pagination meta={q.data?.meta} onPage={(p) => set({ page: p })} onLimit={(l) => set({ limit: l })} />
      {editing && (
        <RatingDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          storeId={editing.store.id}
          storeName={editing.store.name}
          existing={{ id: editing.id, value: editing.value, comment: editing.comment }}
        />
      )}
    </PageFade>
  );
}
