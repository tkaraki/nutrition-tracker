import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Field } from "../components/ui";
import { ApiError } from "../api/client";
import { useLogin } from "../hooks/useAuth";

export function LoginRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();

  const prefillEmail = (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorBanner) bannerRef.current?.focus();
  }, [errorBanner]);

  const emailError = !email.trim() ? "Email is required" : undefined;
  const passwordError = !password ? "Password is required" : undefined;

  const showEmailError = (touched.email || submitAttempted) && emailError;
  const showPasswordError = (touched.password || submitAttempted) && passwordError;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (emailError || passwordError) return;

    setErrorBanner(null);
    setRateLimited(false);
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          const redirect = searchParams.get("redirect");
          navigate(redirect || "/", { replace: true });
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.status === 401) {
              setErrorBanner("Invalid email or password.");
              // Clear the password (hygiene) without leaving the now-empty
              // field looking client-validated as "required" — only the
              // banner should communicate this error, per the no-field-level
              // leak requirement (avoids hinting which field was wrong).
              setPassword("");
              setSubmitAttempted(false);
              setTouched((t) => ({ ...t, password: false }));
              return;
            }
            if (err.status === 429) {
              setErrorBanner("Too many attempts — wait a few minutes and try again.");
              setRateLimited(true);
              return;
            }
          }
          setErrorBanner("Something went wrong — try again.");
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
              {errorBanner}
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
            <div className="mb-6">
              <Field
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={showPasswordError ? passwordError : undefined}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={login.isPending}
              disabled={login.isPending || rateLimited}
            >
              Log in
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          New here? <Link to="/register" className="text-[var(--color-primary)] font-medium">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
