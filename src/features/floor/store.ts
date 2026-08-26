/**
 * The offline run draft. In-store wifi drops; the checklist runner must never
 * lose a half-finished run.
 *
 * Every answer is written HERE first — persisted to IndexedDB, photo blobs
 * included — and then pushed to the API. A failed push leaves the entry
 * unsynced; the queue drains automatically when the connection returns, with
 * backoff, and submit stays disabled while anything is unsynced. Reloading the
 * tab mid-run restores exactly where the user was.
 */

import { del, get, set } from "idb-keyval";
import { create } from "zustand";

import { api } from "@/lib/api";

export interface DraftAnswer {
  itemId: string;
  result: "pass" | "fail" | "na";
  valueNumeric: number | null;
  valueText: string | null;
  note: string | null;
  /** Photo captured but not yet uploaded+confirmed. */
  photoBlob: Blob | null;
  photoConfirmed: boolean;
  synced: boolean;
  attempts: number;
}

interface RunDraftState {
  runId: string | null;
  answers: Record<string, DraftAnswer>;
  syncing: boolean;
  lastError: string | null;

  load: (runId: string) => Promise<void>;
  answer: (
    itemId: string,
    partial: Omit<DraftAnswer, "itemId" | "synced" | "attempts" | "photoConfirmed">,
  ) => Promise<void>;
  attachPhoto: (itemId: string, blob: Blob) => Promise<void>;
  drain: () => Promise<void>;
  clear: () => Promise<void>;
  pendingCount: () => number;
}

const keyFor = (runId: string) => `akira.run-draft.${runId}`;

async function persist(runId: string, answers: Record<string, DraftAnswer>) {
  try {
    await set(keyFor(runId), answers);
  } catch {
    // IndexedDB unavailable: the draft still lives in memory for this tab.
  }
}

async function pushAnswer(runId: string, draft: DraftAnswer): Promise<void> {
  await api.patch(`/sop/runs/${runId}/items/${draft.itemId}`, {
    result: draft.result,
    value_numeric: draft.valueNumeric,
    value_text: draft.valueText,
    note: draft.note,
  });
}

async function pushPhoto(runId: string, draft: DraftAnswer): Promise<void> {
  if (!draft.photoBlob || draft.photoConfirmed) return;
  const grant = await api.post<{ upload_url: string; path: string }>(
    `/sop/runs/${runId}/items/${draft.itemId}/photo-url`,
    { content_type: "image/jpeg", byte_size: draft.photoBlob.size },
  );
  const put = await fetch(grant.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: draft.photoBlob,
  });
  if (!put.ok) throw new Error(`Photo upload failed (${put.status}).`);
  await api.post(`/sop/runs/${runId}/items/${draft.itemId}/photo-confirm`, {
    path: grant.path,
  });
}

export const useRunDraft = create<RunDraftState>((set_, get_) => ({
  runId: null,
  answers: {},
  syncing: false,
  lastError: null,

  async load(runId) {
    let saved: Record<string, DraftAnswer> | undefined;
    try {
      saved = await get(keyFor(runId));
    } catch {
      saved = undefined;
    }
    set_({ runId, answers: saved ?? {}, lastError: null });
  },

  async answer(itemId, partial) {
    const { runId } = get_();
    if (!runId) return;
    const existing = get_().answers[itemId];
    const draft: DraftAnswer = {
      itemId,
      ...partial,
      photoBlob: partial.photoBlob ?? existing?.photoBlob ?? null,
      photoConfirmed: existing?.photoConfirmed ?? false,
      synced: false,
      attempts: 0,
    };
    const answers = { ...get_().answers, [itemId]: draft };
    set_({ answers });
    await persist(runId, answers);
    void get_().drain();
  },

  async attachPhoto(itemId, blob) {
    const { runId } = get_();
    if (!runId) return;
    const existing = get_().answers[itemId];
    const draft: DraftAnswer = existing
      ? { ...existing, photoBlob: blob, photoConfirmed: false, synced: false, attempts: 0 }
      : {
          itemId,
          result: "pass",
          valueNumeric: null,
          valueText: null,
          note: null,
          photoBlob: blob,
          photoConfirmed: false,
          synced: false,
          attempts: 0,
        };
    const answers = { ...get_().answers, [itemId]: draft };
    set_({ answers });
    await persist(runId, answers);
    void get_().drain();
  },

  async drain() {
    const { runId, syncing } = get_();
    if (!runId || syncing || !navigator.onLine) return;
    set_({ syncing: true, lastError: null });
    try {
      // Oldest-first, answers before their photos, one at a time — order
      // matters when the same item has both.
      for (const draft of Object.values(get_().answers)) {
        if (draft.synced && (draft.photoConfirmed || !draft.photoBlob)) continue;
        try {
          if (!draft.synced) {
            await pushAnswer(runId, draft);
          }
          if (draft.photoBlob && !draft.photoConfirmed) {
            await pushPhoto(runId, draft);
          }
          const answers = {
            ...get_().answers,
            [draft.itemId]: {
              ...draft,
              synced: true,
              photoConfirmed: draft.photoBlob ? true : draft.photoConfirmed,
              // The blob is on the server now; keep IndexedDB lean.
              photoBlob: null,
            },
          };
          set_({ answers });
          await persist(runId, answers);
        } catch (error) {
          const answers = {
            ...get_().answers,
            [draft.itemId]: { ...draft, attempts: draft.attempts + 1 },
          };
          set_({
            answers,
            lastError: error instanceof Error ? error.message : "Could not sync. Will retry.",
          });
          await persist(runId, answers);
          // Stop the pass; the retry timer or reconnect listener resumes.
          break;
        }
      }
    } finally {
      set_({ syncing: false });
    }
  },

  async clear() {
    const { runId } = get_();
    if (runId) {
      try {
        await del(keyFor(runId));
      } catch {
        // Nothing to do: the key either never existed or storage is gone.
      }
    }
    set_({ runId: null, answers: {}, lastError: null });
  },

  pendingCount() {
    return Object.values(get_().answers).filter(
      (a) => !a.synced || (a.photoBlob !== null && !a.photoConfirmed),
    ).length;
  },
}));

// Drain whenever the connection returns, and retry on a slow heartbeat while
// anything is pending. Registered once at module scope.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => void useRunDraft.getState().drain());
  setInterval(() => {
    const state = useRunDraft.getState();
    if (state.runId && state.pendingCount() > 0) void state.drain();
  }, 15_000);
}
