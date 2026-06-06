import { useRealtime } from "@/admin/hooks/useRealtime";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Activity } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Real-time Connection Status Indicator
 *
 * Shows current connection status with visual feedback:
 * - Green "Live" = WebSocket connected (instant updates)
 * - Yellow "Polling" = Fallback mode (5-second updates)
 * - Red "Offline" = No connection
 */

export function RealtimeIndicator({ className = "" }) {
  const { isConnected, isFallback } = useRealtime({
    showNotifications: false,
  });

  const getStatusConfig = () => {
    if (!isConnected) {
      return {
        label: "Offline",
        variant: "destructive",
        icon: WifiOff,
        description: "No real-time connection",
        color: "text-rose-500",
      };
    }

    if (isFallback) {
      return {
        label: "Polling",
        variant: "secondary",
        icon: Activity,
        description: "Updates every 5 seconds",
        color: "text-amber-500",
      };
    }

    return {
      label: "Live",
      variant: "default",
      icon: Wifi,
      description: "Instant updates (<100ms)",
      color: "text-emerald-500",
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={`gap-1.5 ${className}`}>
            <Icon className="w-3 h-3" />
            <span className="text-xs font-semibold">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold">Real-time Sync</div>
            <div className="text-muted-foreground">{config.description}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
