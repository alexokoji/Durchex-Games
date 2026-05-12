import { useEffect, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollToTopProps {
  scrollRef: RefObject<HTMLElement | null>;
}

export default function ScrollToTop({ scrollRef }: ScrollToTopProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [pathname, scrollRef]);

  return null;
}
