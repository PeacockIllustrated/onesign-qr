'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signInSchema } from '@/validations/auth';
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Handle redirect query params (from callback or signup)
  useEffect(() => {
    const error = searchParams.get('error');
    const msg = searchParams.get('message');

    if (error === 'auth') {
      setMessage({
        type: 'error',
        text: 'Authentication failed. Please try again.',
      });
    } else if (msg) {
      setMessage({ type: 'success', text: msg });
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Validate form
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || 'Invalid input';
      setMessage({ type: 'error', text: firstError });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        // Special-case: email not confirmed
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setMessage({
            type: 'error',
            text: 'Please check your email and confirm your account before signing in.',
          });
        } else {
          setMessage({ type: 'error', text: error.message });
        }
      } else {
        router.push('/app');
        router.refresh();
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

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
            <OneSignIcon size={40} />
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in with your email to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'signing in...' : 'sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            don't have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-primary hover:underline"
            >
              sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
