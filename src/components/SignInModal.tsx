import { useState } from "react";
import { Button } from "./ui";
import { useAuth } from "../contexts/AuthContext";

export interface SignInModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function SignInModal({ onSuccess, onClose }: SignInModalProps) {
  const {
    signInWithPassword,
    signUp,
    signInWithOAuth,
    notConfigured,
    loading: authLoading,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = isSignUp
        ? await signUp(email.trim(), password)
        : await signInWithPassword(email.trim(), password);
      if (err) {
        setError(err.message ?? "Something went wrong");
        return;
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await signInWithOAuth("google");
    if (err) {
      setError(err.message ?? "Something went wrong");
    }
    setLoading(false);
  };

  if (notConfigured) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
      >
        <div className="bg-menu-overlay border-2 border-menu-gold rounded-xl p-6 max-w-sm w-full shadow-xl">
          <h2
            id="signin-title"
            className="text-menu-gold text-xl font-semibold m-0 mb-4"
          >
            Sign in
          </h2>
          <p className="text-text m-0 mb-4">
            Ranked play and leaderboard require auth. Supabase is not configured
            (missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY).
          </p>
          <Button variant="menu" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      <div className="bg-menu-overlay border-2 border-menu-gold rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h2
          id="signin-title"
          className="text-menu-gold text-xl font-semibold m-0 mb-4"
        >
          Sign in to play ranked
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="signin-email"
              className="block text-sm text-menu-gold-muted mb-1"
            >
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-2 px-3 bg-menu-input-bg text-text border border-menu-gold rounded-md"
              required
              autoComplete="email"
              disabled={loading || authLoading}
            />
          </div>
          <div>
            <label
              htmlFor="signin-password"
              className="block text-sm text-menu-gold-muted mb-1"
            >
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-2 px-3 bg-menu-input-bg text-text border border-menu-gold rounded-md"
              required={!isSignUp}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              disabled={loading || authLoading}
              minLength={isSignUp ? 6 : undefined}
            />
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-error">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="menu"
              disabled={loading || authLoading}
              className="flex-1"
            >
              {isSignUp ? "Sign up" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsSignUp((v) => !v);
                setError(null);
              }}
              disabled={loading || authLoading}
            >
              {isSignUp ? "Sign in instead" : "Sign up"}
            </Button>
          </div>
        </form>
        <div className="mt-4 pt-4 border-t border-menu-gold">
          <Button
            type="button"
            variant="menu"
            onClick={handleGoogle}
            disabled={loading || authLoading}
            className="w-full"
          >
            Sign in with Google
          </Button>
        </div>
        <Button variant="ghost" onClick={onClose} className="mt-4 w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
}
