import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/site";

/** returnUrl: WayForPay sends the customer back here with a POST; bounce them to the billing page. */
function back() {
  return NextResponse.redirect(`${SITE_URL}/app/billing?returned=1`, 303);
}
export const POST = back;
export const GET = back;
