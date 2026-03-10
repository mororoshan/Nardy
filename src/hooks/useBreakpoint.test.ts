import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useBreakpoint } from "./useBreakpoint";
import { LAYOUT_BREAKPOINT } from "../layout/breakpoint";

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

describe("useBreakpoint", () => {
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
});
