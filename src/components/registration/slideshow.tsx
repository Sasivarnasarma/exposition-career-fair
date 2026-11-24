"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pause,
  Play,
} from "lucide-react";
import { previousFairPhotos } from "@/config/previous-fair-photos";

export function RegistrationSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const playing = available && !paused && reducedMotion === false;
  const photo = previousFairPhotos[index];

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const update = () => setAvailable(desktop.matches && !document.hidden);
    update();
    desktop.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      desktop.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (!playing || hovered) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % previousFairPhotos.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [playing, hovered]);

  function move(direction: number) {
    setPaused(true);
    setIndex(
      (value) =>
        (value + direction + previousFairPhotos.length) %
        previousFairPhotos.length,
    );
  }
  const controls =
    "inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary hover:text-primary";
  return (
    <section
      aria-label="Previous Career Fair photographs"
      aria-roledescription="carousel"
      className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-playback-control]"))
          setPaused(true);
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={photo.image.src}
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.45 }}
            className="absolute inset-0"
          >
            <Image
              src={photo.image}
              alt={photo.alt}
              fill
              sizes="260px"
              quality={90}
              className="object-cover"
              style={{ objectPosition: photo.position }}
              onLoad={() => setLoaded(photo.image.src)}
              onError={() => setFailed(photo.image.src)}
            />
          </motion.div>
        </AnimatePresence>
        {failed === photo.image.src ? (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center bg-background/90 p-4 text-center text-xs leading-6 text-muted-foreground"
          >
            Photo unavailable. Try the next photograph.
          </p>
        ) : loaded !== photo.image.src ? (
          <span
            role="status"
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <LoaderCircle
              aria-hidden
              className="size-5 text-primary motion-safe:animate-spin"
            />
            <span className="sr-only">Loading photograph</span>
          </span>
        ) : null}
      </div>
      <div className="p-4 pb-3">
        <p className="text-sm font-medium">
          One conversation. A new direction.
        </p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          Moments from the previous Career Fair.
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous registration photograph"
              className={controls}
              onClick={() => move(-1)}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <span
              className="inline-flex min-w-12 items-center justify-center text-xs text-muted-foreground tabular-nums"
              aria-label={`Photograph ${index + 1} of ${previousFairPhotos.length}`}
            >
              {index + 1} / {previousFairPhotos.length}
            </span>
            <button
              type="button"
              aria-label="Next registration photograph"
              className={controls}
              onClick={() => move(1)}
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
          {reducedMotion !== true && (
            <button
              type="button"
              data-playback-control
              aria-label={
                paused
                  ? "Play registration slideshow"
                  : "Pause registration slideshow"
              }
              className={controls}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? (
                <Play aria-hidden className="size-4" />
              ) : (
                <Pause aria-hidden className="size-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
