jest.mock("@supabase/supabase-js", () => {
	throw new Error("@supabase/supabase-js loaded by the project store module");
});
jest.mock("@mui/x-data-grid", () => {
	throw new Error("@mui/x-data-grid loaded by the project store module");
});
jest.mock("@mui/x-data-grid/internals", () => {
	throw new Error("@mui/x-data-grid loaded by the project store module");
});
jest.mock("three", () => {
	throw new Error("three loaded by the project store module");
});

describe("project store module imports", () => {
	it("loads without Supabase, the data grid or three.js", async () => {
		await expect(import("./project.store")).resolves.toBeDefined();
	});
});
