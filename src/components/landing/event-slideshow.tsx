"use client";

import {
  type ComponentProps,
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
  Expand,
  LoaderCircle,
} from "lucide-react";
import conversation from "@/assets/images/previous-fair-conversation.webp";
import interview from "@/assets/images/previous-fair-interview.webp";
import information from "@/assets/images/previous-fair-information.webp";

import team from "@/assets/images/previous-fair-team.webp";
import briefing from "@/assets/images/previous-fair-briefing.webp";
import audience from "@/assets/images/previous-fair-audience.webp";
import handshake from "@/assets/images/previous-fair-handshake.webp";
import participants from "@/assets/images/previous-fair-participants.webp";
import candidates from "@/assets/images/previous-fair-candidates.webp";
import eventSpace from "@/assets/images/previous-fair-event-space.webp";

const slides = [
  {
    image: conversation,
    alt: "A candidate speaking with representatives at the previous Exposition Career Fair",
    position: "60% center",
  },
  {
    image: interview,
    alt: "A candidate in an interview with two representatives at the previous Career Fair",
    position: "55% center",
  },
  {
    image: information,
    alt: "Students reading career information at the previous Career Fair",
    position: "55% center",
  },
  {
    image: team,
    alt: "Participants standing together at the previous Exposition Career Fair",
    position: "50% center",
  },
  {
    image: briefing,
    alt: "A representative addressing students at the previous Career Fair",
    position: "50% center",
  },
  {
    image: audience,
    alt: "Students listening and reviewing information at the previous Career Fair",
    position: "50% center",
  },
  {
    image: handshake,
    alt: "Two participants shaking hands at the previous Career Fair",
    position: "50% center",
  },
  {
    image: participants,
    alt: "Two participants posing with a photo frame at the previous Career Fair",
    position: "50% 35%",
  },
  {
    image: candidates,
    alt: "Seated students reviewing career information at the previous Career Fair",
    position: "50% center",
  },
  {
    image: eventSpace,
    alt: "A display of organisation banners in the previous Career Fair event space",
    position: "50% center",
  },
];

function LoadingPhoto({
  alt,
  onLoad,
  onError,
  ...props
}: ComponentProps<typeof Image>) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  return (
    <>
      <Image
        {...props}
        alt={alt}
        onLoad={(event) => {
          setStatus("ready");
          onLoad?.(event);
        }}
        onError={(event) => {
          setStatus("error");
          onError?.(event);
        }}
      />
      {status === "loading" && (
        <span
          role="status"
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/20"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-6 animate-spin text-primary motion-reduce:animate-none"
          />
          <span className="sr-only">Loading photograph</span>
        </span>
      )}
      {status === "error" && (
        <span
          role="status"
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/80 p-4 text-center text-xs text-white"
        >
          Photo unavailable. Please try another photograph.
        </span>
      )}
    </>
  );
}
type GalleryState = {
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  openViewer: () => void;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
};
const GalleryContext = createContext<GalleryState | null>(null);

export function EventGallery({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const slide = slides[index];
  function openViewer() {
    setPaused(true);
    setViewerOpen(true);
  }
  function moveViewer(direction: number) {
    setIndex(
      (current) => (current + direction + slides.length) % slides.length,
    );
  }
  return (
    <GalleryContext.Provider
      value={{ index, setIndex, paused, setPaused, openViewer }}
    >
      <Dialog.Root open={viewerOpen} onOpenChange={setViewerOpen}>
        {children}
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/95" />
          <Dialog.Content
            className="fixed inset-0 z-50 flex flex-col bg-black text-white outline-none"
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("button")) return;
              const image = target.closest("img");
              if (image) {
                // object-contain leaves clickable letterbox space inside the image element.
                const rect = image.getBoundingClientRect();
                const scale = Math.min(
                  rect.width / slide.image.width,
                  rect.height / slide.image.height,
                );
                const width = slide.image.width * scale;
                const height = slide.image.height * scale;
                const left = rect.left + (rect.width - width) / 2;
                const top = rect.top + (rect.height - height) / 2;
                if (
                  event.clientX >= left &&
                  event.clientX <= left + width &&
                  event.clientY >= top &&
                  event.clientY <= top + height
                )
                  return;
              }
              setViewerOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveViewer(-1);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                moveViewer(1);
              }
            }}
          >
            <Dialog.Title className="sr-only">
              Previous Career Fair photo viewer
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Use the arrow buttons or left and right arrow keys to browse.
              Press Escape to close.
            </Dialog.Description>
            <div className="flex shrink-0 items-center justify-between gap-4 px-4 pt-4 sm:px-8">
              <p className="text-xs text-white/70">
                Previous Career Fair ·{" "}
                <span className="tabular-nums">
                  {index + 1} / {slides.length}
                </span>
              </p>
              <Dialog.Close
                aria-label="Close full-screen photo"
                className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X aria-hidden="true" className="size-5" />
              </Dialog.Close>
            </div>
            <div className="relative mx-3 my-3 min-h-0 flex-1 sm:mx-16">
              <LoadingPhoto
                key={slide.image.src}
                src={slide.image}
                alt={slide.alt}
                fill
                quality={90}
                sizes="100vw"
                className="object-contain"
              />
              <button
                type="button"
                aria-label="Previous full-screen photograph"
                onClick={() => moveViewer(-1)}
                className="absolute top-1/2 left-0 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 hover:bg-white/20"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next full-screen photograph"
                onClick={() => moveViewer(1)}
                className="absolute top-1/2 right-0 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 hover:bg-white/20"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
            </div>
            <p
              aria-live="polite"
              className="shrink-0 px-6 pb-6 text-center text-xs leading-6 text-white/75"
            >
              {slide.alt}
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </GalleryContext.Provider>
  );
}
function useGallery() {
  const gallery = useContext(GalleryContext);
  if (!gallery) throw new Error("Gallery controls require EventGallery");
  return gallery;
}

export function NextPhotoPreview() {
  const { index, setIndex, setPaused } = useGallery();
  const nextIndex = (index + 1) % slides.length;
  const next = slides[nextIndex];
  return (
    <button
      type="button"
      aria-label={`Show next photograph: ${next.alt}`}
      onFocus={() => setPaused(true)}
      onClick={() => {
        setPaused(true);
        setIndex(nextIndex);
      }}
      className="group/preview block w-full overflow-hidden rounded-2xl border-[5px] border-background bg-card text-left shadow-xl shadow-black/40 transition-colors hover:border-primary focus-visible:outline-primary"
    >
      <span className="relative block aspect-[1.25/1] overflow-hidden">
        <LoadingPhoto
          key={next.image.src}
          src={next.image}
          alt=""
          fill
          quality={90}
          sizes="(max-width: 1023px) 52vw, 320px"
          style={{ objectPosition: next.position }}
          className="object-cover transition-transform duration-300 group-hover/preview:scale-105 motion-reduce:transform-none"
        />
        <span className="absolute right-2 bottom-2 inline-flex size-7 items-center justify-center rounded-full bg-black/80 text-primary">
          <ChevronRight aria-hidden="true" className="size-3" />
        </span>
      </span>
    </button>
  );
}
const subscribeToHydration = () => () => {};

export function EventSlideshow() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const { index, setIndex, paused, setPaused, openViewer } = useGallery();
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reducedMotion = useReducedMotion();
  const canPlay = !paused && hydrated && reducedMotion === false;

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!canPlay || hovered || hidden) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [canPlay, hovered, hidden, setIndex]);

  function move(direction: number) {
    setPaused(true);
    setIndex(
      (current) => (current + direction + slides.length) % slides.length,
    );
  }

  const slide = slides[index];
  const controlClass =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-primary";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Previous Career Fair photographs"
      className="absolute inset-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target as HTMLElement).closest("[data-playback-control]"))
          setPaused(true);
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="View current photograph full screen"
          onClick={openViewer}
          className="absolute inset-0 z-[1] cursor-zoom-in rounded-[1.6rem] focus-visible:outline-primary"
        >
          <span className="absolute right-3 bottom-3 inline-flex size-8 items-center justify-center rounded-full bg-black/70 text-white/80">
            <Expand aria-hidden="true" className="size-3" />
          </span>
        </button>
      </Dialog.Trigger>
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.6 }}
        >
          <LoadingPhoto
            src={slide.image}
            alt={slide.alt}
            fill
            preload={index === 0}
            loading={index === 0 ? undefined : "eager"}
            sizes="(max-width: 639px) calc(160vw - 83px), (max-width: 1023px) calc(135vw - 135px), (max-width: 1400px) 72vw, 930px"
            quality={90}
            onLoad={() => setLoadedSource(slide.image.src)}
            style={{ objectPosition: slide.position }}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none"
          />
        </motion.div>
      </AnimatePresence>
      {loadedSource === slide.image.src && (
        <Image
          src={slides[(index + 1) % slides.length].image}
          alt=""
          aria-hidden="true"
          fill
          quality={90}
          loading="eager"
          sizes="(max-width: 639px) calc(160vw - 83px), (max-width: 1023px) calc(135vw - 135px), (max-width: 1400px) 72vw, 930px"
          className="pointer-events-none opacity-0"
        />
      )}
      <div className="absolute top-4 left-4 z-10 flex items-center rounded-full border border-white/15 bg-black/80 backdrop-blur-md">
        <button
          type="button"
          aria-label="Previous photograph"
          className={controlClass}
          onClick={() => move(-1)}
        >
          <ChevronLeft aria-hidden="true" className="size-3" />
        </button>
        <span
          className="min-w-6 text-center text-[10px] text-white tabular-nums"
          aria-live={canPlay ? "off" : "polite"}
          aria-atomic="true"
        >
          <span className="sr-only">Photograph </span>
          {index + 1} / {slides.length}
        </span>
        <button
          type="button"
          aria-label="Next photograph"
          className={controlClass}
          onClick={() => move(1)}
        >
          <ChevronRight aria-hidden="true" className="size-3" />
        </button>
        <button
          type="button"
          data-playback-control
          aria-label={canPlay ? "Pause slideshow" : "Play slideshow"}
          className={controlClass}
          onClick={() => setPaused(canPlay)}
          disabled={hydrated && !!reducedMotion}
          title={
            hydrated && reducedMotion
              ? "Automatic playback is disabled for reduced motion"
              : undefined
          }
        >
          {canPlay ? (
            <Pause aria-hidden="true" className="size-3" />
          ) : (
            <Play aria-hidden="true" className="size-3" />
          )}
        </button>
      </div>
    </div>
  );
}
