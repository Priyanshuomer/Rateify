import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Star, Store } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, PageFade, PageHeader, StatCard, UserAvatar } from "@/components/common/misc";
import { StarRating } from "@/components/common/StarRating";
import { ownerApi } from "@/api/endpoints";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/owner/dashboard")({
  head: () => ({
    meta: [
      { title: "Owner dashboard — Rateify" },
      { name: "description", content: "Track your stores' ratings and recent customer feedback." },
      { property: "og:title", content: "Owner dashboard — Rateify" },
      { property: "og:description", content: "Track your stores' ratings and recent customer feedback." },
    ],
  }),
  component: OwnerDashboard,
});

function OwnerDashboard() {
  const q = useQuery({ queryKey: ["owner", "dashboard"], queryFn: ownerApi.dashboard });
  const [storeId, setStoreId] = useState<string | null>(null);

  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (q.isPending)
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  const d = q.data;
  const store = d.stores.find((s) => s.id === storeId) ?? d.stores[0];
  const chart = store ? (["1", "2", "3", "4", "5"] as const).map((k) => ({ star: `${k}★`, count: store.ratingBreakdown?.[k] ?? 0 })) : [];

  return (
    <PageFade>
      <PageHeader title="Dashboard" description="How customers feel about your stores." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard index={0} label="Average rating" value={d.averageRating} decimals={1} icon={<Star className="h-4 w-4" />} footer={<StarRating value={d.averageRating} />} />
        <StatCard index={1} label="Total ratings" value={d.totalRatings} icon={<MessageSquare className="h-4 w-4" />} />
        <StatCard index={2} label="Your stores" value={d.totalStores} icon={<Store className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border bg-card p-6 shadow-soft lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Rating breakdown</h2>
            {d.stores.length > 1 && (
              <Select value={store?.id} onValueChange={setStoreId}>
                <SelectTrigger className="h-8 w-[200px]" aria-label="Select store"><SelectValue /></SelectTrigger>
                <SelectContent>{d.stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
          {store ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary-2)" />
                      <stop offset="100%" stopColor="var(--primary)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="star" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} />
                  <Bar dataKey="count" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No stores yet" description="An administrator needs to assign a store to you." />
          )}
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="mb-4 font-semibold">Recent ratings</h2>
          {d.recentRatings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ratings yet.</p>
          ) : (
            <ul className="space-y-4">
              {d.recentRatings.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <UserAvatar name={r.user.fullName} src={r.user.profilePictureUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.user.fullName}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating value={r.value} size="sm" />
                      <span className="truncate text-xs text-muted-foreground">{r.store.name}</span>
                    </div>
                    {r.comment && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageFade>
  );
}
