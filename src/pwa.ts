import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

// Registers the service worker and surfaces its lifecycle through the app's
// existing sonner toasts. In 'prompt' mode a freshly-deployed build waits behind
// a "Reload" toast rather than swapping assets mid-session (someone may be
// mid-markup). No-ops outside a secure context (plain-HTTP LAN): browsers only
// register service workers over HTTPS or on localhost.
export function registerPWA() {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast("A new version is available.", {
        duration: Infinity,
        action: { label: "Reload", onClick: () => updateSW(true) },
      });
    },
    onOfflineReady() {
      toast.success("Ready to work offline.");
    },
  });
}
