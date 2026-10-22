// Server-only storage accessor. Never import from client components.
import type { StoragePort } from "@/contracts";
import { InMemoryEncryptedRecordStore } from "./memory-store";

const globalForStore = globalThis as typeof globalThis & { __stideStore?: StoragePort };

/** One store per server process (survives dev hot reload, not a restart). */
export function getStorage(): StoragePort {
  globalForStore.__stideStore ??= new InMemoryEncryptedRecordStore();
  return globalForStore.__stideStore;
}
