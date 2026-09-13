import { supabase } from "./supabase-client";

const TABLE = "training_progress";

/**
 * Reprise de progression dans un module de formation (`src/app/[locale]/training/`) : mémorise
 * la dernière étape atteinte par utilisateur et par module. Sans compte, ce repository ne fait
 * rien (retourne `null` / n'écrit pas) : pas de repli `localStorage`, la fonctionnalité n'existe
 * que pour un utilisateur connecté.
 *
 * Le RLS de la table filtre déjà par utilisateur connecté (`auth.uid() = user_id`).
 */
export default class TrainingProgressRepository {
	async getStepId(moduleId: string): Promise<string | null> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return null;

		const { data, error } = await supabase
			.from(TABLE)
			.select("step_id")
			.eq("user_id", user.id)
			.eq("module_id", moduleId)
			.maybeSingle();
		if (error || !data) return null;
		return data.step_id as string;
	}

	async saveStepId(moduleId: string, stepId: string): Promise<void> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return;

		await supabase.from(TABLE).upsert({
			user_id: user.id,
			module_id: moduleId,
			step_id: stepId,
			updated_at: new Date().toISOString(),
		});
	}
}
