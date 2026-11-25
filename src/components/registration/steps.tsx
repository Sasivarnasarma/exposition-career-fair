"use client";
import { PrivacyNoticeTrigger } from "@/components/privacy/notice-dialog";
import { site } from "@/config/site";
import { universitySuggestions } from "@/config/university-suggestions";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ChevronDown, HeartHandshake } from "lucide-react";
import { Field, SelectField, AcademicField, GroupError } from "./fields";
import type {
  RegistrationDraft,
  RegistrationOptions,
} from "@/shared/registration-form";
export function PersonalStep({ options }: { options: RegistrationOptions }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field
          name="personal.fullName"
          label="Full name"
          autoComplete="name"
          maxLength={200}
        />
      </div>
      <Field
        name="personal.email"
        label="Email address"
        type="email"
        autoComplete="email"
        maxLength={254}
      />
      <Field
        name="personal.phone"
        label="Contact number"
        type="tel"
        autoComplete="tel"
        maxLength={30}
      />
      <div className="sm:col-span-2">
        <SelectField
          name="personal.districtId"
          label="District"
          options={options.districts}
        />
      </div>
      <Field
        name="personal.linkedInUrl"
        label="LinkedIn profile"
        type="url"
        optional
        placeholder="https://linkedin.com/in/..."
        maxLength={2048}
      />
      <Field
        name="personal.portfolioUrl"
        label="GitHub or portfolio"
        type="url"
        optional
        placeholder="https://..."
        maxLength={2048}
      />
    </div>
  );
}
export function AcademicStep({ options }: { options: RegistrationOptions }) {
  const { control, setValue } = useFormContext<RegistrationDraft>();
  const year = useWatch({ control, name: "academic.academicYearId" });
  const universities = universitySuggestions.map((name) => ({
    name,
    id:
      options.institutions.find(
        (option) => option.name.toLowerCase() === name.toLowerCase(),
      )?.id || "",
  }));
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <AcademicField
          name="academic.institutionName"
          idName="academic.institutionId"
          label="University or institution"
          options={universities}
          onParentChange={() => {
            for (const path of [
              "academic.facultyId",
              "academic.facultyName",
              "academic.degreeProgrammeId",
              "academic.degreeName",
            ] as const)
              setValue(path, "", { shouldDirty: true });
          }}
        />
      </div>
      <AcademicField
        name="academic.facultyName"
        idName="academic.facultyId"
        label="Faculty or school"
        options={[]}
        suggestions={false}
        onParentChange={() => {
          setValue("academic.degreeProgrammeId", "", { shouldDirty: true });
          setValue("academic.degreeName", "", { shouldDirty: true });
        }}
      />
      <AcademicField
        name="academic.degreeName"
        idName="academic.degreeProgrammeId"
        label="Degree programme"
        options={[]}
        suggestions={false}
      />
      <div className="sm:col-span-2">
        <Field
          name="academic.specialization"
          label="Specialization"
          optional
          maxLength={200}
        />
      </div>
      <SelectField
        name="academic.academicYearId"
        label="Current academic status"
        options={options.academicYears}
      />
      <Field
        name="academic.graduationYear"
        label={
          year === "year-graduate"
            ? "Graduation year"
            : "Expected graduation year"
        }
        type="number"
        inputMode="numeric"
        min={1950}
        max={2200}
        hint={
          year === "year-graduate"
            ? "Enter the year you completed your degree."
            : undefined
        }
      />
      <Field
        name="academic.gpa"
        label="Current or final GPA"
        optional
        type="number"
        inputMode="decimal"
        min={0}
        max={99}
        step="0.01"
        hint="Leave this blank if you prefer not to provide it."
      />
    </div>
  );
}
export function PreferencesStep({ options }: { options: RegistrationOptions }) {
  const { control, setValue } = useFormContext<RegistrationDraft>();
  const [selected, first, opportunities] = useWatch({
    control,
    name: [
      "preferences.positionIds",
      "preferences.firstPreferencePositionId",
      "preferences.opportunityIds",
    ],
  });
  const [expanded, setExpanded] = useState<string | null>(
    options.categories.find((category) => category.positions.length)?.id ??
      null,
  );
  const [notice, setNotice] = useState("");
  const all = options.categories.flatMap((c) => c.positions);
  function updatePositions(next: string[]) {
    setValue("preferences.positionIds", next, { shouldDirty: true });
    if (!next.includes(first)) {
      setValue("preferences.firstPreferencePositionId", "", {
        shouldDirty: true,
      });
      if (first)
        setNotice(
          "Your first preference was removed. Choose another from your selected positions.",
        );
    }
  }
  function togglePosition(id: string) {
    updatePositions(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }
  function changeOtherPosition(value: string) {
    setValue("preferences.otherPosition", value, { shouldDirty: true });
    const withoutOther = selected.filter((id) => id !== "other");
    updatePositions(value.trim() ? [...withoutOther, "other"] : withoutOther);
  }
  return (
    <div className="space-y-8">
      <fieldset
        id="field-preferences.positionIds"
        tabIndex={-1}
        aria-describedby="error-preferences.positionIds"
      >
        <legend className="text-sm font-medium">
          Which positions interest you?
        </legend>
        <p className="mt-2 mb-4 text-sm leading-6 text-muted-foreground">
          Choose all that fit. You can explore more than one career path.
        </p>
        <div className="space-y-3">
          {options.categories
            .filter((c) => c.positions.length)
            .map((category) => {
              const open = expanded === category.id;
              const count = category.positions.filter((p) =>
                selected.includes(p.id),
              ).length;
              return (
                <div
                  key={category.id}
                  className="overflow-hidden rounded-2xl border border-border"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((value) =>
                        value === category.id ? null : category.id,
                      )
                    }
                    aria-expanded={open}
                    aria-controls={`category-${category.id}`}
                    className="flex min-h-14 w-full items-center justify-between gap-4 bg-secondary/40 px-4 py-3 text-left text-sm font-medium"
                  >
                    <span>
                      {category.label}
                      {count > 0 && (
                        <span className="ml-3 rounded-full bg-primary/15 px-2 py-1 text-xs text-primary">
                          {count} selected
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={`size-4 shrink-0 text-primary transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    id={`category-${category.id}`}
                    hidden={!open}
                    className="grid gap-2 p-3 sm:grid-cols-2"
                  >
                    {category.positions.map((position) =>
                      position.id === "other" ? (
                        <div key={position.id} className="p-1 sm:col-span-2">
                          <Field
                            name="preferences.otherPosition"
                            label="Other career position"
                            maxLength={200}
                            onChange={(event) =>
                              changeOtherPosition(event.target.value)
                            }
                          />
                        </div>
                      ) : (
                        <label
                          key={position.id}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors ${selected.includes(position.id) ? "border-primary/40 bg-primary/10" : "border-transparent hover:bg-secondary"}`}
                        >
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-primary"
                            checked={selected.includes(position.id)}
                            onChange={() => togglePosition(position.id)}
                          />
                          {position.label}
                        </label>
                      ),
                    )}
                  </div>
                </div>
              );
            })}
        </div>
        <GroupError name="preferences.positionIds" />
      </fieldset>
      <div>
        <SelectField
          name="preferences.firstPreferencePositionId"
          label="Your first preference"
          placeholder="Choose from your selected positions"
          options={all.filter((p) => selected.includes(p.id))}
        />
        {notice && (
          <p role="status" className="mt-2 text-xs leading-5 text-primary">
            {notice}
          </p>
        )}
      </div>
      <fieldset
        id="field-preferences.opportunityIds"
        tabIndex={-1}
        aria-describedby="error-preferences.opportunityIds"
      >
        <legend className="text-sm font-medium">
          What opportunities are you looking for?
        </legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {options.opportunities.map((option) => (
            <label
              key={option.id}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${opportunities.includes(option.id) ? "border-primary/40 bg-primary/10" : "border-border hover:bg-secondary"}`}
            >
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-primary"
                checked={opportunities.includes(option.id)}
                onChange={() =>
                  setValue(
                    "preferences.opportunityIds",
                    opportunities.includes(option.id)
                      ? opportunities.filter((id) => id !== option.id)
                      : [...opportunities, option.id],
                    { shouldDirty: true },
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
        <GroupError name="preferences.opportunityIds" />
      </fieldset>
    </div>
  );
}
export function ReviewStep({
  options,
  onEdit,
}: {
  options: RegistrationOptions;
  onEdit: (step: number) => void;
}) {
  const { register, control } = useFormContext<RegistrationDraft>();
  const values = useWatch({ control }) as RegistrationDraft;
  const positions = options.categories.flatMap((c) => c.positions);
  return (
    <div className="space-y-7">
      <div className="divide-y divide-border rounded-2xl border border-border">
        {[
          {
            step: 0,
            title: "Personal details",
            lines: [
              values.personal.fullName,
              values.personal.email,
              values.personal.phone,
              values.personal.linkedInUrl,
              values.personal.portfolioUrl,
              options.districts.find((o) => o.id === values.personal.districtId)
                ?.label,
            ],
          },
          {
            step: 1,
            title: "Academic background",
            lines: [
              values.academic.institutionName,
              values.academic.facultyName,
              values.academic.degreeName,
              values.academic.specialization,
              values.academic.gpa ? `GPA: ${values.academic.gpa}` : "",
              `${options.academicYears.find((o) => o.id === values.academic.academicYearId)?.label || ""} - ${values.academic.graduationYear}`,
            ],
          },
          {
            step: 2,
            title: "Career preferences",
            lines: [
              `First preference: ${positions.find((p) => p.id === values.preferences.firstPreferencePositionId)?.label || ""}`,
              values.preferences.positionIds
                .map((id) => positions.find((p) => p.id === id)?.label)
                .filter(Boolean)
                .join(", "),
              values.preferences.positionIds.includes("other")
                ? `Other position: ${values.preferences.otherPosition}`
                : "",
              options.opportunities
                .filter((o) => values.preferences.opportunityIds.includes(o.id))
                .map((o) => o.label)
                .join(", "),
            ],
          },
        ].map((section) => (
          <div key={section.step} className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <button
                type="button"
                onClick={() => onEdit(section.step)}
                className="min-h-11 rounded-lg px-3 text-xs font-medium text-primary hover:bg-primary/10"
              >
                Edit<span className="sr-only"> {section.title}</span>
              </button>
            </div>
            {section.lines.map((line, index) =>
              line ? (
                <p
                  key={index}
                  className="text-sm leading-7 break-words text-muted-foreground"
                >
                  {line}
                </p>
              ) : null,
            )}
          </div>
        ))}
      </div>
      <SelectField
        name="additional.referralSourceId"
        label="How did you hear about the Career Fair?"
        options={options.referrals}
      />
      {values.additional.referralSourceId === "referral-other" && (
        <Field
          name="additional.referralOther"
          label="Tell us where you heard about it"
          maxLength={200}
        />
      )}
      <div className="space-y-5 rounded-2xl border border-border p-5">
        {[
          [
            "additional.updates",
            "I would like to receive updates about this Career Fair.",
            true,
          ],
          [
            "additional.accurate",
            "I confirm that the information I have provided is accurate.",
            false,
          ],
        ].map(([name, label, optional]) => (
          <div key={String(name)}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6">
              <input
                id={`field-${name}`}
                type="checkbox"
                {...register(
                  name as "additional.accurate" | "additional.updates",
                )}
                className="mt-1.5 size-4 shrink-0 accent-primary"
              />
              <span>
                {String(label)}
                {optional && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Optional. You can register without receiving these updates.
                  </span>
                )}
              </span>
            </label>
            <GroupError name={String(name)} />
          </div>
        ))}
        <div>
          <div className="flex min-h-11 items-start gap-3 text-sm leading-6">
            <input
              id="field-additional.privacyAgreed"
              type="checkbox"
              {...register("additional.privacyAgreed")}
              aria-labelledby="privacy-agreement-label"
              disabled={!options.canSubmit}
              className="mt-1.5 size-4 shrink-0 accent-primary disabled:opacity-40"
            />
            <span id="privacy-agreement-label">
              <label
                htmlFor="field-additional.privacyAgreed"
                className="cursor-pointer"
              >
                I have read and agree to the{" "}
              </label>
              <PrivacyNoticeTrigger />.
            </span>
          </div>
          <GroupError name="additional.privacyAgreed" />
        </div>
      </div>
      {site.whatsappCommunityUrl && (
        <a
          href={site.whatsappCommunityUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg text-sm text-primary underline underline-offset-4"
        >
          Join the WhatsApp community (optional)
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      <div className="flex items-start gap-3 rounded-2xl bg-primary/5 p-4">
        <HeartHandshake
          aria-hidden
          className="mt-1 size-5 shrink-0 text-primary"
        />
        <p className="text-xs leading-6 text-muted-foreground">
          Pre-registration helps the organisers prepare for the event. It does
          not guarantee an interview or a job, and does not give permission for
          future employer sharing.
        </p>
      </div>
    </div>
  );
}
