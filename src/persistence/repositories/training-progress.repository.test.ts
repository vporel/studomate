const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("./supabase-client", () => ({
	supabase: {
		auth: { getUser: (...args: any[]) => mockAuthGetUser(...args) },
		from: (...args: any[]) => mockFrom(...args),
	},
}));

import TrainingProgressRepository from "./training-progress.repository";

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

describe("TrainingProgressRepository", () => {
	beforeEach(() => {
		mockAuthGetUser.mockReset();
		mockFrom.mockReset();
	});

	describe("getStepId", () => {
		it("retourne null sans utilisateur connecté, sans interroger la table", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });

			const result = await new TrainingProgressRepository().getStepId("m1");

			expect(result).toBeNull();
			expect(mockFrom).not.toHaveBeenCalled();
		});

		it("retourne l'étape sauvegardée pour l'utilisateur et le module", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(
				resolved({ data: { step_id: "exercise-linear" }, error: null }),
			);

			const result = await new TrainingProgressRepository().getStepId("m1");

			expect(result).toBe("exercise-linear");
			expect(mockFrom).toHaveBeenCalledWith("training_progress");
		});

		it("retourne null si aucune progression n'existe encore pour ce module", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(resolved({ data: null, error: null }));

			const result = await new TrainingProgressRepository().getStepId("m1");

			expect(result).toBeNull();
		});

		it("retourne null en cas d'erreur réseau", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(
				resolved({ data: null, error: { message: "network" } }),
			);

			const result = await new TrainingProgressRepository().getStepId("m1");

			expect(result).toBeNull();
		});
	});

	describe("saveStepId", () => {
		it("n'écrit rien sans utilisateur connecté", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });

			await new TrainingProgressRepository().saveStepId("m1", "theory-timer");

			expect(mockFrom).not.toHaveBeenCalled();
		});

		it("upsert la progression pour l'utilisateur connecté", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			const upsert = jest.fn(() => resolved({ data: null, error: null }));
			mockFrom.mockReturnValue({ upsert });

			await new TrainingProgressRepository().saveStepId("m1", "theory-timer");

			expect(mockFrom).toHaveBeenCalledWith("training_progress");
			expect(upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: "u1",
					module_id: "m1",
					step_id: "theory-timer",
				}),
			);
		});
	});
});
