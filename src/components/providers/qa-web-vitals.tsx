"use client";
import { useReportWebVitals } from "next/web-vitals";
import { qaMetricSummary } from "@/shared/qa-metric";
const report: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  if (process.env.NODE_ENV !== "development") return;
  const summary = qaMetricSummary(metric);
  if (summary) console.info("QA_WEB_VITAL", JSON.stringify(summary));
};
export function QaWebVitals() {
  useReportWebVitals(report);
  return null;
}
