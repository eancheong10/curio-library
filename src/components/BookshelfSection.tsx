import { Link } from "react-router-dom";
import { ReactNode } from "react";

interface BookshelfSectionProps {
  to: string;
  title: string;
  subtitle: string;
  spineColor: "red" | "green" | "blue" | "mustard";
  icon: ReactNode;
  index: number;
}

const colorMap = {
  red: "bg-leather-red",
  green: "bg-leather-green",
  blue: "bg-leather-blue",
  mustard: "bg-leather-mustard",
};

export const BookshelfSection = ({ to, title, subtitle, spineColor, icon, index }: BookshelfSectionProps) => {
  return (
    <Link
      to={to}
      className="group block animate-float-up"
      style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
    >
      <div className="relative">
        {/* The book */}
        <div
          className={`${colorMap[spineColor]} book-spine relative overflow-hidden
                      h-80 md:h-96 rounded-md
                      transition-all duration-500
                      group-hover:-translate-y-3 group-hover:rotate-[-1deg]
                      group-hover:shadow-2xl
                      flex flex-col items-center justify-between
                      px-5 py-8 text-paper`}
          style={{ transitionTimingFunction: "var(--transition-cozy)" }}
        >
          {/* Gold trim */}
          <div className="w-full h-1 bg-gradient-gold rounded" />
          <div className="absolute top-6 inset-x-0 h-px bg-gold/40" />
          <div className="absolute bottom-6 inset-x-0 h-px bg-gold/40" />

          {/* Vertical title (book spine) */}
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="text-gold opacity-90 group-hover:scale-110 transition-transform duration-500">
                {icon}
              </div>
              <h3
                className="font-display text-2xl md:text-3xl font-bold leading-tight"
                style={{ writingMode: "horizontal-tb" }}
              >
                {title}
              </h3>
              <p className="text-xs md:text-sm text-paper/80 italic px-2">{subtitle}</p>
            </div>
          </div>

          <div className="w-full h-1 bg-gradient-gold rounded" />

          {/* Texture overlay */}
          <div
            className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        {/* Shelf shadow */}
        <div className="h-3 mx-2 bg-gradient-to-b from-ink/40 to-transparent rounded-b-full blur-sm -mt-1" />
      </div>
    </Link>
  );
};
