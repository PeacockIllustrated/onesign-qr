'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { forgotPasswordSchema } from '@/validations/auth';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  OneSignIcon,
} from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const supabase = createClient();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Validate form
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || 'Invalid input';
      setMessage({ type: 'error', text: firstError });
      setIsLoading(false);
      return;
    }

    try {
      await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });

      // Always show success to prevent user enumeration
      setIsSubmitted(true);
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  // Success state — show confirmation
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Link
          href="/"
          className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          back to home
        </Link>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
                <Mail className="h-6 w-6" />
              </div>
            </div>
            <CardTitle>check your email</CardTitle>
            <CardDescription>
              If an account exists for {email}, we've sent a password reset
              link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login" className="block">
              <Button variant="outline" className="w-full">
                back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        back to home
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <OneSignIcon size={48} variant="on-dark" />
          </div>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-lynx-500/10 text-lynx-400 border border-lynx-400/30'
                    : 'bg-destructive/15 text-destructive border border-destructive/30'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'sending...' : 'send reset link'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link
              href="/auth/login"
              className="text-primary hover:underline"
            >
              back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
