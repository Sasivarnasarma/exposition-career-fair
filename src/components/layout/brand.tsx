import { site } from "@/config/site";
import Image from "next/image";
import Link from "next/link";
import { routes } from "@/config/routes";

export function Brand() {
  return (
    <Link
      href={routes.home}
      aria-label="Exposition Career Fair home"
      className="inline-flex shrink-0 flex-col gap-1 rounded-lg"
    >
      <Image
        src="/images/brand/exposition-issue-22.svg"
        width={178}
        height={39}
        alt="Exposition Issue 22"
        priority
        className="h-auto w-32 sm:w-44"
      />
      <span
        aria-hidden="true"
        className="text-[11px] font-medium tracking-wide text-muted-foreground"
      >
        Career Fair {site.year}
      </span>
    </Link>
  );
}
