import WebSerialTransport, {
	ARDUINO_USB_VENDOR_IDS,
	acquireArduinoPort,
} from "./web-serial.transport";

function fakePort() {
	const incoming: Array<Uint8Array | "end" | Error> = [];
	let wake: (() => void) | null = null;
	const written: Uint8Array[] = [];
	const events = new Map<string, () => void>();
	const reader = {
		read: jest.fn(async () => {
			while (incoming.length === 0) await new Promise<void>((r) => (wake = r));
			const next = incoming.shift()!;
			if (next instanceof Error) throw next;
			return next === "end"
				? { done: true, value: undefined }
				: { done: false, value: next };
		}),
		cancel: jest.fn(async () => {
			incoming.push("end");
			wake?.();
		}),
		releaseLock: jest.fn(),
	};
	const writer = {
		write: jest.fn(async (data: Uint8Array) => void written.push(data)),
		releaseLock: jest.fn(),
	};
	const port = {
		open: jest.fn(async () => {}),
		close: jest.fn(async () => {}),
		setSignals: jest.fn(async () => {}),
		readable: { getReader: () => reader },
		writable: { getWriter: () => writer },
		addEventListener: (name: string, fn: () => void) => events.set(name, fn),
		removeEventListener: (name: string) => events.delete(name),
	};
	return {
		port: port as unknown as SerialPort,
		mocks: port,
		reader,
		written,
		events,
		push(value: Uint8Array | "end" | Error) {
			incoming.push(value);
			wake?.();
		},
	};
}

const bytes = (text: string) => new TextEncoder().encode(text);
const opts = { baudRate: 115200, resetPulseMs: 1, bootDelayMs: 1 };
const tick = () => new Promise((r) => setTimeout(r, 5));

describe("WebSerialTransport", () => {
	it("opens at the baud rate and pulses DTR/RTS low then high", async () => {
		const fake = fakePort();
		await new WebSerialTransport(fake.port, opts).open();

		expect(fake.mocks.open).toHaveBeenCalledWith({ baudRate: 115200 });
		expect(fake.mocks.setSignals.mock.calls).toEqual([
			[{ dataTerminalReady: false, requestToSend: false }],
			[{ dataTerminalReady: true, requestToSend: true }],
		]);
	});

	it("writes text as bytes", async () => {
		const fake = fakePort();
		const transport = new WebSerialTransport(fake.port, opts);
		await transport.open();

		await transport.write("PING*00\n");

		expect(new TextDecoder().decode(fake.written[0])).toBe("PING*00\n");
	});

	it("writes each character as one raw byte, above 0x7F included", async () => {
		const fake = fakePort();
		const transport = new WebSerialTransport(fake.port, opts);
		await transport.open();

		await transport.write("\u0080\u00ffA");

		expect(Array.from(fake.written[0])).toEqual([0x80, 0xff, 0x41]);
	});

	it("refuses to write when not open", async () => {
		const transport = new WebSerialTransport(fakePort().port, opts);
		await expect(transport.write("x")).rejects.toThrow("not open");
	});

	it("delivers received bytes as text, keeping a split multi-byte stream intact", async () => {
		const fake = fakePort();
		const transport = new WebSerialTransport(fake.port, opts);
		const chunks: string[] = [];
		transport.onData((chunk) => chunks.push(chunk));
		await transport.open();

		fake.push(bytes("IN 2="));
		fake.push(bytes("1*00\n"));
		await tick();

		expect(chunks.join("")).toBe("IN 2=1*00\n");
	});

	it("delivers every byte value unchanged, including 0x80 to 0x9F", async () => {
		const fake = fakePort();
		const transport = new WebSerialTransport(fake.port, opts);
		const chunks: string[] = [];
		transport.onData((chunk) => chunks.push(chunk));
		await transport.open();
		const all = Uint8Array.from({ length: 256 }, (_, i) => i);

		fake.push(all);
		await tick();

		expect(Array.from(chunks.join(""), (c) => c.charCodeAt(0))).toEqual(
			Array.from(all),
		);
	});

	it("notifies a close when the stream ends or fails, but not on close()", async () => {
		const failing = fakePort();
		const transportA = new WebSerialTransport(failing.port, opts);
		const onCloseA = jest.fn();
		transportA.onClose(onCloseA);
		await transportA.open();
		failing.push(new Error("device lost"));
		await tick();
		expect(onCloseA).toHaveBeenCalledTimes(1);

		const calm = fakePort();
		const transportB = new WebSerialTransport(calm.port, opts);
		const onCloseB = jest.fn();
		transportB.onClose(onCloseB);
		await transportB.open();
		await transportB.close();
		await tick();
		expect(onCloseB).not.toHaveBeenCalled();
		expect(calm.mocks.close).toHaveBeenCalled();
	});

	it("notifies a close on the port disconnect event", async () => {
		const fake = fakePort();
		const transport = new WebSerialTransport(fake.port, opts);
		const onClose = jest.fn();
		transport.onClose(onClose);
		await transport.open();

		fake.events.get("disconnect")!();

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});

describe("acquireArduinoPort", () => {
	const portOf = (usbVendorId?: number) =>
		({ getInfo: () => ({ usbVendorId }) }) as unknown as SerialPort;
	const mockSerial = (known: SerialPort[], chosen = portOf(0x2341)) => {
		const serial = {
			getPorts: jest.fn(async () => known),
			requestPort: jest.fn(async () => chosen),
		};
		Object.defineProperty(navigator, "serial", {
			configurable: true,
			value: serial,
		});
		return { serial, chosen };
	};

	afterEach(() => {
		Reflect.deleteProperty(navigator, "serial");
	});

	it("offers every supported vendor in the chooser", async () => {
		const { serial, chosen } = mockSerial([]);
		await expect(acquireArduinoPort()).resolves.toBe(chosen);
		expect(serial.requestPort).toHaveBeenCalledWith({
			filters: ARDUINO_USB_VENDOR_IDS.map((usbVendorId) => ({ usbVendorId })),
		});
		expect(ARDUINO_USB_VENDOR_IDS).toEqual(
			expect.arrayContaining([0x2341, 0x2a03, 0x1a86]),
		);
	});

	it.each([0x2341, 0x2a03, 0x1a86])(
		"reuses the single remembered port of vendor %s",
		async (vendorId) => {
			const remembered = portOf(vendorId);
			const { serial } = mockSerial([remembered]);
			await expect(acquireArduinoPort()).resolves.toBe(remembered);
			expect(serial.requestPort).not.toHaveBeenCalled();
		},
	);

	it("ignores remembered ports of other vendors and unknown vendors", async () => {
		const { serial, chosen } = mockSerial([portOf(0x1234), portOf(undefined)]);
		await expect(acquireArduinoPort()).resolves.toBe(chosen);
		expect(serial.requestPort).toHaveBeenCalledTimes(1);
	});

	it("opens the chooser when several supported ports are remembered", async () => {
		const { serial } = mockSerial([portOf(0x2341), portOf(0x1a86)]);
		await acquireArduinoPort();
		expect(serial.requestPort).toHaveBeenCalledTimes(1);
	});
});
