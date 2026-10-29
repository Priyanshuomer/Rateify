import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Pagination, nextSort, type Column } from "@/components/common/DataTable";
import { FilterInput } from "@/components/common/FilterInput";
import { EmptyState, PageFade, PageHeader, UserAvatar } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";
import { ownerApi } from "@/api/endpoints";
import { useUrlState } from "@/hooks/useUrlState";
import { errorMessage } from "@/lib/errors";
import type { OwnerRating } from "@/types/api";

export const Route = createFileRoute("/owner/ratings")({
  head: () => ({
    meta: [
      { title: "Customer ratings — Rateify" },
      { name: "description", content: "See every customer who rated your stores." },
      { property: "og:title", content: "Customer ratings — Rateify" },
      { property: "og:description", content: "See every customer who rated your stores." },
    ],
  }),
  component: OwnerRatings,
});

const DEFAULTS = { storeId: "", name: "", email: "", value: 0, sortBy: "date", order: "desc", page: 1, limit: 10 };

function OwnerRatings() {
  const [s, set, reset] = useUrlState(DEFAULTS);
  const stores = useQuery({ queryKey: ["owner", "stores"], queryFn: ownerApi.stores });
  const params = {
    storeId: s.storeId || undefined,
    name: s.name || undefined,
    email: s.email || undefined,
    value: s.value || undefined,
    sortBy: s.sortBy,
    order: s.order as "asc" | "desc",
    page: s.page,
    limit: s.limit,
  };
  const q = useQuery({ queryKey: ["owner", "ratings", params], queryFn: () => ownerApi.ratings(params), placeholderData: keepPreviousData });
  const hasFilters = !!(s.storeId || s.name || s.email || s.value);

  const cols: Column<OwnerRating>[] = [
    {
      key: "user", header: "User", sortKey: "name", hideMobile: true,
      cell: (r) => <div className="flex items-center gap-3"><UserAvatar name={r.user.fullName} src={r.user.profilePictureUrl} /><span className="font-medium">{r.user.fullName}</span></div>,
    },
    { key: "email", header: "Email", sortKey: "email", cell: (r) => <span className="text-muted-foreground">{r.user.email}</span> },
    { key: "rating", header: "Rating", sortKey: "rating", cell: (r) => <StarRating value={r.value} size="sm" /> },
    { key: "store", header: "Store", cell: (r) => r.store.name },
    { key: "comment", header: "Comment", className: "max-w-xs", cell: (r) => <span className="line-clamp-2 text-muted-foreground">{r.comment || "—"}</span> },
    { key: "date", header: "Date", sortKey: "date", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{format(new Date(r.updatedAt), "d MMM yyyy")}</span> },
  ];

  return (
    <PageFade>
      <PageHeader title="Customers who rated your store" description="Filter and sort every rating you've received." />
      <div className="mb-4 flex flex-col flex-wrap gap-2 sm:flex-row">
        <FilterInput value={s.name} onChange={(v) => set({ name: v })} placeholder="Name" />
        <FilterInput value={s.email} onChange={(v) => set({ email: v })} placeholder="Email" />
        <Select value={String(s.value)} onValueChange={(v) => set({ value: Number(v) })}>
          <SelectTrigger className="h-9 w-full sm:w-36" aria-label="Star value"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any stars</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? "s" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        {(stores.data?.length ?? 0) > 1 && (
          <Select value={s.storeId || "all"} onValueChange={(v) => set({ storeId: v === "all" ? "" : v })}>
            <SelectTrigger className="h-9 w-full sm:w-48" aria-label="Store"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stores</SelectItem>
              {stores.data!.map((st) => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {hasFilters && <Button variant="ghost" size="sm" className="h-9" onClick={reset}>Clear filters</Button>}
      </div>
      <DataTable
        columns={cols}
        rows={q.data?.data}
        loading={q.isFetching}
        error={q.isError ? errorMessage(q.error) : null}
        onRetry={() => q.refetch()}
        sortBy={s.sortBy}
        order={s.order as "asc" | "desc"}
        onSort={(k) => set(nextSort({ sortBy: s.sortBy, order: s.order as "asc" | "desc" }, k))}
        mobileTitle={(r) => <div className="flex items-center gap-3"><UserAvatar name={r.user.fullName} src={r.user.profilePictureUrl} /><span className="font-semibold">{r.user.fullName}</span></div>}
        empty={<EmptyState title={hasFilters ? "No ratings match these filters" : "No ratings yet"} action={hasFilters && <Button variant="outline" onClick={reset}>Clear filters</Button>} />}
      />
      <Pagination meta={q.data?.meta} onPage={(p) => set({ page: p })} onLimit={(l) => set({ limit: l })} />
    </PageFade>
  );
}
