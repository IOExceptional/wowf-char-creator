const ICON_BASE = 'https://wow.zamimg.com/images/wow/icons';
const FALLBACK = 'inv_misc_questionmark';

interface IconProps {
  name: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  alt?: string;
}

export function Icon({ name, size = 'medium', className, alt = '' }: IconProps) {
  return (
    <img
      className={className}
      src={`${ICON_BASE}/${size}/${name}.jpg`}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.includes(FALLBACK)) img.src = `${ICON_BASE}/${size}/${FALLBACK}.jpg`;
      }}
    />
  );
}
