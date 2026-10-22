// Server-only storage accessors. Never import from client components.
import type { PolicyStorePort, StoragePort } from "@/contracts";
import { InMemoryEncryptedRecordStore } from "./memory-store";
import { InMemoryPolicyStore } from "./policy-store";

const globalForStore = globalThis as typeof globalThis & {
  __stideStore?: StoragePort;
  __stidePolicyStore?: PolicyStorePort;
};

/** One store per server process (survives dev hot reload, not a restart). */
export function getStorage(): StoragePort {
  globalForStore.__stideStore ??= new InMemoryEncryptedRecordStore();
  return globalForStore.__stideStore;
}

export function getPolicyStore(): PolicyStorePort {
  globalForStore.__stidePolicyStore ??= new InMemoryPolicyStore();
  return globalForStore.__stidePolicyStore;
}
