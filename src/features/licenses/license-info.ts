/**
 * Calculo puro do estado da licenca — sem "server-only", porque o badge
 * tambem roda no client. A regra vive em um lugar so.
 */

export type LicenseState = "none" | "ok" | "expiring_soon" | "expired";

export type LicenseInfo = {
  state: LicenseState;
  daysLeft: number | null;
};

/** Dias de antecedencia que disparam aviso. O PRD pede 7; 1 e a ultima chamada. */
export const ALERT_THRESHOLDS = [7, 1];

export const EXPIRING_SOON_DAYS = 30;

export function getLicenseInfo(
  expiresAt: string | null,
  now = new Date(),
): LicenseInfo {
  if (!expiresAt) return { state: "none", daysLeft: null };

  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return { state: "none", daysLeft: null };

  const daysLeft = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft < 0) return { state: "expired", daysLeft };
  if (daysLeft <= EXPIRING_SOON_DAYS) return { state: "expiring_soon", daysLeft };
  return { state: "ok", daysLeft };
}
