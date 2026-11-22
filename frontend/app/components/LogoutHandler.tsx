// client component to handle logout on page unload
"use client";

import { useEffect } from "react";

export default function LogoutHandler() {
  useEffect(() => {
    const handleUnload = async () => {
      try {
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (e) {
        console.error("Error al intentar cerrar sesión al unload", e);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return null;
}
