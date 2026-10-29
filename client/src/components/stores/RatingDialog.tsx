import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarInput } from "@/components/common/StarRating";
import { CharCount } from "@/components/common/misc";
import { LoadingButton } from "@/components/common/forms";
import { storesApi } from "@/api/endpoints";
import { ApiError } from "@/api/client";
import { handleApiError } from "@/lib/errors";
import type { MyRating, Paginated, RatingResult, Store } from "@/types/api";

export function RatingDialog({
  open,
  onOpenChange,
  storeId,
  storeName,
  existing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  storeId: string;
  storeName: string;
  existing: MyRating | null;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState(existing?.value ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  useEffect(() => {
    if (open) {
      setValue(existing?.value ?? 0);
      setComment(existing?.comment ?? "");
    }
  }, [open, existing]);

  const unchanged = !!existing && value === existing.value && comment.trim() === (existing.comment ?? "");

  const m = useMutation({
    mutationFn: () => {
      const body = { value, ...(comment.trim() ? { comment: comment.trim() } : {}) };
      return existing ? storesApi.updateRating(storeId, body) : storesApi.rate(storeId, body);
    },
    onSuccess: (r: RatingResult) => {
      const patch = (s: Store): Store =>
        s.id === storeId
          ? { ...s, rating: r.store.rating, ratingCount: r.store.ratingCount, myRating: { id: r.id, value: r.value, comment: r.comment } }
          : s;
      qc.setQueriesData<Paginated<Store>>({ queryKey: ["stores", "list"] }, (old) =>
        old ? { ...old, data: old.data.map(patch) } : old,
      );
      qc.setQueryData<Store>(["stores", "detail", storeId], (old) => (old ? patch(old) : old));
      qc.invalidateQueries({ queryKey: ["ratings", "me"] });
      qc.invalidateQueries({ queryKey: ["owner"] });
      toast.success(existing ? "Rating updated" : "Thanks for rating!", { description: storeName });
      onOpenChange(false);
    },
    onError: (e) => {
      // Out of sync (e.g. rated from another tab): reload the store data so the dialog switches mode
      if (e instanceof ApiError && (e.code === "RATING_EXISTS" || e.code === "RATING_NOT_FOUND")) {
        qc.invalidateQueries({ queryKey: ["stores"] });
        toast.info(
          e.code === "RATING_EXISTS"
            ? "You've already rated this store. We loaded your rating so you can edit it."
            : "You haven't rated this store yet. Please submit a new rating.",
        );
        onOpenChange(false);
        return;
      }
      handleApiError(e);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your rating" : "Rate this store"}</DialogTitle>
          <DialogDescription>{storeName}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <StarInput value={value} onChange={setValue} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="comment">Comment (optional)</Label>
            <CharCount value={comment.length} max={500} />
          </div>
          <Textarea id="comment" rows={4} value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} placeholder="What stood out?" />
        </div>
        <LoadingButton variant="hero" className="w-full" disabled={value < 1 || unchanged} loading={m.isPending} onClick={() => m.mutate()}>
          {existing ? "Update rating" : "Submit rating"}
        </LoadingButton>
      </DialogContent>
    </Dialog>
  );
}