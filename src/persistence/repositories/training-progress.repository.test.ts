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

			const result = await new TrainingProgressRepository().getStepId("m1", STEPS);

			expect(result).toBe("s2");
			expect(mockFrom).not.toHaveBeenCalled();
		});

		it("retourne null sans progression locale ni compte", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });

			expect(await new TrainingProgressRepository().getStepId("m1", STEPS)).toBeNull();
		});

		it("ignore un localStorage corrompu ou une étape inconnue", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });
			localStorage.setItem(TRAINING_PROGRESS_LOCAL_KEY, "{not json");
			expect(await new TrainingProgressRepository().getStepId("m1", STEPS)).toBeNull();

			setLocal({ m1: "unknown" });
			expect(await new TrainingProgressRepository().getStepId("m1", STEPS)).toBeNull();
		});

		it("retourne l'étape cloud si elle est plus avancée que la locale, sans réécrire le cloud", async () => {
			signedIn();
			setLocal({ m1: "s1" });
			const upsert = jest.fn();
			mockFrom.mockReturnValue({
				...resolved({ data: { step_id: "s3" }, error: null }),
				upsert,
			});

			const result = await new TrainingProgressRepository().getStepId("m1", STEPS);

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

			const result = await new TrainingProgressRepository().getStepId("m1", STEPS);

			expect(result).toBe("s4");
			expect(upsert).toHaveBeenCalledWith(
				expect.objectContaining({ user_id: "u1", module_id: "m1", step_id: "s4" }),
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

			expect(await new TrainingProgressRepository().getStepId("m1", STEPS)).toBe("s2");
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

			expect(await new TrainingProgressRepository().getStepId("m1", STEPS)).toBe("s2");
			expect(upsert).not.toHaveBeenCalled();
		});
	});

	describe("saveStepId", () => {
		it("sans utilisateur connecté, écrit dans le localStorage uniquement", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });
			setLocal({ other: "s1" });

			await new TrainingProgressRepository().saveStepId("m1", "s3");

			expect(JSON.parse(localStorage.getItem(TRAINING_PROGRESS_LOCAL_KEY)!)).toEqual({
				other: "s1",
				m1: "s3",
			});
			expect(mockFrom).not.toHaveBeenCalled();
		});

		it("avec un utilisateur connecté, écrit dans le localStorage et upsert dans le cloud", async () => {
			signedIn();
			const upsert = jest.fn(() => resolved({ data: null, error: null }));
			mockFrom.mockReturnValue({ upsert });

			await new TrainingProgressRepository().saveStepId("m1", "s3");

			expect(JSON.parse(localStorage.getItem(TRAINING_PROGRESS_LOCAL_KEY)!)).toEqual({
				m1: "s3",
			});
			expect(mockFrom).toHaveBeenCalledWith("training_progress");
			expect(upsert).toHaveBeenCalledWith(
				expect.objectContaining({ user_id: "u1", module_id: "m1", step_id: "s3" }),
			);
		});
	});
});
