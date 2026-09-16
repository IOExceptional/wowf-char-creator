import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface TooltipContent {
  title: string;
  meta?: string;
  details?: string[];
  requirement?: string | null;
  current?: string;
  currentLabel?: string;
  next?: string;
  hint?: string;
  note?: string;
}

interface TooltipApi {
  show: (content: TooltipContent, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
}

const TooltipContext = createContext<TooltipApi | null>(null);

export function useTooltip(): TooltipApi {
  const api = useContext(TooltipContext);
  if (!api) throw new Error('useTooltip must be used inside <TooltipProvider>');
  return api;
}

const OFFSET = 16;

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<TooltipContent | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [placed, setPlaced] = useState({ left: 0, top: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const api = useMemo<TooltipApi>(
    () => ({
      show: (c, x, y) => {
        setContent(c);
        setPos({ x, y });
      },
      move: (x, y) => setPos({ x, y }),
      hide: () => setContent(null),
    }),
    [],
  );

  // Touch has no hover: taps pin the tooltip (see useHoverTooltip), so dismiss it on scroll or a tap elsewhere.
  useEffect(() => {
    if (!content) return;
    const hide = () => setContent(null);
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') hide();
    };
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', hide);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [content]);

  // Keep the card inside the viewport: flip to the left/top of the cursor when it would overflow.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !content) return;
    const { width, height } = el.getBoundingClientRect();
    let left = pos.x + OFFSET;
    let top = pos.y + OFFSET;
    if (left + width > window.innerWidth - 8) left = Math.max(8, pos.x - width - OFFSET);
    if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
    setPlaced({ left, top });
  }, [pos, content]);

  return (
    <TooltipContext.Provider value={api}>
      {children}
      {content && (
        <div ref={ref} className="tooltip" role="tooltip" style={{ left: placed.left, top: placed.top }}>
          <div className="tooltip-title">{content.title}</div>
          {content.meta && <div className="tooltip-meta">{content.meta}</div>}
          {content.details?.map((d) => (
            <div key={d} className="tooltip-detail">{d}</div>
          ))}
          {content.requirement && <div className="tooltip-requirement">{content.requirement}</div>}
          {content.current && (
            <>
              {content.currentLabel && <div className="tooltip-label">{content.currentLabel}</div>}
              <p className="tooltip-desc">{content.current}</p>
            </>
          )}
          {content.next && (
            <>
              <div className="tooltip-label">Next rank</div>
              <p className="tooltip-desc">{content.next}</p>
            </>
          )}
          {content.note && <p className="tooltip-note">{content.note}</p>}
          {content.hint && <div className="tooltip-hint">{content.hint}</div>}
        </div>
      )}
    </TooltipContext.Provider>
  );
}

/** Pointer handlers that show a tooltip while hovering an element, or after tapping it on touch screens. */
export function useHoverTooltip(content: TooltipContent) {
  const tooltip = useTooltip();
  const latest = useRef(content);
  latest.current = content;
  return {
    onPointerEnter: useCallback((e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') tooltip.show(latest.current, e.clientX, e.clientY);
    }, [tooltip]),
    onPointerMove: useCallback((e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') tooltip.show(latest.current, e.clientX, e.clientY);
    }, [tooltip]),
    onPointerLeave: useCallback((e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') tooltip.hide();
    }, [tooltip]),
    onPointerUp: useCallback((e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const rect = e.currentTarget.getBoundingClientRect();
      // Defer so it renders with the rank that the tap just changed.
      setTimeout(() => tooltip.show(latest.current, rect.left, rect.bottom), 0);
    }, [tooltip]),
  };
}
