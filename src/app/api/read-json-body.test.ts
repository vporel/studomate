import readJsonBody, { MAX_JSON_BODY_BYTES } from "./read-json-body";

const encoder = new TextEncoder();

/** A request whose body arrives in the given chunks, with no `content-length` announced. */
function chunkedRequest(chunks: string[]): Request {
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
	return new Request("http://localhost/api/x", {
		method: "POST",
		body: stream,
		// Required by Node for a streamed body.
		duplex: "half",
	} as RequestInit);
}

function textRequest(body: string, headers: Record<string, string> = {}) {
	return new Request("http://localhost/api/x", {
		method: "POST",
		headers: { "Content-Type": "application/json", ...headers },
		body,
	});
}

describe("readJsonBody", () => {
	it("parses a small JSON body", async () => {
		await expect(readJsonBody(textRequest('{"a":1}'))).resolves.toEqual({
			ok: true,
			value: { a: 1 },
		});
	});

	it("reassembles a body received in several chunks", async () => {
		await expect(
			readJsonBody(chunkedRequest(['{"mes', 'sage":"bon', 'jour"}'])),
		).resolves.toEqual({ ok: true, value: { message: "bonjour" } });
	});

	it("keeps multi-byte characters split across two chunks intact", async () => {
		const bytes = encoder.encode('{"a":"é"}');
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(bytes.slice(0, 7));
				controller.enqueue(bytes.slice(7));
				controller.close();
			},
		});
		const request = new Request("http://localhost/api/x", {
			method: "POST",
			body: stream,
			duplex: "half",
		} as RequestInit);

		await expect(readJsonBody(request)).resolves.toEqual({
			ok: true,
			value: { a: "é" },
		});
	});

	it("refuses a body that is not JSON", async () => {
		await expect(readJsonBody(textRequest("not json"))).resolves.toEqual({
			ok: false,
			reason: "invalid",
		});
	});

	it("refuses an empty body", async () => {
		await expect(readJsonBody(textRequest(""))).resolves.toEqual({
			ok: false,
			reason: "invalid",
		});
	});

	it("refuses at once a body announced as too large, without reading it", async () => {
		const request = textRequest("{}", {
			"content-length": String(MAX_JSON_BODY_BYTES + 1),
		});
		const read = jest.spyOn(request.body!, "getReader");

		await expect(readJsonBody(request)).resolves.toEqual({
			ok: false,
			reason: "too-large",
		});
		expect(read).not.toHaveBeenCalled();
	});

	it("accepts a body announced at exactly the limit", async () => {
		const request = textRequest('{"a":1}', {
			"content-length": String(MAX_JSON_BODY_BYTES),
		});

		await expect(readJsonBody(request)).resolves.toMatchObject({ ok: true });
	});

	it("refuses a body that is too large when no length is announced", async () => {
		const request = chunkedRequest(["{", "x".repeat(MAX_JSON_BODY_BYTES), "}"]);

		await expect(readJsonBody(request)).resolves.toEqual({
			ok: false,
			reason: "too-large",
		});
	});

	it("stops reading as soon as the limit is exceeded", async () => {
		let pulled = 0;
		const stream = new ReadableStream<Uint8Array>({
			pull(controller) {
				pulled++;
				controller.enqueue(encoder.encode("x".repeat(1024)));
			},
		});
		const request = new Request("http://localhost/api/x", {
			method: "POST",
			body: stream,
			duplex: "half",
		} as RequestInit);

		await expect(readJsonBody(request, 4096)).resolves.toEqual({
			ok: false,
			reason: "too-large",
		});
		expect(pulled).toBeLessThan(20);
	});

	it("counts the bytes received, not the length the client announces", async () => {
		const request = chunkedRequest(["x".repeat(200)]);
		request.headers.set("content-length", "10");

		await expect(readJsonBody(request, 100)).resolves.toEqual({
			ok: false,
			reason: "too-large",
		});
	});

	it("honours the limit given by the caller", async () => {
		await expect(
			readJsonBody(textRequest(JSON.stringify({ a: "x".repeat(50) })), 20),
		).resolves.toEqual({ ok: false, reason: "too-large" });
	});

	it("ignores an unusable content-length", async () => {
		const request = textRequest('{"a":1}', { "content-length": "abc" });

		await expect(readJsonBody(request)).resolves.toMatchObject({ ok: true });
	});
});
