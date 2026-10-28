import {
	isSupabaseConfigured,
	supabase,
} from "@/persistence/repositories/supabase-client";

/** True when `userId` has at least one opinion stored; false when unknown (offline, no cloud). */
export default async function hasGivenFeedback(
	userId: string,
): Promise<boolean> {
	if (!isSupabaseConfigured) return false;
	try {
		const { data, error } = await supabase
			.from("feedback")
			.select("id")
			.eq("user_id", userId)
			.limit(1);
		return !error && (data?.length ?? 0) > 0;
	} catch {
		return false;
	}
}
