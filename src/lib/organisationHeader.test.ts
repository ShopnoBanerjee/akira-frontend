import { afterEach, describe, expect, it } from "vitest";

import { PLATFORM_ORGANISATION_KEY, organisationHeaderFor } from "./api";

describe("organisationHeaderFor", () => {
  afterEach(() => sessionStorage.clear());

  it("sends nothing when no organisation is open", () => {
    expect(organisationHeaderFor("/outlets")).toEqual({});
  });

  it("names the opened organisation on the customer's own routes", () => {
    sessionStorage.setItem(PLATFORM_ORGANISATION_KEY, JSON.stringify({ id: "org-1", name: "A" }));
    expect(organisationHeaderFor("/outlets")).toEqual({ "X-Organisation": "org-1" });
    expect(organisationHeaderFor("/sop/templates?x=1")).toEqual({ "X-Organisation": "org-1" });
  });

  it("never sends it on the platform's own routes", () => {
    // The API ignores it there anyway; this keeps who /users/me says the
    // platform is, and what the console shows, independent of what is open.
    sessionStorage.setItem(PLATFORM_ORGANISATION_KEY, JSON.stringify({ id: "org-1", name: "A" }));
    for (const path of ["/users/me", "/platform/organisations", "/platform/overview", "/healthz"]) {
      expect(organisationHeaderFor(path)).toEqual({});
    }
  });

  it("treats a damaged stored value as nothing open", () => {
    sessionStorage.setItem(PLATFORM_ORGANISATION_KEY, "{not json");
    expect(organisationHeaderFor("/outlets")).toEqual({});
    sessionStorage.setItem(PLATFORM_ORGANISATION_KEY, JSON.stringify({ id: 42 }));
    expect(organisationHeaderFor("/outlets")).toEqual({});
  });
});
