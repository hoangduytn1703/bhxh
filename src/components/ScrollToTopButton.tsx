import { useEffect, useState, type RefObject } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '../lib/utils';

type Props = {
  scrollRef: RefObject<HTMLElement | null>;
  /** Extra bottom offset when another FAB sits below (e.g. feedback widget) */
  bottomClass?: string;
};

export function ScrollToTopButton({ scrollRef, bottomClass = 'bottom-6' }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      setVisible(el.scrollTop > 320);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Lên đầu trang"
      className={cn(
        'fixed right-6 z-30 w-11 h-11 rounded-full bg-slate-800 text-white shadow-lg shadow-slate-900/25',
        'flex items-center justify-center transition-all duration-200 cursor-pointer',
        'hover:bg-slate-700 hover:scale-105 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        bottomClass,
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
      )}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
