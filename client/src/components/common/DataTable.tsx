import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZES } from "@/lib/constants";
import type { Meta } from "@/types/api";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState } from "./misc";

export interface Column<T> {
  key: string;
  header: string;
  sortKey?: string;
  className?: string;
  cell: (row: T) => ReactNode;
  /** hide from mobile stacked card */
  hideMobile?: boolean;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  sortBy,
  order,
  onSort,
  empty,
  mobileTitle,
}: {
  columns: Column<T>[];
  rows?: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  sortBy?: string;
  order?: "asc" | "desc";
  onSort?: (key: string) => void;
  empty?: ReactNode;
  mobileTitle?: (row: T) => ReactNode;
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  const showSkeleton = !rows;
  if (rows && rows.length === 0) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;

  const sortable = columns.filter((c) => c.sortKey);

  return (
    <>
      {/* Mobile sort control (the desktop header isn't visible on small screens) */}
      {onSort && sortable.length > 0 && (
        <div className="mb-3 flex items-center gap-2 md:hidden">
          <Select value={sortBy} onValueChange={(v) => onSort(v)}>
            <SelectTrigger className="h-9 flex-1" aria-label="Sort by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortable.map((c) => (
                <SelectItem key={c.sortKey} value={c.sortKey!}>
                  {c.header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => sortBy && onSort(sortBy)}
            aria-label={order === "asc" ? "Ascending, switch to descending" : "Descending, switch to ascending"}
          >
            {order === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card shadow-soft md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    c.sortKey && sortBy === c.sortKey ? (order === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn("px-4 py-3 text-left font-medium text-muted-foreground", c.className)}
                >
                  {c.sortKey && onSort ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => onSort(c.sortKey!)}
                      aria-label={`Sort by ${c.header}`}
                    >
                      {c.header}
                      {sortBy === c.sortKey ? (
                        order === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn(loading && rows && "opacity-60 transition-opacity")}>
            {showSkeleton
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5">
                        <Skeleton className="h-4 w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows!.map((r) => (
                  <tr key={r.id} className="border-t transition-colors hover:bg-muted/40">
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3", c.className)}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className={cn("space-y-3 md:hidden", loading && rows && "opacity-60 transition-opacity")}>
        {showSkeleton
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : rows!.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                {mobileTitle && <div className="mb-3">{mobileTitle(r)}</div>}
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  {columns
                    .filter((c) => !c.hideMobile)
                    .map((c) => (
                      <div key={c.key} className="contents">
                        <dt className="text-muted-foreground">{c.header}</dt>
                        <dd className="min-w-0 truncate">{c.cell(r)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
      </div>
    </>
  );
}

export function Pagination({
  meta,
  onPage,
  onLimit,
}: {
  meta?: Meta;
  onPage: (p: number) => void;
  onLimit: (l: number) => void;
}) {
  if (!meta) return null;
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
      <p className="text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{meta.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Rows</span>
        <Select value={String(meta.limit)} onValueChange={(v) => onLimit(Number(v))}>
          <SelectTrigger className="h-8 w-[72px]" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!meta.hasPrev} onClick={() => onPage(meta.page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="tabular-nums">
          {meta.page} / {Math.max(1, meta.totalPages)}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Toggle helper: same key flips order, new key starts asc. */
export function nextSort(current: { sortBy?: string; order?: "asc" | "desc" }, key: string) {
  if (current.sortBy === key) return { sortBy: key, order: current.order === "asc" ? ("desc" as const) : ("asc" as const) };
  return { sortBy: key, order: "asc" as const };
}