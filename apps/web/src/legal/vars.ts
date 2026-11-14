import { BRAND, SITE_URL } from "@/lib/site";
import { TRIAL_DAYS } from "@/lib/plans";
import { GRACE_DAYS } from "@/lib/billing/catalog";
import { TRIAL_AI_CREDITS } from "@/lib/ai/credits";

/** Business details shown in legal pages and the footer. Set them in env (see .env.example). */
export function legalVars() {
  return {
    brand: BRAND,
    site: SITE_URL,
    legalName: process.env.LEGAL_NAME || "[ФОП Прізвище Ім'я По батькові]",
    taxId: process.env.LEGAL_TAX_ID || "[РНОКПП]",
    address: process.env.LEGAL_ADDRESS || "[адреса реєстрації]",
    email: process.env.LEGAL_EMAIL || "[support@your-domain]",
    phone: process.env.LEGAL_PHONE || "[+380…]",
    trialDays: String(TRIAL_DAYS),
    aiTrialCredits: String(TRIAL_AI_CREDITS),
    graceDays: String(GRACE_DAYS),
  };
}

export function fill(text: string, vars = legalVars()) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k as keyof typeof vars] : m));
}
