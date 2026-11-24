const metricNames = new Set(["CLS", "FCP", "LCP", "INP", "TTFB"]);
export function qaMetricSummary(metric: { name: string; value: number }) {
  if (
    !metricNames.has(metric.name) ||
    !Number.isFinite(metric.value) ||
    metric.value < 0
  )
    return null;
  return { name: metric.name, value: Math.round(metric.value * 1000) / 1000 };
}
