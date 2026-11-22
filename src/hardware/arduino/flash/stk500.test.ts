import FakeOptiboot from "@tests/utils/fake-optiboot";
import { FlashError, flashFirmware, type FlashProgress } from "./stk500";

const FAST = { syncIntervalMs: 5, settleMs: 1, commandTimeoutMs: 100 };

function image(pages: number) {
	return Uint8Array.from({ length: pages * 128 }, (_, i) => (i * 7 + 3) & 0xff);
}

describe("flashFirmware", () => {
	it("writes every page at its word address, verifies, and leaves programming mode", async () => {
		const board = new FakeOptiboot();
		const data = image(3);

		await flashFirmware({ transport: board, image: data, ...FAST });

		expect(board.flashBytes(data.length)).toEqual(Array.from(data));
		expect(board.left).toBe(true);
		expect(board.closed).toBe(true);
	});

	it("reports progress for the write then the verify phase", async () => {
		const board = new FakeOptiboot();
		const events: FlashProgress[] = [];

		await flashFirmware({
			transport: board,
			image: image(2),
			onProgress: (p) => events.push(p),
			...FAST,
		});

		expect(events).toEqual([
			{ phase: "write", done: 1, total: 2 },
			{ phase: "write", done: 2, total: 2 },
			{ phase: "verify", done: 1, total: 2 },
			{ phase: "verify", done: 2, total: 2 },
		]);
	});

	it("retries the sync until the bootloader answers", async () => {
		const board = new FakeOptiboot({ ignoredSyncs: 3 });
		await expect(
			flashFirmware({ transport: board, image: image(1), ...FAST }),
		).resolves.toBeUndefined();
	});

	it("fails with sync-failed when nothing answers, and closes the port", async () => {
		const board = new FakeOptiboot({ silent: true });
		await expect(
			flashFirmware({
				transport: board,
				image: image(1),
				syncAttempts: 3,
				...FAST,
			}),
		).rejects.toMatchObject({ code: "sync-failed" });
		expect(board.closed).toBe(true);
	});

	it("is not fooled by late replies to earlier sync requests", async () => {
		const board = new FakeOptiboot({ lateSyncReplyMs: 30 });
		const data = image(2);

		await flashFirmware({
			transport: board,
			image: data,
			...FAST,
			settleMs: 80,
		});

		expect(board.flashBytes(data.length)).toEqual(Array.from(data));
	});

	it("refuses a board that is not an ATmega328P, without writing", async () => {
		const board = new FakeOptiboot({ signature: [0x1e, 0x95, 0x14] });
		await expect(
			flashFirmware({ transport: board, image: image(1), ...FAST }),
		).rejects.toMatchObject({ code: "unsupported-board" });
		expect(board.flash.size).toBe(0);
	});

	it("fails with verify-failed when the read-back differs", async () => {
		const board = new FakeOptiboot({ corruptReadPage: 1 });
		await expect(
			flashFirmware({ transport: board, image: image(2), ...FAST }),
		).rejects.toMatchObject({ code: "verify-failed", detail: "page 1" });
		expect(board.left).toBe(false);
	});

	it("fails with protocol-error on a reply that is not STK500", async () => {
		const board = new FakeOptiboot({ garbage: true });
		await expect(
			flashFirmware({
				transport: board,
				image: image(1),
				syncAttempts: 2,
				...FAST,
			}),
		).rejects.toBeInstanceOf(FlashError);
	});

	it("fails with transport when the port cannot be opened", async () => {
		const board = new FakeOptiboot({ failOpen: true });
		await expect(
			flashFirmware({ transport: board, image: image(1), ...FAST }),
		).rejects.toMatchObject({ code: "transport" });
	});

	describe("when the cable is pulled", () => {
		const SLOW = { ...FAST, commandTimeoutMs: 1000 };

		it("fails with transport between two pages, without sending anything more", async () => {
			const board = new FakeOptiboot();
			const promise = flashFirmware({
				transport: board,
				image: image(4),
				onProgress: () => board.unplug(),
				...FAST,
			});

			await expect(promise).rejects.toMatchObject({ code: "transport" });
			expect(board.closed).toBe(true);
			expect(board.left).toBe(false);
		});

		it("fails with transport at once when a command is waiting for its reply", async () => {
			const board = new FakeOptiboot();
			const started = Date.now();
			const promise = flashFirmware({
				transport: board,
				image: image(4),
				onProgress: () => {
					board.goSilent();
					setTimeout(() => board.unplug(), 10);
				},
				...SLOW,
			});

			await expect(promise).rejects.toMatchObject({ code: "transport" });
			expect(Date.now() - started).toBeLessThan(500);
			expect(board.closed).toBe(true);
		});

		it("fails with transport, not sync-failed, when it happens while syncing", async () => {
			const board = new FakeOptiboot({ silent: true });
			setTimeout(() => board.unplug(), 10);
			const started = Date.now();

			await expect(
				flashFirmware({
					transport: board,
					image: image(1),
					syncAttempts: 200,
					syncIntervalMs: 20,
					settleMs: 1,
					commandTimeoutMs: 1000,
				}),
			).rejects.toMatchObject({ code: "transport" });
			expect(Date.now() - started).toBeLessThan(500);
		});

		it("fails with transport during the verification", async () => {
			const board = new FakeOptiboot();
			const promise = flashFirmware({
				transport: board,
				image: image(2),
				onProgress: ({ phase }) => {
					if (phase === "verify") board.unplug();
				},
				...FAST,
			});

			await expect(promise).rejects.toMatchObject({ code: "transport" });
		});

		it("is not reported once the flash is over", async () => {
			const board = new FakeOptiboot();

			await flashFirmware({ transport: board, image: image(1), ...FAST });
			board.unplug();

			expect(board.left).toBe(true);
		});
	});

	it("can be cancelled between steps", async () => {
		const board = new FakeOptiboot();
		const controller = new AbortController();
		const promise = flashFirmware({
			transport: board,
			image: image(4),
			signal: controller.signal,
			onProgress: () => controller.abort(),
			...FAST,
		});
		await expect(promise).rejects.toMatchObject({ code: "cancelled" });
		expect(board.left).toBe(false);
		expect(board.closed).toBe(true);
	});

	it("handles image bytes above 0x7F as raw bytes", async () => {
		const board = new FakeOptiboot();
		const data = new Uint8Array(128).fill(0xff);
		data[0] = 0x80;
		data[1] = 0xc3;
		await flashFirmware({ transport: board, image: data, ...FAST });
		expect(board.flashBytes(2)).toEqual([0x80, 0xc3]);
	});
});
