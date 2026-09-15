import { cn } from './Card'; // reuse cn utility

export const Spinner = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "inline-block w-5 h-5 border-2 border-border2 border-t-accent rounded-full animate-[spin_0.8s_linear_infinite]",
      className
    )}
  />
);
