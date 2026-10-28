import { type Session, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { supabase } from "./supabase-client";

/**
 * An expired token makes `getSession()` try a network refresh that can keep retrying offline:
 * past this delay the cloud is considered unreachable.
 */
export const SESSION_LOOKUP_TIMEOUT_MS = 4000;

export type SessionLookup =
	| { status: "signed-in"; session: Session }
	| { status: "signed-out" }
	| { status: "unreachable" };

/** Never throws and never waits longer than `SESSION_LOOKUP_TIMEOUT_MS`. */
export default async function lookupSession(): Promise<SessionLookup> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const timedOut = Symbol("timeout");
		const result = await Promise.race([
			supabase.auth.getSession(),
			new Promise<typeof timedOut>((resolve) => {
				timer = setTimeout(() => resolve(timedOut), SESSION_LOOKUP_TIMEOUT_MS);
			}),
		]);
		if (result === timedOut) return { status: "unreachable" };
		// Any other error is a refresh token the server refused: the session is gone (`null`).
		if (isAuthRetryableFetchError(result.error))
			return { status: "unreachable" };
		const { session } = result.data;
		return session
			? { status: "signed-in", session }
			: { status: "signed-out" };
	} catch {
		return { status: "unreachable" };
	} finally {
		clearTimeout(timer);
	}
}
