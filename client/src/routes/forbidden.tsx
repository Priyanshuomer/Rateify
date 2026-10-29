import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenView } from "@/components/layout/Guard";

export const Route = createFileRoute("/forbidden")({
  head: () => ({
    meta: [
      { title: "Not allowed — Rateify" },
      { name: "description", content: "You don't have access to this page." },
      { property: "og:title", content: "Not allowed — Rateify" },
      { property: "og:description", content: "You don't have access to this page." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForbiddenView,
});
