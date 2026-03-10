import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LAYOUT_BREAKPOINT } from "../layout/breakpoint";
import { useBreakpoint } from "./useBreakpoint";

let originalInnerWidth: number;

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

describe("useBreakpoint", () => {
  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it("returns isNarrow true when width is below breakpoint", () => {
    setWindowWidth(LAYOUT_BREAKPOINT - 1);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isNarrow).toBe(true);
  });

  it("returns isNarrow false when width is at or above breakpoint", () => {
    setWindowWidth(LAYOUT_BREAKPOINT);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isNarrow).toBe(false);
  });

  it("updates when window is resized", () => {
    setWindowWidth(800);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isNarrow).toBe(false);

    act(() => {
      setWindowWidth(400);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.isNarrow).toBe(true);
  });

  it("uses custom breakpoint when provided", () => {
    const customBreakpoint = 400;
    setWindowWidth(customBreakpoint - 1);
    const { result: resultNarrow } = renderHook(() =>
      useBreakpoint(customBreakpoint),
    );
    expect(resultNarrow.current.isNarrow).toBe(true);

    setWindowWidth(customBreakpoint);
    const { result: resultWide } = renderHook(() =>
      useBreakpoint(customBreakpoint),
    );
    expect(resultWide.current.isNarrow).toBe(false);
  });
});
