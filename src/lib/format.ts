export function inr(n: number, decimals = 0) {
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`;
}

export function formatDateLong(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatMonthKey(month: string) {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  const label = date.toLocaleDateString("en-IN", { month: "long", year: "2-digit" });
  return label.replace(" ", " '");
}

export function formatDateShort(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
