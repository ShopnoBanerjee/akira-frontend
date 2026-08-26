/** Client-side navigation. One place, so every link behaves the same. */
export function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Replace instead of push — for redirects that should not pollute history. */
export function redirect(to: string) {
  window.history.replaceState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
