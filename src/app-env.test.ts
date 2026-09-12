describe("app-env", () => {
	const original = process.env.NEXT_PUBLIC_APP_ENV;

	afterEach(() => {
		process.env.NEXT_PUBLIC_APP_ENV = original;
		jest.resetModules();
	});

	it("reconnaît prod", async () => {
		process.env.NEXT_PUBLIC_APP_ENV = "prod";
		jest.resetModules();
		const { APP_ENV, isProdEnv } = await import("./app-env");
		expect(APP_ENV).toBe("prod");
		expect(isProdEnv).toBe(true);
	});

	it("traite dev comme non-prod", async () => {
		process.env.NEXT_PUBLIC_APP_ENV = "dev";
		jest.resetModules();
		const { isProdEnv } = await import("./app-env");
		expect(isProdEnv).toBe(false);
	});

	it("traite une valeur inconnue ou absente comme dev", async () => {
		delete process.env.NEXT_PUBLIC_APP_ENV;
		jest.resetModules();
		const { APP_ENV, isProdEnv } = await import("./app-env");
		expect(APP_ENV).toBe("dev");
		expect(isProdEnv).toBe(false);
	});
});
