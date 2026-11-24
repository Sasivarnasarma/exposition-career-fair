"use client";
import { useId, type ComponentProps } from "react";
import { useFormContext, type FieldPath } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { RegistrationDraft } from "@/shared/registration-form";
export function useFieldMessage(name: string) {
  const {
    formState: { errors },
  } = useFormContext<RegistrationDraft>();
  const value = name
    .split(".")
    .reduce<unknown>(
      (entry, key) =>
        typeof entry === "object" && entry
          ? (entry as Record<string, unknown>)[key]
          : undefined,
      errors,
    );
  return value && typeof value === "object" && "message" in value
    ? String(value.message)
    : undefined;
}
export function Field({
  name,
  label,
  hint,
  optional,
  ...props
}: Omit<ComponentProps<typeof Input>, "name"> & {
  name: FieldPath<RegistrationDraft>;
  label: string;
  hint?: string;
  optional?: boolean;
}) {
  const { register } = useFormContext<RegistrationDraft>();
  const message = useFieldMessage(name);
  return (
    <div className="grid min-w-0 gap-3">
      <label
        htmlFor={`field-${name}`}
        className="block text-sm leading-6 font-medium"
      >
        {label}
        {optional && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Optional
          </span>
        )}
      </label>
      <Input
        id={`field-${name}`}
        {...register(name)}
        {...props}
        aria-invalid={!!message}
        aria-describedby={
          [hint && `hint-${name}`, message && `error-${name}`]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {hint && (
        <p
          id={`hint-${name}`}
          className="text-xs leading-5 text-muted-foreground"
        >
          {hint}
        </p>
      )}
      {message && (
        <p id={`error-${name}`} className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
export function SelectField({
  name,
  label,
  options,
  placeholder = "Select an option",
}: {
  name: FieldPath<RegistrationDraft>;
  label: string;
  options: { id: string; label: string }[];
  placeholder?: string;
}) {
  const { register } = useFormContext<RegistrationDraft>();
  const message = useFieldMessage(name);
  return (
    <div className="grid min-w-0 gap-3">
      <label
        htmlFor={`field-${name}`}
        className="block text-sm leading-6 font-medium"
      >
        {label}
      </label>
      <select
        id={`field-${name}`}
        {...register(name)}
        aria-invalid={!!message}
        aria-describedby={message ? `error-${name}` : undefined}
        className="min-h-12 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-3 text-base aria-invalid:border-destructive"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {message && (
        <p id={`error-${name}`} className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
export function AcademicField({
  name,
  idName,
  label,
  options,
  onParentChange,
  suggestions = true,
}: {
  name: FieldPath<RegistrationDraft>;
  idName: FieldPath<RegistrationDraft>;
  label: string;
  options: { id: string; name: string }[];
  onParentChange?: () => void;
  suggestions?: boolean;
}) {
  const list = useId();
  const { register, setValue } = useFormContext<RegistrationDraft>();
  const field = register(name);
  const message = useFieldMessage(name);
  return (
    <div className="grid min-w-0 gap-3">
      <label
        htmlFor={`field-${name}`}
        className="block text-sm leading-6 font-medium"
      >
        {label}
      </label>
      <Input
        {...field}
        id={`field-${name}`}
        list={suggestions ? list : undefined}
        autoComplete="off"
        maxLength={200}
        aria-invalid={!!message}
        aria-describedby={
          [suggestions && `hint-${name}`, message && `error-${name}`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onChange={(event) => {
          void field.onChange(event);
          const match = options.find(
            (o) =>
              o.name.trim().toLowerCase() ===
              event.target.value.trim().toLowerCase(),
          );
          setValue(idName, match?.id || "", { shouldDirty: true });
          onParentChange?.();
        }}
      />
      {suggestions && (
        <>
          <datalist id={list}>
            {options.map((option) => (
              <option key={option.name} value={option.name} />
            ))}
          </datalist>
          <p
            id={`hint-${name}`}
            className="text-xs leading-5 text-muted-foreground"
          >
            Choose a suggestion or type your institution&apos;s full name if it
            is not listed.
          </p>
        </>
      )}
      {message && (
        <p id={`error-${name}`} className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
export function GroupError({ name }: { name: string }) {
  const message = useFieldMessage(name);
  return message ? (
    <p id={`error-${name}`} className="mt-3 text-sm text-destructive">
      {message}
    </p>
  ) : null;
}
