import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card } from '../../components/ui';
import { Lock, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';

export const ResetPasswordScreen: React.FC = () => {
  const { navigateTo, confirmPasswordReset } = useApp();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    const res = await confirmPasswordReset(newPassword);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Failed to update password.');
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
          {success ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Password Updated</h3>
              <p className="text-xs text-zinc-600">
                Your new password has been set. You can now sign in with your updated credentials.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => navigateTo('sign_in')}
                >
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <h2 className="text-xl font-bold text-zinc-900">Set New Password</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Choose a secure password for your field mapper account
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Reset Code / Token (if provided)"
                type="text"
                placeholder="Recovery token (optional if via email link)"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                optional
              />

              <Input
                label="New Password"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leadingIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leadingIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading}>
                Update Password
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
