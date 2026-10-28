import hasGivenFeedback from "./has-given-feedback";

const mockLimit = jest.fn();
const mockEq = jest.fn(() => ({ limit: mockLimit }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
let mockConfigured = true;
jest.mock("@/persistence/repositories/supabase-client", () => ({
	get isSupabaseConfigured() {
		return mockConfigured;
	},
	supabase: { from: (...args: unknown[]) => (mockFrom as any)(...args) },
}));

describe("hasGivenFeedback", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockConfigured = true;
	});

	it("is true when the user has a stored opinion", async () => {
		mockLimit.mockResolvedValue({ data: [{ id: "f1" }], error: null });

		expect(await hasGivenFeedback("user-1")).toBe(true);
		expect(mockFrom).toHaveBeenCalledWith("feedback");
		expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
	});

	it("is false when the user has none", async () => {
		mockLimit.mockResolvedValue({ data: [], error: null });

		expect(await hasGivenFeedback("user-1")).toBe(false);
	});

	it("is false when the query fails", async () => {
		mockLimit.mockResolvedValue({ data: null, error: { message: "boom" } });
		expect(await hasGivenFeedback("user-1")).toBe(false);

		mockLimit.mockRejectedValue(new Error("offline"));
		expect(await hasGivenFeedback("user-1")).toBe(false);
	});

	it("does not query when the cloud is not configured", async () => {
		mockConfigured = false;

		expect(await hasGivenFeedback("user-1")).toBe(false);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});
