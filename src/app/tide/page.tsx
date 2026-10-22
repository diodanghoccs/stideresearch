"use client";

import { useEffect, useState } from "react";
import { useTideCloak } from "@tidecloak/nextjs";

// Trí's Tide diagnostics page (TRI-02 evidence): login/logout and the identity claims Tide issued.
// Shows no token, only claim names/values needed to check roles and tideuserkey presence.
const DEMO_ROLES = ["_tide_encryptor", "_tide_decryptor"];

function Diagnostics() {
  const tc = useTideCloak();

  if (tc.isInitializing) return <p>Initializing Tide...</p>;
  if (tc.initError) return <p role="alert">Tide init error: {tc.initError.message}</p>;

  if (!tc.authenticated) {
    return (
      <>
        <p>Not logged in.</p>
        <button type="button" onClick={() => tc.login()}>Login with Tide</button>
      </>
    );
  }

  const username = tc.getValueFromIdToken("preferred_username");
  const vuid = tc.getValueFromToken("vuid");
  const hasUserKey = Boolean(tc.getValueFromToken("tideuserkey"));
  const realmRoles: string[] = tc.getValueFromToken("realm_access")?.roles ?? [];
  const isAdmin = tc.hasClientRole("tide-realm-admin", "realm-management");

  return (
    <>
      <table>
        <tbody>
          <tr><th scope="row">preferred_username</th><td>{String(username ?? "—")}</td></tr>
          <tr><th scope="row">vuid</th><td>{vuid ? `${String(vuid).slice(0, 12)}…` : "—"}</td></tr>
          <tr><th scope="row">tideuserkey in token</th><td>{hasUserKey ? "yes" : "no"}</td></tr>
          <tr><th scope="row">tide-realm-admin</th><td>{isAdmin ? "yes" : "no"}</td></tr>
          {DEMO_ROLES.map((r) => (
            <tr key={r}><th scope="row">{r}</th><td>{realmRoles.includes(r) ? "yes" : "no"}</td></tr>
          ))}
          <tr><th scope="row">token expires</th><td>{tc.tokenExp ? new Date(tc.tokenExp * 1000).toLocaleTimeString() : "—"}</td></tr>
        </tbody>
      </table>
      <button type="button" onClick={() => tc.logout()}>Logout</button>
    </>
  );
}

export default function TidePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <main className="wrap">
      <h1>Tide diagnostics</h1>
      {mounted ? <Diagnostics /> : <p>Loading...</p>}
    </main>
  );
}
