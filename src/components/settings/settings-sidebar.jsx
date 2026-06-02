import { cn } from "@/lib/utils";
import { ChevronRight, Menu } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * Settings sidebar navigation component with icon and description support
 * @param {{ items: Array<{id: string; label: string; description?: string; icon: any}>; activeId: string; onSelect: (id: string) => void; className?: string }} props
 */
export function SettingsSidebar({ items, activeId, onSelect, className }) {
  const activeItem = items.find((item) => item.id === activeId);

  return (
    <>
      {/* Mobile Dropdown */}
      <div className="lg:hidden mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-12 px-4">
              <div className="flex items-center gap-3">
                {activeItem?.icon && (
                  <activeItem.icon className="h-4 w-4 text-primary" />
                )}
                <span className="font-semibold">{activeItem?.label}</span>
              </div>
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-md">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;

              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer",
                    isActive && "bg-primary/10"
                  )}>
                  <div
                    className={cn(
                      "flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Sidebar */}
      <nav
        className={cn(
          "hidden lg:flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card shadow-sm p-3",
          "lg:sticky lg:top-4 lg:h-fit lg:w-72",
          className
        )}>
        <div className="px-3 py-2 mb-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Settings
          </h2>
        </div>

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "group flex items-start gap-3 px-3 py-3 rounded-lg transition-all text-left relative",
                "hover:scale-[1.02] active:scale-[0.98]",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "hover:bg-muted/60 text-foreground"
              )}>
              {/* Icon Container */}
              <div
                className={cn(
                  "flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                  isActive
                    ? "bg-primary-foreground/20"
                    : "bg-primary/10 text-primary group-hover:bg-primary/15"
                )}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm font-bold transition-colors",
                      isActive ? "text-primary-foreground" : "text-foreground"
                    )}>
                    {item.label}
                  </p>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-all flex-shrink-0",
                      isActive
                        ? "text-primary-foreground opacity-100 translate-x-0"
                        : "text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                    )}
                  />
                </div>
                {item.description && (
                  <p
                    className={cn(
                      "text-xs leading-snug mt-1 transition-colors",
                      isActive
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground group-hover:text-muted-foreground/90"
                    )}>
                    {item.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </>
  );
}
