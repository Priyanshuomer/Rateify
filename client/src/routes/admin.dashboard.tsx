import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Store, UserPlus, Users } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PageFade, PageHeader, StatCard } from "@/components/common/misc";
import { adminApi } from "@/api/endpoints";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Rateify" },
      { name: "description", content: "Platform totals for users, stores and ratings." },
      { property: "og:title", content: "Admin dashboard — Rateify" },
      { property: "og:description", content: "Platform totals for users, stores and ratings." },
    ],
  }),
  component: AdminDashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

function AdminDashboard() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["admin", "dashboard"], queryFn: adminApi.dashboard });
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;

  const roles = q.data
    ? [
        { name: "Users", value: q.data.usersByRole.USER ?? 0 },
        { name: "Owners", value: q.data.usersByRole.OWNER ?? 0 },
        { name: "Admins", value: q.data.usersByRole.ADMIN ?? 0 },
      ]
    : [];

  return (
    <PageFade>
      <PageHeader
        title="Dashboard"
        description="A snapshot of the whole platform."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate({ to: "/admin/users", search: { create: 1 } as never })}>
              <UserPlus className="mr-2 h-4 w-4" /> Add user
            </Button>
            <Button variant="hero" onClick={() => navigate({ to: "/admin/stores", search: { create: 1 } as never })}>
              <Store className="mr-2 h-4 w-4" /> Add store
            </Button>
          </>
        }
      />
      {q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard index={0} label="Total users" value={q.data.totalUsers} icon={<Users className="h-4 w-4" />} />
          <StatCard index={1} label="Total stores" value={q.data.totalStores} icon={<Store className="h-4 w-4" />} />
          <StatCard index={2} label="Total ratings" value={q.data.totalRatings} icon={<MessageSquare className="h-4 w-4" />} />
        </div>
      )}
      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-soft">
        <h2 className="font-semibold">Users by role</h2>
        {q.isPending ? (
          <Skeleton className="mt-4 h-64 rounded-xl" />
        ) : (
          <div className="mt-2 flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-64 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roles} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="85%" paddingAngle={3} strokeWidth={0}>
                    {roles.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-3 sm:w-1/2">
              {roles.map((r, i) => (
                <li key={r.name} className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="flex-1 text-sm">{r.name}</span>
                  <span className="font-semibold tabular-nums">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageFade>
  );
}
