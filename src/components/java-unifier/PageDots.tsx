"use client";

import { useEffect } from 'react';
import type { Language } from '@/lib/translations';

/** The original DotScroll tracks window sections. Keep that behavior for the page. */
export function PageDots({ hasHistory, modalOpen, language }: { hasHistory: boolean; modalOpen: boolean; language: Language }) {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let dots: import('@/lib/vendor/dotscroll').DotScrollInstance | null = null;
    let observer: ResizeObserver | undefined;
    import('@/lib/vendor/dotscroll').then(({ default: DotScroll }) => {
      if (disposed) return;
      const sync = () => {
        const shouldShow = !modalOpen && document.documentElement.scrollHeight > window.innerHeight + 36;
        if (!shouldShow) {
          dots?.destroy();
          dots = null;
          document.documentElement.classList.remove('app-page-dots');
        } else if (!dots) {
          dots = DotScroll.init({ selector: '[data-dotscroll-page]', smooth: false,
            invert: true, compact: true, pushBody: true, offset: 0 });
          document.documentElement.classList.add('app-page-dots');
        } else {
          dots.refresh();
        }
      };
      const refresh = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); };
      observer = new ResizeObserver(refresh);
      observer.observe(document.body);
      window.addEventListener('resize', refresh);
      refresh();
      onCleanup = () => {
        observer?.disconnect();
        window.removeEventListener('resize', refresh);
      };
    });
    let onCleanup = () => {};
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      onCleanup();
      dots?.destroy();
      document.documentElement.classList.remove('app-page-dots');
    };
  }, [hasHistory, modalOpen, language]);
  return null;
}
