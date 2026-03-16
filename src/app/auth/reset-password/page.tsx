'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema } from '@/validations/auth';
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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Validate form
    const parsed = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || 'Invalid input';
      setMessage({ type: 'error', text: firstError });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });

      if (error) {
        // Handle expired or missing recovery session
        if (
          error.message.toLowerCase().includes('session') ||
          error.message.toLowerCase().includes('token') ||
          error.message.toLowerCase().includes('auth')
        ) {
          setMessage({
            type: 'error',
            text: 'Your reset link may have expired. Please request a new one.',
          });
        } else {
          setMessage({ type: 'error', text: error.message });
        }
        return;
      }

      setMessage({
        type: 'success',
        text: 'Password updated successfully. Redirecting...',
      });

      // Short delay so the user sees the success message
      setTimeout(() => {
        router.push('/app');
        router.refresh();
      }, 1000);
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
          <CardTitle>Set new password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">new password</Label>
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
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {message.type === 'error' &&
                  message.text.includes('expired') && (
                    <Link
                      href="/auth/forgot-password"
                      className="block mt-2 text-primary hover:underline"
                    >
                      Request a new reset link
                    </Link>
                  )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'updating...' : 'update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
