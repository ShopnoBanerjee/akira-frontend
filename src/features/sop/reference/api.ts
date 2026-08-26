import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { resizeImage } from "@/lib/image";
import type { components } from "@/types/api";

export type ReferencePhoto = components["schemas"]["ReferencePhoto"];

const KEYS = {
  all: ["sop", "reference-photos"] as const,
  forOutlet: (outletId: string) => ["sop", "reference-photos", outletId] as const,
};

/**
 * Every photo-requiring item at this outlet, whether or not it has a standard.
 *
 * The gaps are the point. A list of only what has been captured would make an
 * outlet with two standards look finished.
 */
export function useReferencePhotos(outletId: string | null) {
  return useQuery({
    queryKey: KEYS.forOutlet(outletId ?? ""),
    queryFn: () => api.get<ReferencePhoto[]>(`/sop/reference-photos?outlet_id=${outletId}`),
    enabled: outletId !== null,
    // Signed view URLs expire in five minutes; refetch before they do.
    staleTime: 4 * 60_000,
  });
}

export function useSetReferencePhoto(outletId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateItemId,
      file,
      caption,
    }: {
      templateItemId: string;
      file: Blob;
      caption?: string;
    }) => {
      // Same pipeline as a floor photo: resize here, upload straight to
      // storage with a URL the API minted, confirm afterwards.
      const blob = await resizeImage(file);
      const grant = await api.post<{ upload_url: string; path: string }>(
        "/sop/reference-photos/upload-url",
        {
          outlet_id: outletId,
          template_item_id: templateItemId,
          content_type: "image/jpeg",
          byte_size: blob.size,
        },
      );
      const put = await fetch(grant.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      return api.post<{ id: string }>("/sop/reference-photos", {
        outlet_id: outletId,
        template_item_id: templateItemId,
        path: grant.path,
        caption: caption?.trim() || null,
      });
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useRetireReferencePhoto() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/sop/reference-photos/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.all }),
  });
}

/** Coverage for the header: how much of this outlet's standard is captured. */
export function coverage(rows: ReferencePhoto[] | undefined): {
  captured: number;
  total: number;
  pct: number;
} {
  const total = rows?.length ?? 0;
  const captured = rows?.filter((r) => r.photo_path).length ?? 0;
  if (total === 0) return { captured, total, pct: 0 };
  // Floored, not rounded. 199 of 200 rounds to 100%, and a bar reading 100%
  // with a gap behind it is exactly the wrong thing to show before switching
  // on a reviewer that depends on the standards being there.
  const exact = (100 * captured) / total;
  return { captured, total, pct: captured === total ? 100 : Math.floor(exact) };
}
