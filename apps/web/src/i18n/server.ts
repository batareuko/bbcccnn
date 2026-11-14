import { cookies } from "next/headers";
import { DICTS, LOCALE_COOKIE, normalizeLocale } from "./dict";

export async function getLocale() {
  return normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
}
