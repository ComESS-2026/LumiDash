import { useState } from 'react';
import type { FormEvent } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import FormField, { INPUT_CLASS } from '@/components/ui/FormField';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'signin' | 'signup';

const MIN_PASSWORD_LENGTH = 6;

const MODE_COPY: Record<AuthMode, { title: string; description: string; submit: string; switchPrompt: string; switchLabel: string }> = {
  signin: {
    title: 'Sign in to your workspace',
    description: 'Manage your club roster and events.',
    submit: 'Sign in',
    switchPrompt: 'New to LumiDash?',
    switchLabel: 'Create an account',
  },
  signup: {
    title: 'Create your account',
    description: 'Set up your own club roster and calendar.',
    submit: 'Create account',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
  },
};

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const copy = MODE_COPY[mode];

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setNotice(null);
    setFieldErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const errors: { email?: string; password?: string } = {};
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) errors.email = 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD_LENGTH && mode === 'signup') {
      errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!password && mode === 'signin') errors.password = 'Enter your password.';
    setFieldErrors(errors);
    setError(null);
    setNotice(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const result =
      mode === 'signin'
        ? await signIn(trimmedEmail, password)
        : await signUp(trimmedEmail, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNotice('Account created. Check your email to confirm it, then sign in.');
      setMode('signin');
      setPassword('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 font-sans text-slate-900">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="mt-4 text-lg font-semibold tracking-tight text-slate-900">LumiDash</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{copy.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{copy.description}</p>
          </div>

          {notice && (
            <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField label="Email" htmlFor="auth-email" error={fieldErrors.email}>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
                placeholder="you@university.edu"
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="auth-password"
              error={fieldErrors.password}
              hint={mode === 'signup' ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
            >
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT_CLASS}
              />
            </FormField>

            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Please wait...' : copy.submit}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          {copy.switchPrompt}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="font-medium text-emerald-700 transition hover:text-emerald-800"
          >
            {copy.switchLabel}
          </button>
        </p>
      </div>
    </div>
  );
}
