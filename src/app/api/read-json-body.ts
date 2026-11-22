/** Largest JSON body the public routes accept: a 5000-character message weighs 20 KB at most. */
export const MAX_JSON_BODY_BYTES = 32 * 1024;

export type JsonBodyResult =
	{ ok: true; value: unknown } | { ok: false; reason: "too-large" | "invalid" };

/**
 * Reads the body of `request` as JSON without ever holding more than `maxBytes` of it: the
 * `content-length` header is checked first, and the bytes actually received are counted, which
 * also covers a body sent in chunks with no length announced.
 */
export default async function readJsonBody(
	request: Request,
	maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<JsonBodyResult> {
	const announced = Number(request.headers.get("content-length"));
	if (Number.isFinite(announced) && announced > maxBytes) {
		return { ok: false, reason: "too-large" };
	}

	const chunks: Uint8Array[] = [];
	let received = 0;
	const reader = request.body?.getReader();
	if (reader) {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			received += value.byteLength;
			if (received > maxBytes) {
				await reader.cancel();
				return { ok: false, reason: "too-large" };
			}
			chunks.push(value);
		}
	}

	const bytes = new Uint8Array(received);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	try {
		return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
	} catch {
		return { ok: false, reason: "invalid" };
	}
}
