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
        className="h-auto w-36 sm:w-44"
      />
      <span
        aria-hidden="true"
        className="text-[9px] font-medium tracking-[0.3em] text-muted-foreground uppercase"
      >
        Career Fair · {site.year}
      </span>
    </Link>
  );
}
