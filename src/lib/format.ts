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
