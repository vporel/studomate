export interface TelemetrySnapshot {
	/** Cycle counter of the program that produced the snapshot, modulo 65536. */
	cycle: number;
	memory: Uint8Array;
}

export interface TelemetryChunk {
	tag: number;
	cycle: number;
	offset: number;
	data: Uint8Array;
}

/**
 * Puts the `TEL` frames of one image of the variable memory back together. The board writes
 * the memory in consecutive frames between two turns of its loop, and its program may run a
 * cycle in between: only frames of one cycle make a snapshot, any other set is dropped.
 */
export default class TelemetryAssembler {
	private memory: Uint8Array;
	private cycle = -1;
	private filled = 0;

	constructor(private readonly size: number) {
		this.memory = new Uint8Array(size);
	}

	/** The snapshot completed by this frame, if it completes one. */
	push(chunk: TelemetryChunk): TelemetrySnapshot | null {
		if (chunk.offset === 0) {
			this.cycle = chunk.cycle;
			this.filled = 0;
		} else if (chunk.cycle !== this.cycle || chunk.offset !== this.filled) {
			this.filled = 0;
			this.cycle = -1;
			return null;
		}
		if (chunk.offset + chunk.data.length > this.size) {
			this.cycle = -1;
			this.filled = 0;
			return null;
		}
		this.memory.set(chunk.data, chunk.offset);
		this.filled += chunk.data.length;
		if (this.filled < this.size) return null;
		const snapshot = { cycle: this.cycle, memory: this.memory.slice() };
		this.cycle = -1;
		this.filled = 0;
		return snapshot;
	}
}
