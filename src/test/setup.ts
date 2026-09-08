import "@testing-library/jest-dom/vitest";

// jsdom implements <dialog> as an element but not its methods, so any test
// that opens one dies on `dialog.showModal is not a function`. The primitives
// use a real <dialog> on purpose (focus trapping and Escape come free in a
// browser), so the shim belongs here rather than in the component.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
