import { handler } from "@/lib/api";
import { PLATFORM_LIST } from "@/lib/publishers";

export const GET = handler(async () => PLATFORM_LIST);
