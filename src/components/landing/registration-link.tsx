import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

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
      {site.registrationOpen
        ? "Pre-Register Now"
        : compact
          ? "Pre-registration"
          : "Explore pre-registration"}
      <ArrowUpRight aria-hidden="true" />
    </Link>
  );
}
