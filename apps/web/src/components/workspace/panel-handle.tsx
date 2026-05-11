"use client";

import { Separator } from "react-resizable-panels";
import { cn } from "@/lib/utils";

interface PanelHandleProps {
  direction: "horizontal" | "vertical";
  className?: string;
}

export function PanelHandle({ direction, className }: PanelHandleProps) {
  const isHorizontal = direction === "horizontal";

  return (
    <Separator
      className={cn(
        "group relative flex items-center justify-center transition-colors",
        isHorizontal
          ? "h-[6px] cursor-row-resize hover:bg-[hsl(var(--primary)/.15)]"
          : "w-[6px] cursor-col-resize hover:bg-[hsl(var(--primary)/.15)]",
        "bg-[hsl(var(--border)/.5)]",
        className
      )}
    >
      <div className={cn(
        "rounded-full bg-[hsl(var(--muted-foreground)/.3)] group-hover:bg-[hsl(var(--primary)/.6)] transition-colors",
        isHorizontal ? "h-1 w-8" : "h-8 w-1"
      )} />
    </Separator>
  );
}
