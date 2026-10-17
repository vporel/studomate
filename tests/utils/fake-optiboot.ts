import type { SerialTransport } from "@/hardware/arduino/remote-io/transport";

export interface FakeOptibootOptions {
	signature?: number[];
	/** The bootloader never answers. */
	silent?: boolean;
	/** The first sync requests get no answer, like a bootloader that is still starting. */
	ignoredSyncs?: number;
	/** Flips one bit of the page read back. */
	corruptReadPage?: number;
	/** Answers every command with garbage. */
	garbage?: boolean;
	/** Each sync request also gets a second answer, this many milliseconds later. */
	lateSyncReplyMs?: number;
	failOpen?: boolean;
	pageSize?: number;
}

/** In-memory Optiboot speaking STK500v1, as a `SerialTransport` carrying one byte per character. */
export default class FakeOptiboot implements SerialTransport {
	readonly flash = new Map<number, number>();
	opened = false;
	closed = false;
	left = false;
	openCount = 0;
	private listeners = new Set<(chunk: string) => void>();
	private pending: number[] = [];
	private wordAddress = 0;
	private syncsSeen = 0;
	private readonly options: Required<FakeOptibootOptions>;

	constructor(options: FakeOptibootOptions = {}) {
		this.options = {
			signature: [0x1e, 0x95, 0x0f],
			silent: false,
			ignoredSyncs: 0,
			corruptReadPage: -1,
			garbage: false,
			lateSyncReplyMs: 0,
			failOpen: false,
			pageSize: 128,
			...options,
		};
	}

	async open() {
		if (this.options.failOpen) throw new Error("port busy");
		this.opened = true;
		this.closed = false;
		this.openCount++;
	}

	async close() {
		this.closed = true;
	}

	onData(listener: (chunk: string) => void) {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	onClose() {
		return () => {};
	}

	async write(data: string) {
		for (let i = 0; i < data.length; i++) this.pending.push(data.charCodeAt(i));
		this.consume();
	}

	/** Content of the flash from address 0, `length` bytes. */
	flashBytes(length: number): number[] {
		return Array.from({ length }, (_, i) => this.flash.get(i) ?? 0xff);
	}

	private reply(bytes: number[]) {
		if (this.options.silent) return;
		const out = this.options.garbage ? [0x00, 0x01] : bytes;
		const text = String.fromCharCode(...out);
		for (const listener of this.listeners) listener(text);
	}

	private consume() {
		const p = this.pending;
		for (;;) {
			if (p.length === 0) return;
			const cmd = p[0];
			const need =
				cmd === 0x30 || cmd === 0x50 || cmd === 0x51 || cmd === 0x75
					? 2
					: cmd === 0x55
						? 4
						: cmd === 0x74
							? 5
							: cmd === 0x64
								? 4 + ((p[1] << 8) | p[2]) + 1
								: 1;
			if (p.length < need) return;
			const frame = p.splice(0, need);
			this.execute(frame);
		}
	}

	private execute(frame: number[]) {
		const { pageSize } = this.options;
		switch (frame[0]) {
			case 0x30:
				if (this.syncsSeen++ < this.options.ignoredSyncs) return;
				this.reply([0x14, 0x10]);
				if (this.options.lateSyncReplyMs > 0) {
					setTimeout(
						() => this.reply([0x14, 0x10]),
						this.options.lateSyncReplyMs,
					);
				}
				return;
			case 0x75:
				this.reply([0x14, ...this.options.signature, 0x10]);
				return;
			case 0x50:
				this.reply([0x14, 0x10]);
				return;
			case 0x51:
				this.left = true;
				this.reply([0x14, 0x10]);
				return;
			case 0x55:
				this.wordAddress = frame[1] | (frame[2] << 8);
				this.reply([0x14, 0x10]);
				return;
			case 0x64: {
				const data = frame.slice(4, frame.length - 1);
				data.forEach((value, i) =>
					this.flash.set(this.wordAddress * 2 + i, value),
				);
				this.reply([0x14, 0x10]);
				return;
			}
			case 0x74: {
				const base = this.wordAddress * 2;
				const page = base / pageSize;
				const data = Array.from(
					{ length: pageSize },
					(_, i) => this.flash.get(base + i) ?? 0xff,
				);
				if (page === this.options.corruptReadPage) data[0] ^= 0x01;
				this.reply([0x14, ...data, 0x10]);
				return;
			}
			default:
				this.reply([0x14, 0x10]);
		}
	}
}
