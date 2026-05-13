import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  className,
  name,
  description,
  href,
  cta,
  background,
  Icon,
}: {
  className?: string;
  name?: string;
  description?: string;
  href?: string;
  cta?: string;
  background?: React.ReactNode;
  Icon?: React.ElementType;
}) => {
  return (
    <div
      key={name}
      className={cn(
        "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
        "bg-white [border:1px_solid_rgba(255,255,255,.1)] [box-shadow:0_8px_16px_rgba(0,0,0,.1)]",
        "transform-gpu transition-all duration-300 ease-in-out",
        "hover:scale-[1.02] hover:shadow-xl",
        className
      )}
    >
      <div>{background}</div>
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:translate-y-0">
        {Icon && (
          <Icon className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />
        )}
        <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
          {name}
        </h3>
        <div className="max-w-lg">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        </div>
        {href && (
          <div className="pointer-events-auto mt-4 flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <a href={href} className="text-sm font-semibold hover:underline">
              {cta || "Learn more"}
            </a>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transition-transform group-hover:translate-x-1"
            >
              <path
                d="M6.75 3.5L11.25 8L6.75 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
