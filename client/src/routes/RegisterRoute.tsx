import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Field } from "../components/ui";
import { ApiError } from "../api/client";
import { useRegister } from "../hooks/useAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;

export function RegisterRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const register = useRegister();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ email?: boolean; displayName?: boolean; password?: boolean }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [errorBanner, setErrorBanner] = useState<{ message: string; showLoginLink?: boolean } | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorBanner) bannerRef.current?.focus();
  }, [errorBanner]);

  const emailError = !email.trim()
    ? "Email is required"
    : !EMAIL_RE.test(email.trim())
      ? "Enter a valid email address"
      : undefined;
  const displayNameError = !displayName.trim() ? "Display name is required" : undefined;
  const passwordError = !password
    ? "Password is required"
    : password.length < MIN_PASSWORD_LENGTH
      ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      : undefined;

  const showEmailError = (touched.email || submitAttempted) && emailError;
  const showDisplayNameError = (touched.displayName || submitAttempted) && displayNameError;
  const showPasswordError = (touched.password || submitAttempted) && passwordError;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (emailError || displayNameError || passwordError) return;

    setErrorBanner(null);
    setRateLimited(false);
    register.mutate(
      { email: email.trim(), password, display_name: displayName.trim() },
      {
        onSuccess: () => {
          const redirect = searchParams.get("redirect");
          navigate(redirect || "/", { replace: true });
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.status === 409) {
              setErrorBanner({ message: "Email already registered.", showLoginLink: true });
              return;
            }
            if (err.status === 429) {
              setErrorBanner({ message: "Too many attempts — wait a few minutes and try again." });
              setRateLimited(true);
              return;
            }
          }
          setErrorBanner({ message: "Something went wrong — try again." });
        },
      },
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-6">
          <h1 className="text-[length:var(--text-heading)] font-semibold text-[var(--color-text)]">
            Nutrition Tracker
          </h1>
          <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            Track what you eat, hit your targets.
          </p>
        </div>

        <Card padding="lg">
          {errorBanner && (
            <div
              ref={bannerRef}
              role="alert"
              tabIndex={-1}
              className="mb-4 rounded-[var(--radius-sm)] border border-[var(--color-error-border)] bg-[var(--color-error-wash)] px-3 py-2 text-[length:var(--text-body-sm)] text-[var(--color-error)] focus:outline-none"
            >
              {errorBanner.message}
              {errorBanner.showLoginLink && (
                <>
                  {" "}
                  <Link
                    to="/login"
                    state={{ email: email.trim() }}
                    className="font-medium underline"
                  >
                    Log in instead →
                  </Link>
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <Field
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                error={showEmailError ? emailError : undefined}
              />
            </div>
            <div className="mb-4">
              <Field
                label="Display name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, displayName: true }))}
                error={showDisplayNameError ? displayNameError : undefined}
              />
            </div>
            <div className="mb-6">
              <Field
                label="Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={showPasswordError ? passwordError : undefined}
                hint={!showPasswordError ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={register.isPending}
              disabled={register.isPending || rateLimited}
            >
              Create account
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          Have an account? <Link to="/login" className="text-[var(--color-primary)] font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}
