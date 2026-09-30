"use client"

import * as React from 'react';
import type { DotScrollInstance } from '@/lib/vendor/dotscroll';
import { cn } from '@/lib/utils';

type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement> & {
  viewportRef?: React.Ref<HTMLDivElement>;
  scrollbarType?: 'auto' | 'always' | 'scroll' | 'hover';
  dotKey?: string | number;
  dotSelector?: string;
};

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, viewportRef, onScroll, dotKey, dotSelector = '[data-dotscroll-section]', scrollbarType: _scrollbarType, ...props }, ref) => {
    const localViewport = React.useRef<HTMLDivElement | null>(null);
    const setViewport = React.useCallback((node: HTMLDivElement | null) => {
      localViewport.current = node;
      if (typeof viewportRef === 'function') viewportRef(node);
      else if (viewportRef) (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }, [viewportRef]);

    React.useEffect(() => {
      let disposed = false;
      let frame = 0;
      let dots: DotScrollInstance | null = null;
      let observer: ResizeObserver | undefined;
      let mutations: MutationObserver | undefined;
      let onCleanup = () => {};

      import('@/lib/vendor/dotscroll').then(({ default: DotScroll }) => {
        if (disposed) return;
        const viewport = localViewport.current;
        const root = viewport?.parentElement;
        if (!viewport || !root) return;
        const actualSelector = `${dotSelector}, [data-dotscroll-fallback]`;

        const sync = () => {
          const marked = viewport.querySelectorAll(dotSelector);
          viewport.querySelector('[data-dotscroll-fallback]')?.removeAttribute('data-dotscroll-fallback');
          if (!marked.length) viewport.firstElementChild?.setAttribute('data-dotscroll-fallback', '');
          const sections = Array.from(viewport.querySelectorAll(actualSelector));
          const shouldShow = viewport.clientHeight > 80 && viewport.scrollHeight - viewport.clientHeight > 12 && sections.length > 0;

          if (!shouldShow) {
            dots?.destroy();
            dots = null;
            root.removeAttribute('data-dotscroll-active');
          } else if (!dots || dots.sections.length !== sections.length ||
            sections.some((section, index) => dots?.sections[index] !== section)) {
            dots?.destroy();
            dots = DotScroll.init({ selector: actualSelector, container: viewport,
              smooth: false, invert: true, compact: true, pushBody: true, offset: 0 });
            root.setAttribute('data-dotscroll-active', 'true');
          } else dots.refresh();
        };

        const refresh = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); };
        observer = new ResizeObserver(refresh);
        observer.observe(viewport);
        if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
        mutations = new MutationObserver(refresh);
        mutations.observe(viewport, { childList: true, subtree: true });
        window.addEventListener('resize', refresh);
        refresh();
        onCleanup = () => window.removeEventListener('resize', refresh);
      }).catch(error => {
        // The visible native scrollbar keeps the panel usable if the dots fail to load.
        console.error('[DotScroll] Could not initialize this scroll area:', error);
      });

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer?.disconnect();
        mutations?.disconnect();
        onCleanup();
        dots?.destroy();
        localViewport.current?.querySelector('[data-dotscroll-fallback]')?.removeAttribute('data-dotscroll-fallback');
      };
    }, [dotKey, dotSelector]);

    return (
      <div ref={ref} className={cn('ds-scroll-host relative min-h-0 min-w-0 overflow-hidden', className)} {...props}>
        <div ref={setViewport} onScroll={onScroll} data-dotscroll-ignore data-dotscroll-viewport
          className="h-full min-h-0 max-h-[inherit] w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-[inherit]">
          {children}
        </div>
      </div>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
