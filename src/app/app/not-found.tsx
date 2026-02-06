import Link from 'next/link';

export default function AppNotFound() {
  return (
    <div className="flex items-center justify-center p-8 min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-4xl font-bold">404</h2>
        <p className="text-sm text-muted-foreground">
          This QR code or page could not be found.
        </p>
        <Link
          href="/app"
          className="inline-block px-4 py-2 bg-foreground text-background rounded-sm text-sm hover:opacity-90 transition-opacity"
        >
          back to dashboard
        </Link>
      </div>
    </div>
  );
}
