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

	describe("sweeping of the expired clients", () => {
		const WINDOW = 1000;

		it("forgets a client whose requests all left the window", () => {
			const limiter = createRateLimiter({ maxRequests: 1, windowMs: WINDOW });
			limiter.allow("old", 0);
			expect(limiter.allow("old", 500)).toBe(false);

			//Another client's request, a window later, triggers the sweep
			limiter.allow("other", WINDOW + 1);

			expect(limiter.allow("old", WINDOW + 2)).toBe(true);
		});

		it("keeps the count of a client still inside the window", () => {
			const limiter = createRateLimiter({ maxRequests: 1, windowMs: WINDOW });
			limiter.allow("recent", 1500);

			limiter.allow("other", 2 * WINDOW);

			expect(limiter.allow("recent", 2 * WINDOW)).toBe(false);
		});

		it("restarts the sweep clock on reset", () => {
			const limiter = createRateLimiter({ maxRequests: 1, windowMs: WINDOW });
			limiter.allow("old", 0);
			limiter.reset();
			limiter.allow("old", 10);

			limiter.allow("other", WINDOW + 20);

			expect(limiter.allow("old", WINDOW + 21)).toBe(true);
		});
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

	it("reads the only forwarded address", () => {
		expect(clientAddress(request({ "x-forwarded-for": "1.1.1.1" }))).toBe(
			"1.1.1.1",
		);
	});

	it("reads the last forwarded address, the one appended by the proxy", () => {
		expect(
			clientAddress(
				request({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 2.2.2.2" }),
			),
		).toBe("2.2.2.2");
	});

	it("ignores whatever prefix the visitor forged", () => {
		const first = clientAddress(
			request({ "x-forwarded-for": "9.9.9.1, 2.2.2.2" }),
		);
		const second = clientAddress(
			request({ "x-forwarded-for": "9.9.9.2, 2.2.2.2" }),
		);

		expect(first).toBe(second);
	});

	it("trims spaces and skips empty entries", () => {
		expect(
			clientAddress(request({ "x-forwarded-for": " 1.1.1.1 ,  2.2.2.2 , " })),
		).toBe("2.2.2.2");
	});

	it("falls back to the real IP, then to unknown", () => {
		expect(clientAddress(request({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
		expect(
			clientAddress(
				request({ "x-forwarded-for": " , ", "x-real-ip": "3.3.3.3" }),
			),
		).toBe("3.3.3.3");
		expect(clientAddress(request({}))).toBe("unknown");
	});
});
