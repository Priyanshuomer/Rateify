import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireRole } from "@/components/layout/Guard";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileReminder } from "@/components/common/ProfileReminder";

export const Route = createFileRoute("/_user")({
  component: Layout,
});

function Layout() {
  return (
    <RequireRole roles={["USER"]}>
      <AppShell>
        <ProfileReminder />
        <Outlet />
      </AppShell>
    </RequireRole>
  );
}