import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Logout: end the active session but PRESERVE the onboarding snapshot
    // (`oneverge_onboarding_state` + `oneverge_last_step`) so that when the
    // same user logs back in, Login.tsx can resume from where they left off.
    //
    // We only clear the active-session keys here. The landing page (Index)
    // treats the absence of `oneverge_session` / `oneverge_user` as "logged
    // out" and renders step 1 by default — the saved snapshot is only
    // re-applied after a successful login.
    try {
      localStorage.removeItem("oneverge_session");
      localStorage.removeItem("oneverge_user");
    } catch {
      // ignore storage errors — fallthrough to redirect
    }

    // Force a full reload to "/" so any in-memory React state in Index
    // (e.g. userData.id, current step) is cleared and the header re-evaluates.
    window.location.replace("/");
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <p className="text-sm text-gray-400">Signing out...</p>
    </div>
  );
};

export default Logout;
