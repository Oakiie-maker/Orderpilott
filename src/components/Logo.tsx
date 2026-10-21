import { UtensilsCrossed } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
}

export function Logo({ className = '', showText = true, size = 'md', variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-8 h-8', text: 'text-xl' },
    lg: { icon: 'w-10 h-10', text: 'text-2xl' },
  };

  const textColor = variant === 'light' ? 'text-white' : 'text-navy-900';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
        <UtensilsCrossed className={`${sizes[size].icon} p-1.5`} />
      </div>
      {showText && (
        <span className={`${sizes[size].text} font-bold ${textColor} tracking-tight`}>
          Order<span className="text-primary-500">Pilot</span>
        </span>
      )}
    </div>
  );
}
