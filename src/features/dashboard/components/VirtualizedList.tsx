import React, { useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

interface VirtualizedListProps<T> {
  items: T[];
  estimatedItemHeight?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string | number;
}

/**
 * Lightweight scroll virtualizer for dashboard list cards and overlays.
 * In headless test environments where containerHeight === 0, renders up to 50 items
 * so unit tests can inspect rendered rows without mocking ResizeObserver.
 */
export function VirtualizedList<T>({
  items,
  estimatedItemHeight = 76,
  overscan = 5,
  renderItem,
  getKey,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientHeight > 0) setContainerHeight(el.clientHeight);
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);

  if (items.length === 0) return null;

  // Fallback when container hasn't been laid out (e.g. jsdom) or list is small
  if (containerHeight === 0 || items.length <= 25) {
    const slice = containerHeight === 0 ? items.slice(0, 50) : items;
    return (
      <Box ref={containerRef} sx={{ width: "100%", height: "100%" }}>
        {slice.map((item, idx) => (
          <React.Fragment key={getKey(item, idx)}>{renderItem(item, idx)}</React.Fragment>
        ))}
      </Box>
    );
  }

  const totalHeight = items.length * estimatedItemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / estimatedItemHeight) + overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetTop = startIndex * estimatedItemHeight;

  return (
    <Box
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      sx={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        position: "relative",
      }}
    >
      <Box sx={{ height: totalHeight, position: "relative", width: "100%" }}>
        <Box sx={{ position: "absolute", top: offsetTop, left: 0, right: 0 }}>
          {visibleItems.map((item, i) => {
            const actualIndex = startIndex + i;
            return (
              <React.Fragment key={getKey(item, actualIndex)}>
                {renderItem(item, actualIndex)}
              </React.Fragment>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
