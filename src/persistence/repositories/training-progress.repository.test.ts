/** @jest-environment jsdom */
const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("./supabase-client", () => ({
	isSupabaseConfigured: true,
	supabase: {
		auth: { getUser: (...args: any[]) => mockAuthGetUser(...args) },
		from: (...args: any[]) => mockFrom(...args),
	},
}));

import TrainingProgressRepository, {
	TRAINING_PROGRESS_LOCAL_KEY,
} from "./training-progress.repository";

const STEPS = ["s1", "s2", "s3", "s4"];

/** Imite le query builder Supabase (thenable, chaînable) pour un résultat donné */
function resolved(result: { data?: any; error?: any }) {
	const builder: any = {
		select: () => resolved(result),
		eq: () => resolved(result),
		maybeSingle: () => resolved(result),
		upsert: () => resolved(result),
		then: (resolve: any, reject: any) =>
			Promise.resolve(result).then(resolve, reject),
	};
	return builder;
}

function setLocal(value: object) {
	localStorage.setItem(TRAINING_PROGRESS_LOCAL_KEY, JSON.stringify(value));
}

function signedIn() {
	mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
}

describe("TrainingProgressRepository", () => {
	beforeEach(() => {
		mockAuthGetUser.mockReset();
		mockFrom.mockReset();
		localStorage.clear();
	});

	describe("getStepId", () => {
		it("sans utilisateur connecté, lit le localStorage sans interroger la table", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });
			setLocal({ m1: "s2" });

			const result = await new TrainingProgressRepository().getStepId(
				"m1",
				STEPS,
			);

			expect(result).toBe("s2");
			expect(mockFrom).not.toHaveBeenCalled();
		});

		it("retourne null sans progression locale ni compte", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });

			expect(
				await new TrainingProgressRepository().getStepId("m1", STEPS),
			).toBeNull();
		});

		it("ignore un localStorage corrompu ou une étape inconnue", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });
			localStorage.setItem(TRAINING_PROGRESS_LOCAL_KEY, "{not json");
			expect(
				await new TrainingProgressRepository().getStepId("m1", STEPS),
			).toBeNull();

			setLocal({ m1: "unknown" });
			expect(
				await new TrainingProgressRepository().getStepId("m1", STEPS),
			).toBeNull();
		});

		it("retourne l'étape cloud si elle est plus avancée que la locale, sans réécrire le cloud", async () => {
			signedIn();
			setLocal({ m1: "s1" });
			const upsert = jest.fn();
			mockFrom.mockReturnValue({
				...resolved({ data: { step_id: "s3" }, error: null }),
				upsert,
			});

			const result = await new TrainingProgressRepository().getStepId(
				"m1",
				STEPS,
			);

			expect(result).toBe("s3");
			expect(mockFrom).toHaveBeenCalledWith("training_progress");
			expect(upsert).not.toHaveBeenCalled();
		});

		it("retourne la locale si elle est plus avancée et la pousse vers le cloud", async () => {
			signedIn();
			setLocal({ m1: "s4" });
			const upsert = jest.fn(() => resolved({ data: null, error: null }));
			mockFrom.mockReturnValue({
				...resolved({ data: { step_id: "s2" }, error: null }),
				upsert,
			});

			const result = await new TrainingProgressRepository().getStepId(
				"m1",
				STEPS,
			);

			expect(result).toBe("s4");
			expect(upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: "u1",
					module_id: "m1",
					step_id: "s4",
				}),
			);
		});

		it("pousse la progression locale si le cloud n'a rien pour ce module", async () => {
			signedIn();
			setLocal({ m1: "s2" });
			const upsert = jest.fn(() => resolved({ data: null, error: null }));
			mockFrom.mockReturnValue({
				...resolved({ data: null, error: null }),
				upsert,
			});

			expect(
				await new TrainingProgressRepository().getStepId("m1", STEPS),
			).toBe("s2");
			expect(upsert).toHaveBeenCalledTimes(1);
		});

		it("en cas d'erreur réseau, retourne la locale sans écrire dans le cloud", async () => {
			signedIn();
			setLocal({ m1: "s2" });
			const upsert = jest.fn();
			mockFrom.mockReturnValue({
				...resolved({ data: null, error: { message: "network" } }),
				upsert,
			});

			expect(
				await new TrainingProgressRepository().getStepId("m1", STEPS),
			).toBe("s2");
			expect(upsert).not.toHaveBeenCalled();
		});
	});

	describe("saveStepId", () => {
		const localProgress = () =>
			JSON.parse(localStorage.getItem(TRAINING_PROGRESS_LOCAL_KEY)!);

		/** Cloud table holding `saved` as the module's step (`null`: no row) and recording upserts. */
		function cloudWith(saved: string | null, readError: object | null = null) {
			const upsert = jest.fn(() => resolved({ data: null, error: null }));
			mockFrom.mockReturnValue({
				select: () =>
					resolved({
						data: saved ? { step_id: saved } : null,
						error: readError,
					}),
				upsert,
			});
			return upsert;
		}

		describe("sans utilisateur connecté", () => {
			beforeEach(() =>
				mockAuthGetUser.mockResolvedValue({ data: { user: null } }),
			);

			it("écrit dans le localStorage uniquement", async () => {
				setLocal({ other: "s1" });

				await new TrainingProgressRepository().saveStepId("m1", "s3", STEPS);

				expect(localProgress()).toEqual({
					other: { stepId: "s1", updatedAt: null },
					m1: { stepId: "s3", updatedAt: expect.any(String) },
				});
				expect(mockFrom).not.toHaveBeenCalled();
			});

			it("remplace une étape locale moins avancée", async () => {
				setLocal({ m1: "s2" });

				await new TrainingProgressRepository().saveStepId("m1", "s3", STEPS);

				expect(localProgress().m1.stepId).toBe("s3");
			});

			it("ne redescend pas sous une étape locale plus avancée", async () => {
				setLocal({ m1: "s4" });

				await new TrainingProgressRepository().saveStepId("m1", "s2", STEPS);

				expect(localProgress()).toEqual({ m1: "s4" });
			});

			it("ne touche pas à une étape locale identique", async () => {
				setLocal({ m1: "s3" });

				await new TrainingProgressRepository().saveStepId("m1", "s3", STEPS);

				expect(localProgress().m1.stepId).toBe("s3");
			});

			it("ignore une étape qui ne fait pas partie du module", async () => {
				setLocal({ m1: "s2" });

				await new TrainingProgressRepository().saveStepId(
					"m1",
					"inconnue",
					STEPS,
				);

				expect(localProgress()).toEqual({ m1: "s2" });
			});

			it("remplace une étape locale inconnue du module", async () => {
				setLocal({ m1: "retiree" });

				await new TrainingProgressRepository().saveStepId("m1", "s2", STEPS);

				expect(localProgress().m1.stepId).toBe("s2");
			});
		});

		describe("avec un utilisateur connecté", () => {
			beforeEach(() => signedIn());

			it("écrit dans le localStorage et upsert dans le cloud", async () => {
				const upsert = cloudWith(null);

				await new TrainingProgressRepository().saveStepId("m1", "s3", STEPS);

				expect(localProgress()).toEqual({
					m1: { stepId: "s3", updatedAt: expect.any(String) },
				});
				expect(mockFrom).toHaveBeenCalledWith("training_progress");
				expect(upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						user_id: "u1",
						module_id: "m1",
						step_id: "s3",
					}),
				);
			});

			it("n'écrit nulle part quand le cloud est plus avancé", async () => {
				setLocal({ m1: "s1" });
				const upsert = cloudWith("s4");

				await new TrainingProgressRepository().saveStepId("m1", "s2", STEPS);

				expect(localProgress()).toEqual({ m1: "s1" });
				expect(upsert).not.toHaveBeenCalled();
			});

			it("n'écrit nulle part quand le local est plus avancé, sans interroger le cloud", async () => {
				setLocal({ m1: "s4" });
				const upsert = cloudWith("s1");

				await new TrainingProgressRepository().saveStepId("m1", "s2", STEPS);

				expect(localProgress()).toEqual({ m1: "s4" });
				expect(upsert).not.toHaveBeenCalled();
				expect(mockFrom).not.toHaveBeenCalled();
			});

			it("écrit des deux côtés quand l'étape dépasse le local et le cloud", async () => {
				setLocal({ m1: "s1" });
				const upsert = cloudWith("s2");

				await new TrainingProgressRepository().saveStepId("m1", "s3", STEPS);

				expect(localProgress().m1.stepId).toBe("s3");
				expect(upsert).toHaveBeenCalledWith(
					expect.objectContaining({ step_id: "s3" }),
				);
			});

			it("en cas d'erreur de lecture du cloud, écrit le local sans tenter le cloud", async () => {
				setLocal({ m1: "s1" });
				const upsert = cloudWith(null, { message: "réseau" });

				await new TrainingProgressRepository().saveStepId("m1", "s3", STEPS);

				expect(localProgress().m1.stepId).toBe("s3");
				expect(upsert).not.toHaveBeenCalled();
			});

			it("en cas d'erreur de lecture du cloud, ne redescend pas sous le local", async () => {
				setLocal({ m1: "s4" });
				const upsert = cloudWith(null, { message: "réseau" });

				await new TrainingProgressRepository().saveStepId("m1", "s2", STEPS);

				expect(localProgress()).toEqual({ m1: "s4" });
				expect(upsert).not.toHaveBeenCalled();
			});
		});
	});

	describe("getLastProgress", () => {
		const MODULES = [
			{ moduleId: "m1", stepIds: STEPS },
			{ moduleId: "m2", stepIds: STEPS },
			{ moduleId: "m3", stepIds: STEPS },
		];

		beforeEach(() => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });
		});

		it("retourne null quand aucun module n'est commencé", async () => {
			expect(
				await new TrainingProgressRepository().getLastProgress(MODULES),
			).toBeNull();
		});

		it("choisit le module à l'horodatage local le plus récent", async () => {
			setLocal({
				m1: { stepId: "s2", updatedAt: "2026-01-02T00:00:00.000Z" },
				m2: { stepId: "s1", updatedAt: "2026-01-03T00:00:00.000Z" },
				m3: { stepId: "s4", updatedAt: "2026-01-01T00:00:00.000Z" },
			});

			expect(
				await new TrainingProgressRepository().getLastProgress(MODULES),
			).toEqual({ moduleId: "m2", stepId: "s1" });
		});

		it("lit l'ancien format (id d'étape seul) et prend le dernier module de la liste faute de date", async () => {
			setLocal({ m1: "s2", m2: "s3" });

			expect(
				await new TrainingProgressRepository().getLastProgress(MODULES),
			).toEqual({ moduleId: "m2", stepId: "s3" });
		});

		it("un module daté l'emporte sur un module sans date", async () => {
			setLocal({
				m1: { stepId: "s1", updatedAt: "2026-01-01T00:00:00.000Z" },
				m2: "s3",
			});

			expect(
				await new TrainingProgressRepository().getLastProgress(MODULES),
			).toEqual({ moduleId: "m1", stepId: "s1" });
		});

		it("ignore les modules inconnus et les étapes inconnues", async () => {
			setLocal({
				other: { stepId: "s1", updatedAt: "2026-02-01T00:00:00.000Z" },
				m1: { stepId: "unknown", updatedAt: "2026-02-01T00:00:00.000Z" },
			});

			expect(
				await new TrainingProgressRepository().getLastProgress(MODULES),
			).toBeNull();
		});

		it("avec un compte, un module plus récent côté cloud l'emporte et l'étape la plus avancée est retenue", async () => {
			signedIn();
			setLocal({
				m1: { stepId: "s3", updatedAt: "2026-01-02T00:00:00.000Z" },
				m2: { stepId: "s1", updatedAt: "2026-01-01T00:00:00.000Z" },
			});
			mockFrom.mockReturnValue(
				resolved({
					data: [
						{
							module_id: "m2",
							step_id: "s2",
							updated_at: "2026-01-05T00:00:00.000Z",
						},
					],
					error: null,
				}),
			);

			expect(
				await new TrainingProgressRepository().getLastProgress(MODULES),
			).toEqual({ moduleId: "m2", stepId: "s2" });
		});

		it("en cas d'erreur cloud, se rabat sur le local", async () => {
			signedIn();
			setLocal({ m1: { stepId: "s2", updatedAt: "2026-01-02T00:00:00.000Z" } });
			mockFrom.mockReturnValue(
				resolved({ data: null, error: { message: "network" } }),
			);

			expect(
				await new TrainingProgressRepository().getLastProgress(MODULES),
			).toEqual({ moduleId: "m1", stepId: "s2" });
		});
	});
});
