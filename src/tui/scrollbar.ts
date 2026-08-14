import { CliRenderEvents, type ScrollBoxRenderable } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { type RefObject, useEffect } from "react";

/*
 * This keeps a <scrollbox>'s thumb sized to the share of the content on screen.
 * OpenTUI draws the thumb too short. Writing the bar's viewport size twice (to
 * zero then the real size) makes it measure the thumb correctly.
 */
export function useProportionalScrollbarThumb(scrollRef: RefObject<ScrollBoxRenderable | null>) {
  const renderer = useRenderer();

  useEffect(() => {
    const sizeThumb = () => {
      const scrollBox = scrollRef.current;
      if (!scrollBox) return;

      const bar = scrollBox.verticalScrollBar;
      const viewportSize = scrollBox.viewport.height;
      if (viewportSize === 0 || bar.scrollSize <= viewportSize) return;
      if (bar.slider.viewPortSize === viewportSize) return;

      bar.viewportSize = 0;
      bar.viewportSize = viewportSize;
    };

    renderer.on(CliRenderEvents.FRAME, sizeThumb);
    return () => {
      renderer.off(CliRenderEvents.FRAME, sizeThumb);
    };
  }, [renderer, scrollRef]);
}
