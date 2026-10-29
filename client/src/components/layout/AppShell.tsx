import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  Store,
  Sun,
  User as UserIcon,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Logo, RoleBadge, UserAvatar } from "@/components/common/misc";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/api";

type NavTo =
  | "/admin/dashboard"
  | "/admin/users"
  | "/admin/stores"
  | "/owner/dashboard"
  | "/owner/ratings"
  | "/stores"
  | "/my-ratings"
  | "/profile";

type NavItem = { to: NavTo; label: string; icon: ReactNode };

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { to: "/admin/stores", label: "Stores", icon: <Store className="h-4 w-4" /> },
    { to: "/profile", label: "Profile", icon: <UserIcon className="h-4 w-4" /> },
  ],
  OWNER: [
    { to: "/owner/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/owner/ratings", label: "Ratings", icon: <Star className="h-4 w-4" /> },
    { to: "/profile", label: "Profile", icon: <UserIcon className="h-4 w-4" /> },
  ],
  USER: [
    { to: "/stores", label: "Stores", icon: <Store className="h-4 w-4" /> },
    { to: "/my-ratings", label: "My ratings", icon: <Star className="h-4 w-4" /> },
    { to: "/profile", label: "Profile", icon: <UserIcon className="h-4 w-4" /> },
  ],
};

function NavLinks({ items, collapsed, onClick }: { items: NavItem[]; collapsed?: boolean; onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0",
          )}
          activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground" }}
          title={collapsed ? i.label : undefined}
        >
          {i.icon}
          {!collapsed && i.label}
        </Link>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function UserMenu() {
  const { user, completion, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const pct = completion?.percentage ?? 100;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
        <UserAvatar name={user.fullName} src={user.profilePictureUrl} />
        {pct < 100 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-warning" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.fullName} src={user.profilePictureUrl} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="mt-2"><RoleBadge role={user.role} /></div>
          {pct < 100 && (
            <Link to="/profile" className="mt-3 block rounded-lg bg-muted p-2">
              <div className="mb-1.5 flex justify-between text-xs">
                <span>Profile completion</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </Link>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
          <UserIcon className="mr-2 h-4 w-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/profile", search: { tab: "security" } as never })}>
          <KeyRound className="mr-2 h-4 w-4" /> Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={async () => {
            // The route guards redirect to /login as soon as the session is cleared
            await logout();
            toast.success("Signed out");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;
  const items = NAV[user.role];

  if (user.role === "USER") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b glass">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/stores"><Logo /></Link>
            <div className="ml-6 hidden md:block">
              <nav className="flex gap-1">
                {items.map((i) => (
                  <Link
                    key={i.to}
                    to={i.to}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    activeProps={{ className: "bg-secondary !text-secondary-foreground" }}
                  >
                    {i.icon}
                    {i.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} items={items} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar p-3 transition-[width] duration-200 md:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className={cn("mb-6 flex h-12 items-center px-2", collapsed && "justify-center px-0")}>
          {collapsed ? <Logo className="[&>span:last-child]:hidden" /> : <Logo />}
        </div>
        <NavLinks items={items} collapsed={collapsed} />
        <Button variant="ghost" size="sm" className="mt-auto" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="mr-2 h-4 w-4" /> Collapse</>}
        </Button>
      </aside>
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 glass sm:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            {user.role === "ADMIN" ? "Admin console" : "Owner workspace"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function MobileNav({ open, onOpenChange, items }: { open: boolean; onOpenChange: (o: boolean) => void; items: NavItem[] }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 bg-sidebar p-4">
        <SheetTitle className="mb-6"><Logo /></SheetTitle>
        <SheetDescription className="sr-only">Main navigation</SheetDescription>
        <NavLinks items={items} onClick={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}