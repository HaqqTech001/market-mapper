import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card } from '../../components/ui';
import { User, Mail, Phone, Lock, ArrowLeft, AlertCircle } from 'lucide-react';

export const RegisterScreen: React.FC = () => {
  const { navigateTo, signUp } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    const result = await signUp(fullName, email, password, phone || undefined);
    setLoading(false);

    if (result.success) {
      if (result.requiresVerification) {
        navigateTo('verify_account');
      }
    } else if (result.error) {
      setError(result.error);
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

        <div className="text-center">
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Create Mapper Account</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Register your field device with Market Mapper
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Registration Error</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <Card padding="lg">
          <form onSubmit={handleRegister} className="space-y-3.5">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Babatunde Lawal"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leadingIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Work Email"
              type="email"
              placeholder="babatunde@field.marketmapper.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leadingIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+234 803 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leadingIcon={<Phone className="w-4 h-4" />}
              optional
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leadingIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leadingIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading} className="mt-2">
              Create Mapper Account
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-zinc-500">
          Already registered?{' '}
          <button
            onClick={() => navigateTo('sign_in')}
            className="font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};
