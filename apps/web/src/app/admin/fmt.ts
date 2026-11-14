export const dt = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("uk-UA", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Kyiv" }).format(new Date(d)) : "—";

export const money = (n: number, cur: string) =>
  `${n.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ${cur === "UAH" ? "₴" : cur === "USD" ? "$" : cur}`;

export function ago(sec: number | null) {
  if (sec === null) return "ніколи";
  if (sec < 90) return `${sec} с тому`;
  if (sec < 5400) return `${Math.round(sec / 60)} хв тому`;
  if (sec < 172800) return `${Math.round(sec / 3600)} год тому`;
  return `${Math.round(sec / 86400)} дн тому`;
}
