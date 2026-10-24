import { readJson, writeJson } from "../safe-local-storage";
import { isSupabaseConfigured, supabase } from "./supabase-client";

const TABLE = "training_progress";

export const TRAINING_PROGRESS_LOCAL_KEY = "studomate_training_progress";

/** `updatedAt` is `null` for progress saved before timestamps were kept (stored as a bare step id). */
type LocalEntry = { stepId: string; updatedAt: string | null };

type LocalProgress = Record<string, LocalEntry>;

function readLocal(): LocalProgress {
	const parsed = readJson(TRAINING_PROGRESS_LOCAL_KEY);
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
	const progress: LocalProgress = {};
	for (const [moduleId, value] of Object.entries(parsed)) {
		if (typeof value === "string") {
			progress[moduleId] = { stepId: value, updatedAt: null };
		} else if (
			value &&
			typeof value === "object" &&
			typeof (value as LocalEntry).stepId === "string"
		) {
			const { stepId, updatedAt } = value as LocalEntry;
			progress[moduleId] = {
				stepId,
				updatedAt: typeof updatedAt === "string" ? updatedAt : null,
			};
		}
	}
	return progress;
}

// Quota or storage disabled: progress is simply not kept in this browser.
function writeLocal(moduleId: string, stepId: string): void {
	writeJson(TRAINING_PROGRESS_LOCAL_KEY, {
		...readLocal(),
		[moduleId]: { stepId, updatedAt: new Date().toISOString() },
	});
}

export type TrainingModuleSteps = { moduleId: string; stepIds: string[] };

export type LastTrainingProgress = { moduleId: string; stepId: string };

function timestamp(iso: string | null | undefined): number {
	const time = iso ? Date.parse(iso) : NaN;
	return Number.isNaN(time) ? 0 : time;
}

/** The furthest of two saved steps, ignoring ids that are not part of `stepIds`. */
function furthestStepId(
	a: string | null,
	b: string | null,
	stepIds: string[],
): string | null {
	const indexA = a ? stepIds.indexOf(a) : -1;
	const indexB = b ? stepIds.indexOf(b) : -1;
	const best = Math.max(indexA, indexB);
	return best === -1 ? null : stepIds[best];
}

/**
 * Reprise de progression dans un module de formation (`src/app/[locale]/training/`) : mémorise
 * la dernière étape atteinte par module. Toujours sauvegardée dans le `localStorage` du
 * navigateur ; pour un utilisateur connecté, également dans Supabase (table `training_progress`,
 * un enregistrement par utilisateur et par module). À la lecture, la plus avancée des deux
 * sources l'emporte et rattrape l'autre côté cloud.
 *
 * Le RLS de la table filtre déjà par utilisateur connecté (`auth.uid() = user_id`).
 */
export default class TrainingProgressRepository {
	private async getUserId(): Promise<string | null> {
		if (!isSupabaseConfigured) return null;
		const {
			data: { user },
		} = await supabase.auth.getUser();
		return user?.id ?? null;
	}

	/** `stepIds`: the module's steps, first to last, used to compare progress. */
	async getStepId(moduleId: string, stepIds: string[]): Promise<string | null> {
		const local = readLocal()[moduleId]?.stepId ?? null;
		const userId = await this.getUserId();
		if (!userId) return furthestStepId(local, null, stepIds);

		const { data, error } = await supabase
			.from(TABLE)
			.select("step_id")
			.eq("user_id", userId)
			.eq("module_id", moduleId)
			.maybeSingle();
		const cloud = error || !data ? null : (data.step_id as string);

		const best = furthestStepId(local, cloud, stepIds);
		if (best && best !== cloud && !error)
			await this.upsertCloud(userId, moduleId, best);
		return best;
	}

	/**
	 * The module whose progress was saved most recently, with its furthest saved step. Progress
	 * saved before timestamps were kept has no date and loses to any dated progress; among
	 * undated modules the later one in `modules` wins. `null` when no module was started.
	 */
	async getLastProgress(
		modules: TrainingModuleSteps[],
	): Promise<LastTrainingProgress | null> {
		const local = readLocal();
		const cloud = new Map<string, { stepId: string; updatedAt: string }>();
		const userId = await this.getUserId();
		if (userId) {
			const { data, error } = await supabase
				.from(TABLE)
				.select("module_id, step_id, updated_at")
				.eq("user_id", userId);
			if (!error)
				for (const row of data ?? [])
					cloud.set(row.module_id as string, {
						stepId: row.step_id as string,
						updatedAt: row.updated_at as string,
					});
		}

		let last: (LastTrainingProgress & { time: number }) | null = null;
		for (const { moduleId, stepIds } of modules) {
			const stepId = furthestStepId(
				local[moduleId]?.stepId ?? null,
				cloud.get(moduleId)?.stepId ?? null,
				stepIds,
			);
			if (!stepId) continue;
			const time = Math.max(
				timestamp(local[moduleId]?.updatedAt),
				timestamp(cloud.get(moduleId)?.updatedAt),
			);
			if (!last || time >= last.time) last = { moduleId, stepId, time };
		}
		return last && { moduleId: last.moduleId, stepId: last.stepId };
	}

	async saveStepId(moduleId: string, stepId: string): Promise<void> {
		writeLocal(moduleId, stepId);
		const userId = await this.getUserId();
		if (userId) await this.upsertCloud(userId, moduleId, stepId);
	}

	private async upsertCloud(
		userId: string,
		moduleId: string,
		stepId: string,
	): Promise<void> {
		await supabase.from(TABLE).upsert({
			user_id: userId,
			module_id: moduleId,
			step_id: stepId,
			updated_at: new Date().toISOString(),
		});
	}
}
