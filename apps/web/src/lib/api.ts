import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

/** Wraps a route handler with uniform JSON error responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const res = await fn(...args);
      return res instanceof Response ? res : NextResponse.json(res);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
