import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME } from "@/lib/constants";
import { FullScreenLoader } from "@/components/common/misc";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rateify — Rate and discover stores" },
      { name: "description", content: "Sign in to discover, rate and manage stores on Rateify." },
      { property: "og:title", content: "Rateify — Rate and discover stores" },
      { property: "og:description", content: "Sign in to discover, rate and manage stores on Rateify." },
    ],
  }),
  component: Index,
});

function Index() {
  const { status, user } = useAuth();
  if (status === "loading") return <FullScreenLoader />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Navigate to="/login" replace />;
}
