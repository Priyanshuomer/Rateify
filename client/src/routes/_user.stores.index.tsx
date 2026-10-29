import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownAZ, ArrowUpAZ, LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState, ErrorState, PageFade } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";
import { Pagination } from "@/components/common/DataTable";
import { StoreCard } from "@/components/stores/StoreCard";
import { storesApi } from "@/api/endpoints";
import { useUrlState } from "@/hooks/useUrlState";
import { useDebounce } from "@/hooks/useDebounce";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_user/stores/")({
  head: () => ({
    meta: [
      { title: "Browse stores — Rateify" },
      { name: "description", content: "Search stores by name or address and share your rating." },
      { property: "og:title", content: "Browse stores — Rateify" },
      { property: "og:description", content: "Search stores by name or address and share your rating." },
    ],
  }),
  component: StoresPage,
});

// limit 10 is one of the PAGE_SIZES options, so the page-size selector shows a value
const DEFAULTS = { search: "", minRating: 0, sortBy: "name", order: "asc", page: 1, limit: 10, view: "grid" };

function StoresPage() {
  const [s, set] = useUrlState(DEFAULTS);

  // Search box: local text, debounced into the URL, re-synced when the URL changes externally
  const [text, setText] = useState(s.search);
  const emitted = useRef(s.search);
  const debounced = useDebounce(text, 400);
  useEffect(() => {
    if (s.search !== emitted.current) {
      emitted.current = s.search;
      setText(s.search);
    }
  }, [s.search]);
  useEffect(() => {
    if (debounced !== emitted.current) {
      emitted.current = debounced;
      set({ search: debounced });
    }
  }, [debounced, set]);

  // Min-rating slider: local while dragging, URL only on release (avoids a request per tick)
  const [minLocal, setMinLocal] = useState(s.minRating);
  useEffect(() => setMinLocal(s.minRating), [s.minRating]);

  const params = {
    search: s.search || undefined,
    minRating: s.minRating || undefined,
    sortBy: s.sortBy,
    order: s.order as "asc" | "desc",
    page: s.page,
    limit: s.limit,
  };
  const q = useQuery({
    queryKey: ["stores", "list", params],
    queryFn: () => storesApi.list(params),
    placeholderData: keepPreviousData,
  });
  const hasFilters = !!(s.search || s.minRating);
  const clearFilters = () => {
    emitted.current = "";
    setText("");
    set({ search: "", minRating: 0 });
  };

  return (
    <PageFade>
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-brand px-6 py-10 text-primary-foreground sm:px-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find a store, share your take.</h1>
        <p className="mt-2 text-primary-foreground/75">Search by store name or address.</p>
        <div className="relative mt-6 max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search stores or addresses…"
            aria-label="Search stores"
            className="h-14 rounded-2xl border-0 bg-card pl-12 text-base text-foreground shadow-lift"
          />
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn(s.minRating > 0 && "border-primary text-primary")}>
              <SlidersHorizontal className="h-4 w-4" />
              {s.minRating > 0 ? `${s.minRating}+ stars` : "Min rating"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 rounded-2xl">
            <p className="mb-3 text-sm font-medium">Minimum rating</p>
            <div className="mb-3 flex items-center gap-2">
              <StarRating value={minLocal} />
              <span className="text-sm font-semibold">{minLocal.toFixed(1)}+</span>
            </div>
            <Slider
              min={0}
              max={5}
              step={0.5}
              value={[minLocal]}
              onValueChange={([v]) => setMinLocal(v)}
              onValueCommit={([v]) => set({ minRating: v })}
            />
          </PopoverContent>
        </Popover>
        <Select value={s.sortBy} onValueChange={(v) => set({ sortBy: v })}>
          <SelectTrigger className="h-8 w-[150px]" aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="ratingCount">Most rated</SelectItem>
            <SelectItem value="createdAt">Newest</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => set({ order: s.order === "asc" ? "desc" : "asc" })}
          aria-label={`Order ${s.order === "asc" ? "ascending" : "descending"}`}
        >
          {s.order === "asc" ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
        <ToggleGroup
          type="single"
          value={s.view}
          onValueChange={(v) => v && set({ view: v }, { keepPage: true })}
          className="ml-auto"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <div className={cn("grid gap-4", s.view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "")}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : q.data.data.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="No stores match your search"
          description="Try a different name or lower the minimum rating."
          action={hasFilters && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <>
          <div className={cn("grid gap-4 transition-opacity", s.view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "", q.isPlaceholderData && "opacity-60")}>
            {q.data.data.map((st, i) => <StoreCard key={st.id} store={st} view={s.view as "grid" | "list"} index={i} />)}
          </div>
          <Pagination meta={q.data.meta} onPage={(p) => set({ page: p })} onLimit={(l) => set({ limit: l })} />
        </>
      )}
    </PageFade>
  );
}