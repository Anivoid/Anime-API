"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification link may have expired or already been used.",
    Default: "An error occurred during authentication.",
  };

  const message = errorMessages[error || ""] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-void-black flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-void-red/5 blur-3xl" />
      </div>

      <div className="max-w-md w-full text-center relative z-10">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-void-red/50 flex items-center justify-center animate-red-glow">
          <svg className="w-10 h-10 text-void-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-void-red text-lg mb-2">認証エラー</p>
        <h1 className="text-2xl font-bold text-white mb-4">Authentication Error</h1>
        <p className="text-gray-500 mb-8">{message}</p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/login" className="bg-void-red px-6 py-3 rounded-lg font-semibold text-white hover:bg-void-red-dark transition-all glow-red">
            Try Again
          </Link>
          <Link href="/" className="border border-void-gray px-6 py-3 rounded-lg font-semibold text-gray-300 hover:bg-void-dark transition-all">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void-black text-white flex items-center justify-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
