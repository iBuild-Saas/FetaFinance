import { cn } from "@/lib/utils";

type BrandLockupProps = {
  align?: "start" | "center";
  className?: string;
  size?: "sidebar" | "topbar";
};

export function BrandLockup({ align = "start", className, size = "sidebar" }: BrandLockupProps) {
  return (
    <div
      className={cn(
        "brand-lockup",
        align === "center" ? "items-center text-center" : "items-start text-left",
        size === "topbar" && "brand-lockup-topbar",
        className,
      )}
    >
      <span className="brand-lockup-title">FETA</span>
      <span className="brand-lockup-subtitle">finance</span>
    </div>
  );
}
