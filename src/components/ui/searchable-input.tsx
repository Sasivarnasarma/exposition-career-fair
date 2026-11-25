"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEventHandler,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "./input";

type Option = { name: string };
export function SearchableInput({
  id,
  name,
  label,
  value,
  options,
  onChange,
  onBlur,
  inputRef,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  inputRef?: (element: HTMLInputElement | null) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = value.trim().toLocaleLowerCase();
  const matches = options.filter((option) =>
    option.name.toLocaleLowerCase().includes(query),
  );
  useEffect(() => {
    if (open && active >= 0)
      document
        .getElementById(listId + "-" + active)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, listId]);
  function choose(option: Option) {
    onChange(option.name);
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  }
  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-4 left-4 size-4 text-muted-foreground"
      />
      <Input
        id={id}
        name={name}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && active >= 0 && active < matches.length
            ? listId + "-" + active
            : undefined
        }
        aria-invalid={invalid}
        aria-describedby={describedBy}
        value={value}
        autoComplete="off"
        maxLength={200}
        placeholder="Search or enter the full name"
        className="pr-14 pl-11"
        ref={(element) => {
          input.current = element;
          inputRef?.(element);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onChange={(event) => {
          onChange(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((current) =>
              matches.length
                ? event.key === "ArrowDown"
                  ? Math.min(current + 1, matches.length - 1)
                  : current < 0
                    ? matches.length - 1
                    : Math.max(current - 1, 0)
                : -1,
            );
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            if (active >= 0 && matches[active]) choose(matches[active]);
            else setOpen(false);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            setActive(-1);
          } else if (event.key === "Tab") {
            setOpen(false);
            setActive(-1);
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={
          open ? "Hide institution suggestions" : "Show institution suggestions"
        }
        aria-expanded={open}
        className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) setOpen(false);
          else {
            input.current?.focus();
            setOpen(true);
          }
        }}
      >
        <ChevronDown
          aria-hidden
          className={
            "size-4 transition-transform motion-reduce:transition-none " +
            (open ? "rotate-180" : "")
          }
        />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-primary/30 bg-popover shadow-2xl shadow-black/40">
          <ul
            id={listId}
            role="listbox"
            aria-label={label + " suggestions"}
            className="max-h-64 overflow-y-auto overscroll-contain p-1.5"
          >
            {matches.map((option, index) => (
              <li key={option.name} role="presentation">
                <button
                  id={listId + "-" + index}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  tabIndex={-1}
                  className={
                    "flex min-h-12 w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-sm leading-6 transition-colors hover:bg-accent " +
                    (index === active
                      ? "bg-accent text-primary"
                      : "text-foreground")
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span className="min-w-0 flex-1">{option.name}</span>
                  {option.name.toLowerCase() === value.trim().toLowerCase() && (
                    <Check
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-primary"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p
            role="status"
            className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground"
          >
            {matches.length
              ? matches.length +
                " suggestions. You can also enter an unlisted institution."
              : "No matching institutions. You can continue with the name you typed."}
          </p>
        </div>
      )}
    </div>
  );
}
