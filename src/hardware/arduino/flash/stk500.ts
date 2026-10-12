import type { SerialTransport } from "../remote-io/transport";
import { FLASH_PAGE_SIZE } from "./intel-hex";

const STK = {
	INSYNC: 0x14,
	OK: 0x10,
	EOP: 0x20,
	GET_SYNC: 0x30,
	ENTER_PROGMODE: 0x50,
	LEAVE_PROGMODE: 0x51,
	LOAD_ADDRESS: 0x55,
	PROG_PAGE: 0x64,
	READ_PAGE: 0x74,
	READ_SIGN: 0x75,
} as const;

/** Device signature of the ATmega328P, the microcontroller of the Arduino Uno R3. */
const ATMEGA328P_SIGNATURE = [0x1e, 0x95, 0x0f];

export type FlashErrorCode =
	/** The bootloader did not answer: not an Optiboot board, or the port is busy. */
	| "sync-failed"
	/** The bootloader answered something that is not STK500. */
	| "protocol-error"
	/** The board is not an ATmega328P. */
	| "unsupported-board"
	/** The flash content read back differs from the image. */
	| "verify-failed"
	| "transport"
	/** The firmware image shipped with Studomate could not be loaded. */
	| "firmware-unavailable"
	| "cancelled";

export class FlashError extends Error {
	constructor(
		readonly code: FlashErrorCode,
		readonly detail?: string,
	) {
		super(detail ? `${code}: ${detail}` : code);
	}
}

export interface FlashProgress {
	phase: "write" | "verify";
	/** Pages done in this phase. */
	done: number;
	total: number;
}

export interface FlashOptions {
	transport: SerialTransport;
	/** Whole pages, see `parseIntelHex`. */
	image: Uint8Array;
	onProgress?: (progress: FlashProgress) => void;
	signal?: AbortSignal;
	pageSize?: number;
	syncAttempts?: number;
	syncIntervalMs?: number;
	commandTimeoutMs?: number;
	/** Quiet time required after the sync, so that late replies to earlier sync requests are flushed. */
	settleMs?: number;
}

/** Received bytes, one per character of the transport's strings. */
class ByteQueue {
	private bytes: number[] = [];
	private waiter: (() => void) | null = null;

	push(chunk: string) {
		for (let i = 0; i < chunk.length; i++)
			this.bytes.push(chunk.charCodeAt(i) & 0xff);
		this.waiter?.();
	}

	clear() {
		this.bytes = [];
	}

	/** Discards everything received until no byte arrives for `quietMs`. */
	async waitUntilQuiet(quietMs: number) {
		do {
			this.bytes = [];
		} while ((await this.take(1, quietMs)) !== null);
	}

	async take(count: number, timeoutMs: number): Promise<number[] | null> {
		const deadline = Date.now() + timeoutMs;
		while (this.bytes.length < count) {
			const left = deadline - Date.now();
			if (left <= 0) return null;
			await new Promise<void>((resolve) => {
				const timer = setTimeout(resolve, left);
				this.waiter = () => {
					clearTimeout(timer);
					resolve();
				};
			});
			this.waiter = null;
		}
		return this.bytes.splice(0, count);
	}
}

const toBinaryString = (bytes: number[]) => String.fromCharCode(...bytes);

/**
 * Writes `image` to the flash of an Optiboot board over STK500v1: reset, sync, signature check,
 * page programming, read-back verification, then start of the new program. The transport is
 * opened (which resets the board) and closed by this function.
 */
export async function flashFirmware(options: FlashOptions): Promise<void> {
	const {
		transport,
		image,
		onProgress,
		signal,
		pageSize = FLASH_PAGE_SIZE,
		syncAttempts = 30,
		syncIntervalMs = 100,
		commandTimeoutMs = 1000,
		settleMs = 150,
	} = options;
	const queue = new ByteQueue();
	const unsubscribe = transport.onData((chunk) => queue.push(chunk));
	const checkNotCancelled = () => {
		if (signal?.aborted) throw new FlashError("cancelled");
	};

	const command = async (bytes: number[], responseLength: number) => {
		checkNotCancelled();
		queue.clear();
		try {
			await transport.write(toBinaryString(bytes));
		} catch (cause) {
			throw new FlashError("transport", String(cause));
		}
		const reply = await queue.take(responseLength + 2, commandTimeoutMs);
		if (!reply) throw new FlashError("protocol-error", "timeout");
		if (reply[0] !== STK.INSYNC || reply[reply.length - 1] !== STK.OK) {
			throw new FlashError("protocol-error", "unexpected reply");
		}
		return reply.slice(1, -1);
	};

	const loadAddress = (pageIndex: number) => {
		const wordAddress = (pageIndex * pageSize) >> 1;
		return command(
			[STK.LOAD_ADDRESS, wordAddress & 0xff, wordAddress >> 8, STK.EOP],
			0,
		);
	};

	try {
		try {
			await transport.open();
		} catch (cause) {
			throw new FlashError("transport", String(cause));
		}

		let synced = false;
		for (let attempt = 0; attempt < syncAttempts && !synced; attempt++) {
			checkNotCancelled();
			queue.clear();
			await transport.write(toBinaryString([STK.GET_SYNC, STK.EOP]));
			const reply = await queue.take(2, syncIntervalMs);
			synced = reply?.[0] === STK.INSYNC && reply[1] === STK.OK;
		}
		if (!synced) throw new FlashError("sync-failed");
		await queue.waitUntilQuiet(settleMs);

		const signature = await command([STK.READ_SIGN, STK.EOP], 3);
		if (signature.some((byte, i) => byte !== ATMEGA328P_SIGNATURE[i])) {
			throw new FlashError("unsupported-board", signature.join(","));
		}

		await command([STK.ENTER_PROGMODE, STK.EOP], 0);
		const pages = image.length / pageSize;

		for (let page = 0; page < pages; page++) {
			await loadAddress(page);
			await command(
				[
					STK.PROG_PAGE,
					pageSize >> 8,
					pageSize & 0xff,
					0x46, // 'F': flash memory
					...image.subarray(page * pageSize, (page + 1) * pageSize),
					STK.EOP,
				],
				0,
			);
			onProgress?.({ phase: "write", done: page + 1, total: pages });
		}

		for (let page = 0; page < pages; page++) {
			await loadAddress(page);
			const content = await command(
				[STK.READ_PAGE, pageSize >> 8, pageSize & 0xff, 0x46, STK.EOP],
				pageSize,
			);
			const expected = image.subarray(page * pageSize, (page + 1) * pageSize);
			if (content.some((byte, i) => byte !== expected[i])) {
				throw new FlashError("verify-failed", `page ${page}`);
			}
			onProgress?.({ phase: "verify", done: page + 1, total: pages });
		}

		await command([STK.LEAVE_PROGMODE, STK.EOP], 0);
	} catch (error) {
		throw error instanceof FlashError
			? error
			: new FlashError("transport", String(error));
	} finally {
		unsubscribe();
		await transport.close().catch(() => {});
	}
}
