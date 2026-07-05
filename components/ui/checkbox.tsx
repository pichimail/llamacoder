import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "defaultChecked" | "onChange"> {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onCheckedChange, disabled, id, ...props }, ref) => {
    const isChecked = checked === true;
    const isIndeterminate = checked === "indeterminate";

    return (
      <span
        className={cn(
          "relative inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isChecked || isIndeterminate ? "bg-primary text-primary-foreground" : "bg-background",
          className,
        )}
        aria-hidden="true"
      >
        <input
          {...props}
          id={id}
          ref={ref}
          type="checkbox"
          checked={isChecked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          aria-checked={isIndeterminate ? "mixed" : isChecked}
          onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
          className="absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        {isIndeterminate ? <span className="h-0.5 w-2 rounded bg-current" /> : null}
        {isChecked ? <Check className="size-3" aria-hidden="true" /> : null}
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
