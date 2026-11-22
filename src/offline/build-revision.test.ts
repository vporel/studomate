import buildRevision from "@/offline/build-revision";

describe("buildRevision", () => {
	it("uses the stash revision when there is one", () => {
		const git = jest.fn((...args: string[]) =>
			args[0] === "stash" ? "stash-sha" : "head-sha",
		);
		expect(buildRevision(git)).toBe("stash-sha");
		expect(git).toHaveBeenCalledTimes(1);
		expect(git).toHaveBeenCalledWith("stash", "create");
	});

	it("falls back to HEAD when the working tree is clean", () => {
		const git = jest.fn((...args: string[]) =>
			args[0] === "stash" ? "" : "head-sha",
		);
		expect(buildRevision(git)).toBe("head-sha");
		expect(git).toHaveBeenLastCalledWith("rev-parse", "HEAD");
	});

	it("falls back to a random id when git is unavailable", () => {
		const git = jest.fn(() => undefined);
		const first = buildRevision(git);
		expect(first).toMatch(/^[0-9a-f-]{36}$/);
		expect(buildRevision(git)).not.toBe(first);
	});

	it("falls back to a random id when git outputs nothing", () => {
		expect(buildRevision(() => "")).toMatch(/^[0-9a-f-]{36}$/);
	});
});
