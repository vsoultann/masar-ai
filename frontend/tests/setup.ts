import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

// jsdom implements neither matchMedia nor scrollTo, and components legitimately
// use both. Stub them once here rather than guarding every call site.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

/*
 * jsdom has no IntersectionObserver, and framer-motion's whileInView needs one.
 * The stub reports every observed element as immediately in view, which is the
 * right default for a test: a reveal-on-scroll element that never fires would
 * stay at its "hidden" variant and be invisible to every query in the suite.
 */
class ImmediateIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this,
    );
  }

  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", ImmediateIntersectionObserver);
