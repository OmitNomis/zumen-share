import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

// Promise-based replacement for window.confirm(), backed by one shared AlertDialog.
// Usage: const { confirm, dialog } = useConfirm(); ... if (!(await confirm("Delete this?"))) return;
// Render {dialog} once, anywhere in the owning component's JSX tree.
export function useConfirm() {
  const [message, setMessage] = useState<string | null>(null);
  const [danger, setDanger] = useState(false);
  const resolveRef = useRef<(ok: boolean) => void>(() => {});

  function confirm(msg: string, opts: { danger?: boolean } = {}) {
    setMessage(msg);
    setDanger(!!opts.danger);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }

  function settle(ok: boolean) {
    setMessage(null);
    resolveRef.current(ok);
  }

  const dialog = (
    <AlertDialog open={message !== null} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={danger ? "danger" : "default"} onClick={() => settle(true)}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
