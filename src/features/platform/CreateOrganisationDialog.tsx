import { useState } from "react";

import { Button, Dialog, ErrorNote, Field, Input } from "@/components/ui/primitives";
import { navigate } from "@/app/navigate";
import { ApiError } from "@/lib/api";
import { useCreateOrganisation, type CreateOrganisationResult } from "./api";
import { DEFAULT_ALLOWANCES, SLUG_PATTERN, slugFrom } from "./format";

export function CreateOrganisationDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateOrganisation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateOrganisationResult | null>(null);

  const effectiveSlug = slugTouched ? slug : slugFrom(name);
  const slugOk = SLUG_PATTERN.test(effectiveSlug);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim());
  const ready = name.trim() && slugOk && ownerName.trim() && emailOk && !create.isPending;

  function close() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setOwnerName("");
    setOwnerEmail("");
    setError(null);
    setCreated(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="New organisation">
      {created ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            <strong>{created.organisation.name}</strong> is set up, in development. {created.detail}
          </p>
          <p className="text-sm text-akira-ink/65">
            It starts empty. Open it to run its onboarding: outlets, the Petpooja uploads,
            checklists and people. Mark it onboarded when it is ready to go live.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
            <Button
              onClick={() => {
                const id = created.organisation.organisation_id;
                close();
                navigate(`/platform/organisations/${id}`);
              }}
            >
              Open {created.organisation.name}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Organisation name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sakura Kitchens"
              autoComplete="off"
            />
          </Field>
          <Field label="Short name (used in logins and links)">
            <Input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          {effectiveSlug && !slugOk && (
            <p className="-mt-2 text-xs text-akira-red">
              3 to 40 lowercase letters, digits or hyphens, starting and ending with a letter or
              digit.
            </p>
          )}
          <Field label="Owner's full name">
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Owner's email">
            <Input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              autoComplete="off"
              inputMode="email"
            />
          </Field>
          <p className="text-xs text-akira-ink/55">
            The owner gets an invitation email to set their own password. The organisation starts in
            development, allowed 1,00,000 outlets and people and 10,000 tablets; change those on its
            page.
          </p>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={!ready}
              onClick={() => {
                setError(null);
                create.mutate(
                  {
                    name: name.trim(),
                    slug: effectiveSlug,
                    owner_full_name: ownerName.trim(),
                    owner_email: ownerEmail.trim(),
                    ...DEFAULT_ALLOWANCES,
                  },
                  {
                    onSuccess: (result) => setCreated(result),
                    onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
                  },
                );
              }}
            >
              {create.isPending ? "Creating…" : "Create organisation"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
