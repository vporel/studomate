import { createRandomId } from "@/simulator/utils/ids";

describe("createRandomId", () => {
	it("returns a string of length 15", () => {
		const id = createRandomId();
		expect(typeof id).toBe("string");
		expect(id.length).toBe(15);
	});

	it("produces different ids on subsequent calls", () => {
		const a = createRandomId();
		const b = createRandomId();
		expect(a).not.toBe(b);
	});
});
