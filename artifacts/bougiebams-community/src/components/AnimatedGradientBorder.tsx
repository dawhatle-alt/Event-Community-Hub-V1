import * as React from "react";
import { cn } from "@/lib/utils";

export interface AnimatedGradientBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function AnimatedGradientBorder({ className, children, ...props }: AnimatedGradientBorderProps) {
  return (
    <div className={cn("relative gradient-border rounded-xl", className)} {...props}>
      {children}
    </div>
  );
}
