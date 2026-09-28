import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card } from '../../components/ui';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordScreen: React.FC = () => {
  const { navigateTo, requestPasswordReset } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await requestPasswordReset(email);
    setLoading(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.error || 'Failed to dispatch reset instructions.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        <button
          onClick={() => navigateTo('sign_in')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-emerald-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>

        <Card padding="lg">
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Reset Link Sent</h3>
              <p className="text-xs text-zinc-600">
                If an account exists for <span className="font-semibold text-zinc-900">{email}</span>, you will receive password reset instructions.
              </p>
              <div className="pt-2 space-y-2">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => navigateTo('reset_password')}
                >
                  Enter Reset Code / New Password
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => navigateTo('sign_in')}
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <h2 className="text-xl font-bold text-zinc-900">Reset Password</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Enter your registered work email to receive password recovery instructions
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Work Email"
                type="email"
                placeholder="name@field.marketmapper.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leadingIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading}>
                Send Recovery Instructions
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
