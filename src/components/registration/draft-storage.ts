import type { RegistrationDraft } from "@/shared/registration-form";
export function saveDraft(
  key: string,
  eventId: string,
  step: number,
  values: RegistrationDraft,
  attempt?: { key: string; payload: string },
) {
  const hasData =
    Object.values(values.personal).some(Boolean) ||
    Object.values(values.academic).some(Boolean) ||
    values.preferences.positionIds.length ||
    values.preferences.opportunityIds.length ||
    values.additional.referralSourceId;
  if (!hasData) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(
    key,
    JSON.stringify({
      version: 1,
      eventId,
      savedAt: Date.now(),
      step,
      values: {
        ...values,
        additional: {
          ...values.additional,
          accurate: false,
          privacyAgreed: false,
        },
      },
      attempt,
    }),
  );
}
