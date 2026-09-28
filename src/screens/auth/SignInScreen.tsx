import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card, Divider } from '../../components/ui';
import { Mail, Lock, AlertCircle, ShieldAlert } from 'lucide-react';
import { UserRole } from '../../types';

export const SignInScreen: React.FC = () => {
  const { navigateTo, signIn, setUserRole, isDev } = useApp();
  const [email, setEmail] = useState('chioma.adebayo@field.marketmapper.org');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    setUserRole(role);
    signIn(`${role}@field.marketmapper.org`, 'demo_password');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md mb-3">
            MM
          </div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Market Mapper</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Sign in to access your assigned market missions
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Sign In Failed</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leadingIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leadingIcon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-zinc-500">Secure field session</span>
              <button
                type="button"
                onClick={() => navigateTo('forgot_password')}
                className="font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading}>
              Sign In
            </Button>
          </form>

          {/* Development Role Simulator (Strictly hidden in production) */}
          {isDev && (
            <>
              <Divider label="[DEV ONLY] Role Simulator" />
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1 text-[11px] text-amber-800 font-medium">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  <span>Preview local profile states (does not modify Supabase Auth):</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickLogin('mapper')}
                    className="text-xs font-bold"
                  >
                    Mapper
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickLogin('team_lead')}
                    className="text-xs font-bold"
                  >
                    Team Lead
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickLogin('admin')}
                    className="text-xs font-bold border-orange-200 text-orange-800 hover:bg-orange-50"
                  >
                    Admin
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Footer Link */}
        <p className="text-center text-xs text-zinc-600">
          New mapper?{' '}
          <button
            onClick={() => navigateTo('register')}
            className="font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
          >
            Create an Account
          </button>
        </p>
      </div>
    </div>
  );
};
