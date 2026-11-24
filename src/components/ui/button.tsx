import type { ComponentProps } from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-[background,color,box-shadow,transform] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_18px_#00000020]",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/60 hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
      },
      size: {
        default: "",
        sm: "min-h-11 px-4 py-2 text-sm",
        lg: "min-h-13 px-8 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function buttonVariants(
  options: VariantProps<typeof buttonStyles> & { className?: string } = {},
) {
  return cn(
    buttonStyles({ variant: options.variant, size: options.size }),
    options.className,
  );
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonStyles> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
