import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card } from '../../components/ui';
import { MailCheck, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

export const VerifyAccountScreen: React.FC = () => {
  const { navigateTo, resendVerification } = useApp();
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resentMessage, setResentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email to resend verification.');
      return;
    }

    setError(null);
    setResending(true);
    const res = await resendVerification(email);
    setResending(false);

    if (res.success) {
      setResentMessage(`A new verification email has been dispatched to ${email}.`);
    } else {
      setError(res.error || 'Failed to resend verification email.');
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

        <Card padding="lg" className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <MailCheck className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-zinc-900">Check Your Email</h2>
          <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
            We sent a verification link to your email address. Please click the link in your inbox to confirm your account and activate local sync.
          </p>

          {resentMessage && (
            <div className="mt-4 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200">
              {resentMessage}
            </div>
          )}

          {error && (
            <div className="mt-4 p-2.5 bg-red-50 text-red-800 rounded-xl text-xs flex items-center gap-2 border border-red-200 text-left">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleResend} className="mt-6 space-y-3 text-left">
            <Input
              label="Work Email"
              type="email"
              placeholder="name@field.marketmapper.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="outline"
              size="md"
              fullWidth
              isLoading={resending}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Resend Verification Email
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-100">
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => navigateTo('sign_in')}
            >
              Return to Sign In
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
