import canShare from "./shareability";

const SHAREABLE = {
	getByShareToken: jest.fn(),
	getShareToken: jest.fn(),
	createShareToken: jest.fn(),
	deleteShareToken: jest.fn(),
};

const state = (
	overrides: { repository?: object; isSharedProject?: boolean } = {},
) =>
	({
		projectRepository: overrides.repository ?? SHAREABLE,
		isSharedProject: overrides.isSharedProject ?? false,
	}) as never;

describe("canShare", () => {
	it("is true for a project whose storage supports share links", () => {
		expect(canShare(state())).toBe(true);
	});

	it("is false when the storage cannot share (local only)", () => {
		expect(canShare(state({ repository: { list: jest.fn() } }))).toBe(false);
	});

	it("is false for a project opened from a share link", () => {
		expect(canShare(state({ isSharedProject: true }))).toBe(false);
	});
});
