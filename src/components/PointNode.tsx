import { useRef } from 'react';
import { Icon } from './Icon';
import { useHoverTooltip, type TooltipContent } from './Tooltip';

export type NodeState = 'locked' | 'available' | 'partial' | 'max' | 'placeholder';

interface PointNodeProps {
  icon: string;
  name: string;
  rank: number;
  maxRank: number;
  state: NodeState;
  shape?: 'square' | 'round';
  tooltip: TooltipContent;
  onAdd: () => void;
  onRemove: () => void;
  style?: React.CSSProperties;
}

const LONG_PRESS_MS = 450;

/** A clickable talent/legacy icon: click to add a rank, right-click, shift-click, or long-press to remove one. */
export function PointNode({ icon, name, rank, maxRank, state, shape = 'square', tooltip, onAdd, onRemove, style }: PointNodeProps) {
  const hover = useHoverTooltip(tooltip);
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const clearPress = () => window.clearTimeout(pressTimer.current);

  return (
    <button
      type="button"
      className={`node node-${shape}`}
      data-state={state}
      style={style}
      aria-label={`${name}, rank ${rank} of ${maxRank}${tooltip.requirement ? `. ${tooltip.requirement}` : ''}`}
      {...hover}
      onPointerDown={(e) => {
        longPressed.current = false;
        if (e.pointerType !== 'mouse') {
          pressTimer.current = window.setTimeout(() => {
            longPressed.current = true;
            onRemove();
          }, LONG_PRESS_MS);
        }
      }}
      onPointerUp={(e) => {
        clearPress();
        hover.onPointerUp(e);
      }}
      onPointerCancel={clearPress}
      onPointerLeave={(e) => {
        clearPress();
        hover.onPointerLeave(e);
      }}
      onClick={(e) => {
        if (longPressed.current) return;
        if (e.shiftKey) onRemove();
        else onAdd();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <Icon name={icon} size="medium" className="node-icon" />
      {state !== 'placeholder' && (
        <span className="node-rank">
          {rank}/{maxRank}
        </span>
      )}
    </button>
  );
}
