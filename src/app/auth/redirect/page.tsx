"use client";

import { useAuthCallback } from "@tidecloak/nextjs";
import { useEffect, useState } from "react";

// Separate component so useAuthCallback only runs after hydration (avoids SSR window error).
function RedirectHandler() {
  const { isProcessing, isSuccess, error } = useAuthCallback({
    onSuccess: (returnUrl) => window.location.assign(returnUrl || "/tide"),
    onError: () => window.location.assign("/tide"),
    onMissingVerifierRedirectTo: "/tide",
  });

  useEffect(() => {
    // Direct navigation without callback params: go back.
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code") && !params.has("error")) window.location.assign("/tide");
  }, []);

  if (error) return <p>Authentication failed: {error.message}</p>;
  if (isProcessing || !isSuccess) return <p>Completing login...</p>;
  return <p>Redirecting...</p>;
}

export default function AuthRedirectPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <p>Loading...</p>;
  return <RedirectHandler />;
}
