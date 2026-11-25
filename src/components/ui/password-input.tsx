"use client";
import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export function PasswordInput({
  label = "password",
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & { label?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative min-w-0">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-14", className)}
      />
      <button
        type="button"
        aria-label={(visible ? "Hide " : "Show ") + label}
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? (
          <EyeOff aria-hidden className="size-4" />
        ) : (
          <Eye aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}
