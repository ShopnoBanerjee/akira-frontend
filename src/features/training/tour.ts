/**
 * The tour's pure logic, kept out of the component so it can be tested
 * without a DOM: which steps a role sees, where the spotlight goes, what
 * "next" means, and how progress is described.
 */

import type { UserRole } from "@/features/auth/types";

export type Track = "management" | "floor";
export type Lang = "en" | "bn";

export interface Bilingual {
  en: string;
  bn: string;
}

export interface TourStep {
  /** Stable id, unique within a track. Never reuse an id for different content. */
  id: string;
  /** The `data-tour` value of the control to highlight; null centres the card. */
  anchor: string | null;
  /** Navigate here before showing the step; null keeps the current page. */
  route: string | null;
  title: Bilingual;
  body: Bilingual;
  /** Only these roles see the step; undefined means every role on the track. */
  roles?: readonly UserRole[];
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The steps this role walks, in order. */
export function stepsFor(steps: readonly TourStep[], role: UserRole): TourStep[] {
  return steps.filter((s) => !s.roles || s.roles.includes(role));
}

/** Human progress: "3 of 9". 1-based, clamped so it never reads "0 of 9". */
export function progressLabel(index: number, total: number, lang: Lang): string {
  const n = Math.min(Math.max(index + 1, 1), total);
  return lang === "bn" ? `${total}-এর মধ্যে ${n}` : `${n} of ${total}`;
}

/** Where to put the card relative to a highlighted element, given the viewport. */
export function placeCard(
  target: Rect | null,
  viewport: { width: number; height: number },
  card: { width: number; height: number },
  gap = 12,
): { top: number; left: number; placement: "below" | "above" | "centre" } {
  if (!target) {
    return {
      top: Math.max(gap, (viewport.height - card.height) / 2),
      left: Math.max(gap, (viewport.width - card.width) / 2),
      placement: "centre",
    };
  }
  const left = Math.min(
    Math.max(gap, target.left + target.width / 2 - card.width / 2),
    Math.max(gap, viewport.width - card.width - gap),
  );
  const below = target.top + target.height + gap;
  if (below + card.height <= viewport.height - gap) {
    return { top: below, left, placement: "below" };
  }
  const above = target.top - gap - card.height;
  if (above >= gap) {
    return { top: above, left, placement: "above" };
  }
  // Neither side has room for the whole card. Take the roomier side and let
  // the card run to the viewport edge rather than sit on the control.
  const roomBelow = viewport.height - (target.top + target.height);
  const roomAbove = target.top;
  if (roomBelow >= roomAbove) {
    return {
      top: Math.min(below, Math.max(gap, viewport.height - card.height - gap)),
      left,
      placement: "below",
    };
  }
  return { top: gap, left, placement: "above" };
}

/** Pad a target rectangle so the spotlight breathes around the control. */
export function spotlightRect(target: Rect, pad = 6): Rect {
  return {
    top: Math.max(0, target.top - pad),
    left: Math.max(0, target.left - pad),
    width: target.width + pad * 2,
    height: target.height + pad * 2,
  };
}

/** Every step id unique, every anchor a plain token; the content test runs this. */
export function validateSteps(steps: readonly TourStep[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const s of steps) {
    if (seen.has(s.id)) problems.push(`duplicate id: ${s.id}`);
    seen.add(s.id);
    if (s.anchor !== null && !/^[a-z0-9-]+$/.test(s.anchor)) {
      problems.push(`anchor is not a token: ${s.anchor}`);
    }
    if (s.route !== null && !s.route.startsWith("/")) problems.push(`route not absolute: ${s.id}`);
    for (const lang of ["en", "bn"] as const) {
      if (!s.title[lang].trim()) problems.push(`${s.id}: empty ${lang} title`);
      if (!s.body[lang].trim()) problems.push(`${s.id}: empty ${lang} body`);
    }
  }
  return problems;
}
