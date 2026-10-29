import { forwardRef, useRef, useState, type ReactNode } from "react";
import { Check, Eye, EyeOff, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { passwordRules } from "@/lib/validators";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  right,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor}>{label}</Label>
        {right}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function PasswordInput({ className, ...props }, ref) {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={show ? "text" : "password"} className={cn("pr-10", className)} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);

export function PasswordChecklist({ value }: { value: string }) {
  const passed = passwordRules.filter((r) => r.test(value)).length;
  const tone = ["bg-destructive", "bg-destructive", "bg-warning", "bg-success"][passed];
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full bg-muted transition-colors", i < passed && tone)} />
        ))}
      </div>
      <ul className="grid gap-1 text-xs sm:grid-cols-3">
        {passwordRules.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.key} className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}>
              {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function LoadingButton({ loading, children, disabled, ...p }: ButtonProps & { loading?: boolean }) {
  return (
    <Button disabled={loading || disabled} {...p}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) {
    toast.error("Only JPEG, PNG or WebP images are allowed.");
    return false;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error("Image must be 5 MB or smaller.");
    return false;
  }
  return true;
}

export function ImageUploader({
  onFile,
  loading,
  currentUrl,
  label = "Upload image",
}: {
  onFile: (f: File) => void;
  loading?: boolean;
  currentUrl?: string | null;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const src = preview ?? currentUrl;
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border bg-muted">
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-muted-foreground" />}
      </div>
      <div className="space-y-1">
        <LoadingButton type="button" variant="outline" size="sm" loading={loading} onClick={() => ref.current?.click()}>
          {label}
        </LoadingButton>
        <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · max 5 MB</p>
      </div>
      <input
        ref={ref}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f || !validateImage(f)) return;
          setPreview(URL.createObjectURL(f));
          onFile(f);
        }}
      />
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
