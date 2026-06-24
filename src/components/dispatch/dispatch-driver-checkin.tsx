"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/erp/icons";
import {
  sendDispatchDriverOtp,
  verifyDispatchDriverOtp,
  type DispatchTrackView,
} from "@/lib/dispatch-planning-api";

export const dispatchDriverSessionKey = (token: string) => `dispatch-driver-session:${token}`;

export function readDispatchDriverSession(token: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(dispatchDriverSessionKey(token));
}

export function writeDispatchDriverSession(token: string, sessionToken: string) {
  sessionStorage.setItem(dispatchDriverSessionKey(token), sessionToken);
}

export function clearDispatchDriverSession(token: string) {
  sessionStorage.removeItem(dispatchDriverSessionKey(token));
}

type DispatchDriverCheckinProps = {
  token: string;
  track: DispatchTrackView;
  onAuthenticated: (session: { driverSessionToken: string; driverName: string }) => void;
};

function DriverAuthShell({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`driver-auth-shell${compact ? " driver-auth-shell--compact" : ""}`}>
      <div className="driver-auth-brand" aria-hidden={compact}>
        <div className="driver-auth-brand__glow" />
        <div className="driver-auth-brand__inner">
          <img
            src="/sudarshan-group-logo.webp"
            alt="Sudarshan Group"
            className="driver-auth-brand__logo"
          />
          <div className="driver-auth-brand__copy">
            <p className="driver-auth-brand__name">Sudarshan Group</p>
            <p className="driver-auth-brand__tag">Enterprise Resource Planning</p>
          </div>
          <p className="driver-auth-brand__quote">
            Safe dispatch, <span className="driver-auth-brand__gold">live on the road.</span>
          </p>
        </div>
      </div>
      <div className="driver-auth-main">{children}</div>
    </div>
  );
}

export function DispatchDriverCheckin({
  token,
  track,
  onAuthenticated,
}: DispatchDriverCheckinProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Enter the email used when you were registered as a driver.");
      return;
    }
    setLoading(true);
    try {
      const result = await sendDispatchDriverOtp(token, email.trim());
      setOtpSent(true);
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim() || !otp.trim()) {
      setError("Enter your email and the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyDispatchDriverOtp(token, email.trim(), otp.trim());
      writeDispatchDriverSession(token, result.driverSessionToken);
      onAuthenticated({
        driverSessionToken: result.driverSessionToken,
        driverName: result.driverName,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  if (!track.vehicleAssigned) {
    return (
      <DriverAuthShell>
        <div className="driver-auth-card driver-auth-card--center">
          <div className="driver-auth-card__icon-wrap">
            <Icon name="truck" size={26} />
          </div>
          <h1 className="driver-auth-card__title">Vehicle not assigned</h1>
          <p className="driver-auth-card__sub">
            Dispatch <strong className="mono">{track.id}</strong> does not have a vehicle yet.
            Ask dispatch to assign a vehicle before check-in.
          </p>
        </div>
      </DriverAuthShell>
    );
  }

  return (
    <DriverAuthShell>
      <div className="driver-auth-card">
        <div className="driver-auth-card__mobile-brand">
          <img
            src="/sudarshan-group-logo.webp"
            alt="Sudarshan Group"
            className="driver-auth-card__mobile-logo"
          />
        </div>

        <div className="driver-auth-card__head">
          <p className="driver-auth-card__eyebrow">Driver check-in</p>
          <h1 className="driver-auth-card__title">Sign in to continue</h1>
          <p className="driver-auth-card__sub">
            Use the same email registered when you were added as a driver.
          </p>
        </div>

        <div className="driver-auth-dispatch">
          <div className="driver-auth-dispatch__id mono">{track.id}</div>
          <div className="driver-auth-dispatch__meta">
            <span>
              <Icon name="truck" size={13} /> {track.vehicle}
            </span>
            <span>
              <Icon name="pin" size={13} /> {track.route}
            </span>
          </div>
        </div>

        <div className="driver-auth-form">
          <div className="field">
            <label className="field-label" htmlFor="driver-email">
              Driver email
            </label>
            <input
              id="driver-email"
              className="input lg"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {otpSent ? (
            <div className="field">
              <label className="field-label" htmlFor="driver-otp">
                One-time code
              </label>
              <input
                id="driver-otp"
                className="input lg mono driver-auth-otp"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                disabled={loading}
              />
            </div>
          ) : null}

          <div className="driver-auth-form__actions">
            {!otpSent ? (
              <button
                type="button"
                className="btn primary lg driver-auth-form__btn"
                onClick={() => void sendOtp()}
                disabled={loading}
              >
                {loading ? "Sending…" : "Send OTP"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn primary lg driver-auth-form__btn"
                  onClick={() => void verifyOtp()}
                  disabled={loading}
                >
                  {loading ? "Verifying…" : "Verify & continue"}
                </button>
                <button
                  type="button"
                  className="btn secondary lg driver-auth-form__btn"
                  onClick={() => void sendOtp()}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </>
            )}
          </div>

          {error ? <p className="driver-auth-form__error">{error}</p> : null}
          {message ? <p className="driver-auth-form__msg">{message}</p> : null}
        </div>

        <p className="driver-auth-foot">
          Sudarshan Group · Secure driver access
        </p>
      </div>
    </DriverAuthShell>
  );
}
