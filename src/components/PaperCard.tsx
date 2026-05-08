import { ReactNode } from "react";

export const PaperCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`paper-texture rounded-lg shadow-[var(--shadow-page)] border border-wood/20 ${className}`}>
    {children}
  </div>
);
