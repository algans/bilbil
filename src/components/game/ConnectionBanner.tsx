"use client";

import { AnimatePresence, motion } from "framer-motion";

interface Props {
  /** "connecting" | "connected" | "error" */
  state: "connecting" | "connected" | "error";
  message?: string | null;
}

/**
 * Üst kısımda flash banner — socket disconnect / reconnect attempt durumlarını gösterir.
 * Bağlı durumdayken hiçbir şey render etmez.
 */
export function ConnectionBanner({ state, message }: Props) {
  const visible = state !== "connected";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`fixed top-0 right-0 left-0 z-50 px-4 py-2 text-center text-sm font-semibold text-white ${
            state === "error" ? "bg-rose-600" : "bg-amber-500"
          }`}
          role="status"
          aria-live="polite"
        >
          {state === "error" ? `⚠ ${message ?? "Bağlantı hatası"}` : "🔄 Bağlanıyor..."}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
