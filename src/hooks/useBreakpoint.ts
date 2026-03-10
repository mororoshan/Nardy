import { useState, useEffect } from "react";
import { LAYOUT_BREAKPOINT } from "../layout/breakpoint";

export function useBreakpoint(
  breakpoint: number = LAYOUT_BREAKPOINT,
): { isNarrow: boolean } {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : breakpoint + 1,
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { isNarrow: width < breakpoint };
}
