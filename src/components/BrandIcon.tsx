import faviconImg from "/favicon.png";
import { cn } from "@/lib/utils";

interface BrandIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export default function BrandIcon({ size = "md", className }: BrandIconProps) {
  return (
    <img
      src={faviconImg}
      alt="DispatchBoxAI"
      className={cn(sizeMap[size], "rounded-lg shrink-0 object-contain", className)}
    />
  );
}
