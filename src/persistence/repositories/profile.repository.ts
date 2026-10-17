import type { UserProfile } from "@/user-profile/user-profile";
import { supabase } from "./supabase-client";

const TABLE = "profiles";

/**
 * Self-declared profile of the signed-in user (one row per user, protected by RLS on
 * `auth.uid() = user_id`). Without a session it does nothing.
 */
export default class ProfileRepository {
	async save(profile: UserProfile): Promise<void> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		await supabase.from(TABLE).upsert({
			user_id: user.id,
			user_type: profile.userType,
			school_type: profile.schoolType,
			updated_at: new Date().toISOString(),
		});
	}
}
