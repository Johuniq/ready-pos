import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

/**
 * Customer Display Setup Guide Modal
 * 
 * Shows first-time setup instructions for the customer display.
 * Remembers if user has seen it via localStorage.
 */
export function CustomerDisplayGuide({ open, onOpenChange }) {
  const steps = [
    {
      icon: <Monitor className="w-8 h-8 text-blue-500" />,
      title: "Connect Second Monitor",
      description:
        "Ensure you have a second monitor connected and extended (not mirrored). Position it facing the customer.",
    },
    {
      icon: <ExternalLink className="w-8 h-8 text-green-500" />,
      title: "Allow Pop-ups",
      description:
        "When you click OK, a new window will open. Make sure your browser allows pop-ups for this site.",
    },
    {
      icon: <Monitor className="w-8 h-8 text-purple-500" />,
      title: "Position Window",
      description:
        "Drag the customer display window to your second monitor. Press F11 for fullscreen. The browser remembers this position.",
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-emerald-500" />,
      title: "You're Ready!",
      description:
        "Items added to cart will appear instantly on the customer display. Keep the window open during business hours.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-xl select-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="bg-blue-500/10 text-blue-500 p-2 rounded-lg">
              <Monitor className="w-6 h-6" />
            </div>
            Customer Display Setup Guide
          </DialogTitle>
          <DialogDescription className="text-sm">
            Follow these steps to set up your second screen customer display
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="shrink-0 flex items-start pt-1">{step.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm mb-1">
                  {index + 1}. {step.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground font-medium mb-1">
                Important Notes
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Both windows must stay on the same browser</li>
                <li>Don't manually refresh the customer display</li>
                <li>Configure messages in Settings → Customer Display</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              // Mark as seen
              localStorage.setItem("readypos_cfd_guide_seen", "true");
              onOpenChange(false);
              // Parent component will handle opening the actual display
            }}
            className="gap-2">
            <Monitor className="w-4 h-4" />
            Got It - Open Display
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to check if user has seen the guide
 */
export function useCustomerDisplayGuide() {
  const [hasSeenGuide, setHasSeenGuide] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("readypos_cfd_guide_seen");
    setHasSeenGuide(seen === "true");
  }, []);

  const checkAndShowGuide = () => {
    if (!hasSeenGuide) {
      setShowGuide(true);
      return true; // Indicates guide is being shown
    }
    return false; // User has seen it, proceed directly
  };

  return {
    showGuide,
    setShowGuide,
    checkAndShowGuide,
    hasSeenGuide,
  };
}
