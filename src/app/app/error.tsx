'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-8 min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-bold">something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          An error occurred while loading this page.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-foreground text-background rounded-sm text-sm hover:opacity-90 transition-opacity"
          >
            try again
          </button>
          <Link
            href="/app"
            className="px-4 py-2 border rounded-sm text-sm hover:bg-muted transition-colors"
          >
            back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
