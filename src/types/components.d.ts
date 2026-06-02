// Type declarations for UI components
import * as React from "react";

export interface ComponentProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  children?: React.ReactNode;
}

// Card components
declare module "@/components/ui/card" {
  export const Card: React.ForwardRefExoticComponent<ComponentProps>;
  export const CardHeader: React.ForwardRefExoticComponent<ComponentProps>;
  export const CardTitle: React.ForwardRefExoticComponent<ComponentProps>;
  export const CardDescription: React.ForwardRefExoticComponent<ComponentProps>;
  export const CardContent: React.ForwardRefExoticComponent<ComponentProps>;
  export const CardFooter: React.ForwardRefExoticComponent<ComponentProps>;
}

// Badge component
declare module "@/components/ui/badge" {
  export interface BadgeProps extends ComponentProps {
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
  export const Badge: React.FC<BadgeProps>;
}

// Button component
declare module "@/components/ui/button" {
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
    /** @default "button" */
    type?: "button" | "submit" | "reset";
  }
  export const Button: React.ForwardRefExoticComponent<ButtonProps>;
}

// Input component
declare module "@/components/ui/input" {
  export const Input: React.ForwardRefExoticComponent<
    React.InputHTMLAttributes<HTMLInputElement>
  >;
}

// Textarea component
declare module "@/components/ui/textarea" {
  export const Textarea: React.ForwardRefExoticComponent<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
  >;
}

// Label component
declare module "@/components/ui/label" {
  export const Label: React.ForwardRefExoticComponent<ComponentProps>;
}

// Switch component
declare module "@/components/ui/switch" {
  export const Switch: React.ForwardRefExoticComponent<
    ComponentProps & {
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
    }
  >;
}

// Separator component
declare module "@/components/ui/separator" {
  export const Separator: React.ForwardRefExoticComponent<ComponentProps>;
}

// Table components
declare module "@/components/ui/table" {
  export const Table: React.ForwardRefExoticComponent<ComponentProps>;
  export const TableHeader: React.ForwardRefExoticComponent<ComponentProps>;
  export const TableBody: React.ForwardRefExoticComponent<ComponentProps>;
  export const TableRow: React.ForwardRefExoticComponent<ComponentProps>;
  export const TableHead: React.ForwardRefExoticComponent<ComponentProps>;
  export const TableCell: React.ForwardRefExoticComponent<ComponentProps>;
}

// Tabs components
declare module "@/components/ui/tabs" {
  export const Tabs: React.FC<
    ComponentProps & {
      value?: string;
      onValueChange?: (value: string) => void;
      defaultValue?: string;
    }
  >;
  export const TabsList: React.ForwardRefExoticComponent<ComponentProps>;
  export const TabsTrigger: React.ForwardRefExoticComponent<
    ComponentProps & { value: string }
  >;
  export const TabsContent: React.ForwardRefExoticComponent<
    ComponentProps & { value: string }
  >;
}

// Select components
declare module "@/components/ui/select" {
  export const Select: React.FC<
    ComponentProps & { value?: string; onValueChange?: (value: string) => void }
  >;
  export const SelectTrigger: React.ForwardRefExoticComponent<ComponentProps>;
  export const SelectValue: React.FC<ComponentProps & { placeholder?: string }>;
  export const SelectContent: React.ForwardRefExoticComponent<ComponentProps>;
  export const SelectItem: React.ForwardRefExoticComponent<
    ComponentProps & { value: string }
  >;
  export const SelectGroup: React.FC<ComponentProps>;
  export const SelectLabel: React.ForwardRefExoticComponent<ComponentProps>;
}

// Dropdown Menu components
declare module "@/components/ui/dropdown-menu" {
  export const DropdownMenu: React.FC<ComponentProps>;
  export const DropdownMenuTrigger: React.ForwardRefExoticComponent<ComponentProps>;
  export const DropdownMenuContent: React.ForwardRefExoticComponent<
    ComponentProps & { align?: "start" | "center" | "end"; sideOffset?: number }
  >;
  export const DropdownMenuItem: React.ForwardRefExoticComponent<ComponentProps>;
  export const DropdownMenuLabel: React.ForwardRefExoticComponent<ComponentProps>;
  export const DropdownMenuSeparator: React.ForwardRefExoticComponent<ComponentProps>;
  export const DropdownMenuGroup: React.FC<ComponentProps>;
  export const DropdownMenuSub: React.FC<ComponentProps>;
  export const DropdownMenuSubTrigger: React.ForwardRefExoticComponent<ComponentProps>;
  export const DropdownMenuSubContent: React.ForwardRefExoticComponent<ComponentProps>;
  export const DropdownMenuCheckboxItem: React.ForwardRefExoticComponent<
    ComponentProps & { checked?: boolean }
  >;
  export const DropdownMenuRadioItem: React.ForwardRefExoticComponent<ComponentProps>;
  export const DropdownMenuRadioGroup: React.FC<ComponentProps>;
  export const DropdownMenuShortcut: React.FC<ComponentProps>;
}

// Dialog components
declare module "@/components/ui/dialog" {
  import * as DialogPrimitive from "@radix-ui/react-dialog";
  
  export const Dialog: typeof DialogPrimitive.Root;
  export const DialogTrigger: typeof DialogPrimitive.Trigger;
  export const DialogPortal: typeof DialogPrimitive.Portal;
  export const DialogClose: typeof DialogPrimitive.Close;
  export const DialogOverlay: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
  >;
  export const DialogContent: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
  >;
  export const DialogHeader: React.FC<ComponentProps>;
  export const DialogFooter: React.FC<ComponentProps>;
  export const DialogTitle: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
  >;
  export const DialogDescription: React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
  >;
}

// Sheet components
declare module "@/components/ui/sheet" {
  export const Sheet: React.FC<ComponentProps>;
  export const SheetTrigger: React.ForwardRefExoticComponent<ComponentProps>;
  export const SheetContent: React.ForwardRefExoticComponent<
    ComponentProps & { side?: "top" | "right" | "bottom" | "left" }
  >;
  export const SheetHeader: React.FC<ComponentProps>;
  export const SheetFooter: React.FC<ComponentProps>;
  export const SheetTitle: React.ForwardRefExoticComponent<ComponentProps>;
  export const SheetDescription: React.ForwardRefExoticComponent<ComponentProps>;
  export const SheetClose: React.ForwardRefExoticComponent<ComponentProps>;
}

// Wildcard fallback for any other UI components
declare module "@/components/ui/*" {
  const component: React.ComponentType<any>;
  export default component;
}
