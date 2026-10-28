import checkAppVersion from "./app-version-check";

describe("checkAppVersion", () => {
	it("reports a first visit when no version is stored and no project exists", () => {
		expect(checkAppVersion(null, "v1.7.0", false)).toBe("first-visit");
	});

	it("reports changed when no version is stored but projects already exist", () => {
		expect(checkAppVersion(null, "v1.7.0", true)).toBe("changed");
	});

	it("reports unchanged when the stored version is the current one", () => {
		expect(checkAppVersion("v1.7.0", "v1.7.0", false)).toBe("unchanged");
		expect(checkAppVersion("v1.7.0", "v1.7.0", true)).toBe("unchanged");
	});

	it("reports changed when the stored version differs, older or newer", () => {
		expect(checkAppVersion("v1.6.0", "v1.7.0", false)).toBe("changed");
		expect(checkAppVersion("v1.8.0", "v1.7.0", false)).toBe("changed");
	});

	it("treats an empty stored string as a recorded version", () => {
		expect(checkAppVersion("", "v1.7.0", true)).toBe("changed");
	});
});
