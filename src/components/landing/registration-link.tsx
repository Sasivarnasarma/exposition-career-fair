import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/config/routes";

export function RegistrationLink({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={routes.register}
      className={buttonVariants({ size: compact ? "sm" : "lg", className })}
    >
      Register
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
}
