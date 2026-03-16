import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-6xl font-semibold">404</h2>
        <p className="text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-foreground text-background rounded-sm text-sm hover:opacity-90 transition-opacity"
        >
          go home
        </Link>
      </div>
    </div>
  );
}
