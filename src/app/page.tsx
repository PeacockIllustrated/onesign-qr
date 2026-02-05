import Link from 'next/link';
import { ArrowRight, QrCode, Link2, BarChart3, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            <span className="font-semibold">onesign qr</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              log in
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            qr codes that never break
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Generate print-ready QR codes with managed links. Update destinations
            anytime without reprinting. Built for signs, menus, and marketing materials.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              create your first qr
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-4 py-24">
            <h2 className="text-2xl font-bold text-center mb-12">
              why choose managed qr codes
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<Link2 className="h-5 w-5" />}
                title="update anytime"
                description="Change where your QR points without reprinting. Perfect for campaigns and seasonal content."
              />
              <FeatureCard
                icon={<QrCode className="h-5 w-5" />}
                title="print ready"
                description="Export as SVG, PNG, or PDF. Multiple sizes with proper quiet zones for reliable scanning."
              />
              <FeatureCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="scan analytics"
                description="Track scans with privacy-first analytics. See when and where your codes are scanned."
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="built to last"
                description="Your QR codes use our stable domain. No third-party dependencies that could break."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-24 text-center">
            <h2 className="text-2xl font-bold mb-4">
              ready to create qr codes that last?
            </h2>
            <p className="text-muted-foreground mb-8">
              Sign up free and start generating QR codes in seconds.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>onesign & digital</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for durability. QR codes that work years from now.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border border-border p-6 rounded-sm">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-sm bg-muted mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
