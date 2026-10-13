import TelemetryAssembler from "./telemetry-assembler";

const chunk = (
	cycle: number,
	offset: number,
	bytes: number[],
	tag = 0xabcd,
) => ({
	tag,
	cycle,
	offset,
	data: Uint8Array.from(bytes),
});

describe("TelemetryAssembler", () => {
	it("completes a snapshot from consecutive frames of one cycle", () => {
		const assembler = new TelemetryAssembler(5);
		expect(assembler.push(chunk(7, 0, [1, 2]))).toBeNull();
		expect(assembler.push(chunk(7, 2, [3, 4]))).toBeNull();
		const snapshot = assembler.push(chunk(7, 4, [5]));
		expect(snapshot?.cycle).toBe(7);
		expect([...snapshot!.memory]).toEqual([1, 2, 3, 4, 5]);
	});

	it("completes a snapshot made of a single frame", () => {
		const assembler = new TelemetryAssembler(3);
		expect([...assembler.push(chunk(1, 0, [9, 8, 7]))!.memory]).toEqual([
			9, 8, 7,
		]);
	});

	it("drops a set whose frames come from two cycles", () => {
		const assembler = new TelemetryAssembler(4);
		assembler.push(chunk(7, 0, [1, 2]));
		expect(assembler.push(chunk(8, 2, [3, 4]))).toBeNull();
		// The next complete image is still delivered.
		expect(assembler.push(chunk(9, 0, [5, 6]))).toBeNull();
		expect([...assembler.push(chunk(9, 2, [7, 8]))!.memory]).toEqual([
			5, 6, 7, 8,
		]);
	});

	it("drops a set that misses a frame", () => {
		const assembler = new TelemetryAssembler(6);
		assembler.push(chunk(3, 0, [1, 2]));
		expect(assembler.push(chunk(3, 4, [5, 6]))).toBeNull();
	});

	it("starts again at each frame at offset 0, abandoning an unfinished image", () => {
		const assembler = new TelemetryAssembler(4);
		assembler.push(chunk(1, 0, [1, 2]));
		assembler.push(chunk(2, 0, [3, 4]));
		expect([...assembler.push(chunk(2, 2, [5, 6]))!.memory]).toEqual([
			3, 4, 5, 6,
		]);
	});

	it("drops a frame that overruns the memory", () => {
		const assembler = new TelemetryAssembler(2);
		expect(assembler.push(chunk(1, 0, [1, 2, 3]))).toBeNull();
	});

	it("returns an independent copy of each snapshot", () => {
		const assembler = new TelemetryAssembler(2);
		const first = assembler.push(chunk(1, 0, [1, 2]))!;
		assembler.push(chunk(2, 0, [9, 9]));
		expect([...first.memory]).toEqual([1, 2]);
	});
});
