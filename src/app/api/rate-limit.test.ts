import createRateLimiter, { clientAddress } from "./rate-limit";

describe("createRateLimiter", () => {
	it("gives each limiter its own counts", () => {
		const a = createRateLimiter();
		const b = createRateLimiter();

		for (let i = 0; i < 5; i++) a.allow("client", 1000);

		expect(a.allow("client", 1000)).toBe(false);
		expect(b.allow("client", 1000)).toBe(true);
	});

	it("applies the given limit and window", () => {
		const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });

		expect(limiter.allow("client", 0)).toBe(true);
		expect(limiter.allow("client", 0)).toBe(true);
		expect(limiter.allow("client", 999)).toBe(false);
		expect(limiter.allow("client", 1000)).toBe(true);
	});

	it("forgets everything on reset", () => {
		const limiter = createRateLimiter();
		for (let i = 0; i < 5; i++) limiter.allow("client", 1000);

		limiter.reset();

		expect(limiter.allow("client", 1000)).toBe(true);
	});
});

describe("clientAddress", () => {
	const request = (headers: Record<string, string>) =>
		new Request("http://localhost/", { headers });

	it("reads the first forwarded address, then the real IP", () => {
		expect(
			clientAddress(request({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })),
		).toBe("1.1.1.1");
		expect(clientAddress(request({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
		expect(clientAddress(request({}))).toBe("unknown");
	});
});
