import { SessionModeSlug } from "./types";

export const MODE_WEIGHTS: Record<SessionModeSlug, number> = {
  recovery: 0, activation: 1, reduced: 2, full: 3,
}

export const SESSION_MODE_DURATION: Record<SessionModeSlug, { min: number; max: number; overrides_user: boolean }> = {
  full:       { min: 60, max: 90, overrides_user: false },
  reduced:    { min: 45, max: 60, overrides_user: false },
  activation: { min: 20, max: 30, overrides_user: true },
  recovery:   { min: 15, max: 25, overrides_user: true },
}
