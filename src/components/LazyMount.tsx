"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Defers rendering expensive children (e.g. Recharts charts) until the
 * placeholder is close to the viewport. Keeps initial page render cheap
 * on low-end devices.
 */
export default function LazyMount({
  children,
  minHeight = 280,
  placeholder,
}: {
  children: React.ReactNode;
  minHeight?: number;
  placeholder?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : placeholder ?? null}
    </div>
  );
}
