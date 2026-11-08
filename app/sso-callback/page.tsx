import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-50">
      <div className="text-center">
        <p className="text-lg font-black text-emerald-950">Finishing sign in…</p>
        <p className="mt-1 text-sm text-emerald-700">Taking you back to DEKUWEC.</p>
        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
