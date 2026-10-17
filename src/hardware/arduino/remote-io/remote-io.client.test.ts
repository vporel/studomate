import FakeRemoteIoBoard, {
	createManualHeartbeat,
} from "@tests/utils/fake-remote-io-board";
import { encodeFrame } from "./frame";
import generateBytecode from "@/bytecode/bytecode.generator";
import {
	compiledProject,
	plcVariable,
	UNO_PIN_RANGE,
} from "@tests/utils/bytecode-program";
import RemoteIoClient, {
	RemoteIoError,
	remoteIoFailureCode,
	type RemoteIoInputValues,
	type RemoteIoState,
} from "./remote-io.client";
import type { RemoteIoPlan } from "./remote-io-plan";

const PLAN: RemoteIoPlan = {
	pins: [
		{ pin: "2", mode: "IP" },
		{ pin: "3", mode: "I" },
		{ pin: "A0", mode: "A" },
		{ pin: "13", mode: "O" },
		{ pin: "9", mode: "P" },
	],
	inputs: [
		{ variableId: "bp", pin: "2", kind: "digital", inverted: true },
		{ variableId: "capteur", pin: "3", kind: "digital", inverted: false },
		{ variableId: "pot", pin: "A0", kind: "analog", inverted: false },
	],
	outputs: [
		{
			variableId: "led",
			pin: "13",
			kind: "digital",
			range: { min: 0, max: 1 },
		},
		{
			variableId: "pwm",
			pin: "9",
			kind: "analog",
			range: { min: 0, max: 255 },
		},
	],
};

function setup(
	options: ConstructorParameters<typeof FakeRemoteIoBoard>[0] = {},
	plan = PLAN,
) {
	const board = new FakeRemoteIoBoard(options);
	const heartbeat = createManualHeartbeat();
	const client = new RemoteIoClient({
		transport: board,
		plan,
		heartbeat: heartbeat.scheduler,
		handshakeTimeoutMs: 80,
		pingIntervalMs: 10,
		configTimeoutMs: 80,
		uploadAckTimeoutMs: 40,
	});
	const states: RemoteIoState[] = [];
	client.onStateChange((state) => states.push(state));
	return { board, heartbeat, client, states };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** Holds every board answer until `release` is called, like a slow serial link. */
const holdAnswers = (board: FakeRemoteIoBoard) => {
	const target = board as unknown as { answer: (frame: unknown) => void };
	const original = target.answer.bind(board);
	const held: Array<() => void> = [];
	target.answer = (frame) => held.push(() => original(frame));
	return {
		release: () => held.splice(0).forEach((answer) => answer()),
		pending: () => held.length,
	};
};

describe("RemoteIoClient.connect", () => {
	it("pings, reads the PONG, sends the configuration and becomes linked", async () => {
		const { board, client, states } = setup();

		const info = await client.connect();

		expect(info).toEqual({
			protocol: "1.0",
			firmware: "1.0.0",
			inputPeriodMs: 20,
		});
		expect(client.getState()).toBe("linked");
		expect(states).toEqual(["connecting", "linked"]);
		const cfg = board.received.find((frame) => frame.command === "CFG");
		expect(cfg?.args).toEqual(["2:IP", "3:I", "A0:A", "13:O", "9:P"]);
		expect(board.received[0].command).toBe("PING");
	});

	it("starts the heartbeat at 150 ms by default once linked", async () => {
		const { client, heartbeat } = setup();
		expect(heartbeat.state.tick).toBeNull();

		await client.connect();

		expect(heartbeat.state.intervalMs).toBe(150);
		expect(heartbeat.state.tick).not.toBeNull();
	});

	it("ignores boot garbage, bad frames and stray text before the PONG", async () => {
		const { client } = setup({ bootGarbage: "\u0000ÿWD\nOptiboot??\n" });
		await expect(client.connect()).resolves.toBeDefined();
	});

	it("fails with handshake-timeout when no firmware answers, and closes the port", async () => {
		const { board, client, states } = setup({ firmwarePresent: false });

		await expect(client.connect()).rejects.toMatchObject({
			code: "handshake-timeout",
		});

		expect(client.getState()).toBe("disconnected");
		expect(board.closed).toBe(true);
		expect(states).toEqual(["connecting", "disconnected"]);
	});

	it("fails with protocol-mismatch on another major version", async () => {
		const { client } = setup({ protocol: "2.0" });
		await expect(client.connect()).rejects.toMatchObject({
			code: "protocol-mismatch",
			detail: "2.0",
		});
	});

	it("fails with firmware-outdated when the firmware is older than the minimum", async () => {
		const board = new FakeRemoteIoBoard({ firmware: "0.9.0" });
		const client = new RemoteIoClient({
			transport: board,
			plan: PLAN,
			heartbeat: createManualHeartbeat().scheduler,
			minFirmwareVersion: "1.0.0",
			handshakeTimeoutMs: 80,
			pingIntervalMs: 10,
		});
		await expect(client.connect()).rejects.toMatchObject({
			code: "firmware-outdated",
			detail: "0.9.0",
		});
		expect(client.getState()).toBe("disconnected");
	});

	it("accepts a firmware at or above the minimum", async () => {
		const board = new FakeRemoteIoBoard({ firmware: "1.2.0" });
		const client = new RemoteIoClient({
			transport: board,
			plan: PLAN,
			heartbeat: createManualHeartbeat().scheduler,
			minFirmwareVersion: "1.0.0",
			handshakeTimeoutMs: 80,
			pingIntervalMs: 10,
		});
		await expect(client.connect()).resolves.toMatchObject({
			firmware: "1.2.0",
		});
	});

	it("fails with config-rejected when the board answers ERR", async () => {
		const { client } = setup({ knownPins: ["2"] });
		await expect(client.connect()).rejects.toMatchObject({
			code: "config-rejected",
		});
		expect(client.getState()).toBe("disconnected");
	});

	it("fails with transport when the port cannot be opened", async () => {
		const { client } = setup({ failOpen: true });
		await expect(client.connect()).rejects.toMatchObject({ code: "transport" });
		expect(client.getState()).toBe("disconnected");
	});

	it("fails with transport when the port disappears during the handshake", async () => {
		const { board, client } = setup({ firmwarePresent: false });
		const connecting = client.connect();
		await flush();
		board.unplug();
		await expect(connecting).rejects.toMatchObject({ code: "transport" });
	});

	it("can be cancelled while connecting", async () => {
		const { client } = setup({ firmwarePresent: false });
		const connecting = client.connect();
		await flush();
		client.cancel();
		await expect(connecting).rejects.toMatchObject({ code: "cancelled" });
		expect(client.getState()).toBe("disconnected");
	});

	it("refuses a second connect while not disconnected", async () => {
		const { client } = setup();
		await client.connect();
		await expect(client.connect()).rejects.toThrow("already");
	});

	it("can connect again after a failure", async () => {
		const board = new FakeRemoteIoBoard({ firmwarePresent: false });
		const client = new RemoteIoClient({
			transport: board,
			plan: PLAN,
			heartbeat: createManualHeartbeat().scheduler,
			handshakeTimeoutMs: 40,
			pingIntervalMs: 10,
		});
		await expect(client.connect()).rejects.toBeInstanceOf(RemoteIoError);
		expect(client.getState()).toBe("disconnected");
	});
});

describe("RemoteIoClient inputs", () => {
	it("converts IN images to variable values, applying inversion", async () => {
		const { board, client } = setup();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		await client.connect();

		board.emitInputs({ "2": 0, "3": 1, A0: 512 });

		expect(received).toHaveLength(1);
		expect(Object.fromEntries(received[0])).toEqual({
			bp: true,
			capteur: true,
			pot: 512,
		});

		board.emitInputs({ "2": 1, "3": 0, A0: 0 });
		expect(Object.fromEntries(received[1])).toEqual({
			bp: false,
			capteur: false,
			pot: 0,
		});
	});

	it("reassembles an IN frame split across chunks", async () => {
		const { board, client } = setup();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		await client.connect();

		board.emitInputs({ "2": 0, "3": 1, A0: 7 }, true);

		expect(received).toHaveLength(1);
	});

	it("only reports pins present in the image", async () => {
		const { board, client } = setup();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		await client.connect();

		board.emitInputs({ "3": 1 });

		expect([...received[0].keys()]).toEqual(["capteur"]);
	});

	it("ignores IN frames arriving before the link is established", async () => {
		const { board, client } = setup();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		const connecting = client.connect();
		await flush();
		board.emitInputs({ "2": 1 });
		await connecting;
		expect(received).toEqual([]);
	});
});

describe("RemoteIoClient outputs", () => {
	it("sends the full output image, zeros included, on setOutputs", async () => {
		const { board, client } = setup();
		await client.connect();

		client.setOutputs({ led: true });
		await flush();

		expect(board.outImages().at(-1)).toEqual({ "13": 1, "9": 0 });
	});

	it("rounds and saturates analog outputs, ignores unknown variables", async () => {
		const { board, client } = setup();
		await client.connect();

		client.setOutputs({ pwm: 300.4, inconnue: 5 });
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 0, "9": 255 });

		client.setOutputs({ pwm: -4 });
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 0, "9": 0 });

		client.setOutputs({ pwm: 100.6 });
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 0, "9": 101 });
	});

	it("keeps previous values of outputs missing from a later call", async () => {
		const { board, client } = setup();
		await client.connect();
		client.setOutputs({ led: true, pwm: 50 });
		client.setOutputs({ pwm: 60 });
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 1, "9": 60 });
	});

	it("does not send anything while not linked", async () => {
		const { board, client } = setup();
		client.setOutputs({ led: true });
		await flush();
		expect(board.received).toEqual([]);
	});

	it("resends the current image on each heartbeat tick, independently of the cycle", async () => {
		const { board, client, heartbeat } = setup();
		await client.connect();
		client.setOutputs({ led: true });
		await flush();
		const before = board.outImages().length;

		heartbeat.state.tick!();
		heartbeat.state.tick!();
		await flush();

		const images = board.outImages();
		expect(images.length).toBe(before + 2);
		expect(images.at(-1)).toEqual({ "13": 1, "9": 0 });
	});

	it("sends no frame when setOutputs repeats the same values", async () => {
		const { board, client } = setup();
		await client.connect();
		client.setOutputs({ led: true, pwm: 50 });
		await flush();
		const before = board.outImages().length;

		client.setOutputs({ led: true, pwm: 50 });
		client.setOutputs({ led: true });
		await flush();

		expect(board.outImages().length).toBe(before);
	});

	it("sends exactly one full image when a value changes", async () => {
		const { board, client } = setup();
		await client.connect();
		client.setOutputs({ led: true, pwm: 50 });
		await flush();
		const before = board.outImages().length;

		client.setOutputs({ led: true, pwm: 60 });
		await flush();

		const images = board.outImages();
		expect(images.length).toBe(before + 1);
		expect(images.at(-1)).toEqual({ "13": 1, "9": 60 });
	});

	it("sends nothing for unknown variables or values saturating to the stored one", async () => {
		const { board, client } = setup();
		await client.connect();
		client.setOutputs({ pwm: 300 });
		await flush();
		const before = board.outImages().length;

		client.setOutputs({ inconnue: 5 });
		client.setOutputs({ pwm: 400 });
		await flush();

		expect(board.outImages().length).toBe(before);
	});

	it("still sends the full image on a heartbeat tick when nothing changed", async () => {
		const { board, client, heartbeat } = setup();
		await client.connect();
		client.setOutputs({ led: true });
		await flush();
		const before = board.outImages().length;

		client.setOutputs({ led: true });
		heartbeat.state.tick!();
		await flush();

		const images = board.outImages();
		expect(images.length).toBe(before + 1);
		expect(images.at(-1)).toEqual({ "13": 1, "9": 0 });
	});

	it("compares against the minimum image after a fallback", async () => {
		const { board, client, heartbeat } = setup();
		await client.connect();
		client.setOutputs({ led: true });
		await flush();
		heartbeat.state.tick!();
		await flush();
		await client.fallback();
		await flush();
		const before = board.outImages().length;

		client.setOutputs({ led: false });
		await flush();
		expect(board.outImages().length).toBe(before);

		client.setOutputs({ led: true });
		await flush();
		expect(board.outImages().length).toBe(before + 1);
	});

	it("sends an all-zero image right after connecting through the heartbeat", async () => {
		const { board, client, heartbeat } = setup();
		await client.connect();
		heartbeat.state.tick!();
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 0, "9": 0 });
	});
});

describe("RemoteIoClient safe fallback", () => {
	it("fallback sends zeros immediately and the heartbeat keeps them", async () => {
		const { board, client, heartbeat } = setup();
		await client.connect();
		client.setOutputs({ led: true, pwm: 200 });

		await client.fallback();
		heartbeat.state.tick!();
		await flush();

		expect(board.outImages().at(-2)).toEqual({ "13": 0, "9": 0 });
		expect(board.outImages().at(-1)).toEqual({ "13": 0, "9": 0 });
		expect(client.getState()).toBe("linked");
	});

	it("outputs resume after a fallback once setOutputs is called again", async () => {
		const { board, client } = setup();
		await client.connect();
		await client.fallback();
		client.setOutputs({ led: true });
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 1, "9": 0 });
	});

	it("disconnect sends zeros, stops the heartbeat and closes the port", async () => {
		const { board, client, heartbeat, states } = setup();
		await client.connect();
		client.setOutputs({ led: true });

		await client.disconnect();

		expect(board.outImages().at(-1)).toEqual({ "13": 0, "9": 0 });
		expect(heartbeat.state.stopped).toBe(true);
		expect(board.closed).toBe(true);
		expect(states.at(-1)).toBe("disconnected");
	});

	it("disconnect is a no-op when already disconnected", async () => {
		const { board, client } = setup();
		await client.disconnect();
		expect(board.closed).toBe(false);
	});

	it("reports the loss of the link when the port disappears", async () => {
		const { board, client, heartbeat } = setup();
		const lost: RemoteIoError[] = [];
		client.onLinkLost((error) => lost.push(error));
		await client.connect();

		board.unplug();
		await flush();

		expect(client.getState()).toBe("disconnected");
		expect(heartbeat.state.stopped).toBe(true);
		expect(lost).toHaveLength(1);
		expect(lost[0].code).toBe("transport");
	});

	it("reports the loss of the link when a write fails", async () => {
		const { board, client } = setup();
		const lost: RemoteIoError[] = [];
		client.onLinkLost((error) => lost.push(error));
		await client.connect();
		board.write = async () => {
			throw new Error("device lost");
		};

		client.setOutputs({ led: true });
		await flush();

		expect(client.getState()).toBe("disconnected");
		expect(lost).toHaveLength(1);
	});
});

describe("RemoteIoClient.reconfigure", () => {
	const NEW_PLAN: RemoteIoPlan = {
		pins: [
			{ pin: "4", mode: "I" },
			{ pin: "12", mode: "O" },
		],
		inputs: [
			{ variableId: "autre", pin: "4", kind: "digital", inverted: false },
		],
		outputs: [
			{
				variableId: "lampe",
				pin: "12",
				kind: "digital",
				range: { min: 0, max: 1 },
			},
		],
	};

	it("sends the new configuration and switches the variable mapping", async () => {
		const { board, client } = setup();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		await client.connect();

		await client.reconfigure(NEW_PLAN);

		const configs = board.received.filter((frame) => frame.command === "CFG");
		expect(configs.at(-1)?.args).toEqual(["4:I", "12:O"]);
		board.emitInputs({ "4": 1 });
		expect(Object.fromEntries(received.at(-1)!)).toEqual({ autre: true });
		client.setOutputs({ lampe: true });
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "12": 1 });
	});

	it("resets outputs and ignores input images until the board acknowledges", async () => {
		const { board, client, heartbeat } = setup();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		await client.connect();
		client.setOutputs({ led: true });

		const reconfiguring = client.reconfigure(NEW_PLAN);
		board.emitInputs({ "4": 1 });
		await reconfiguring;

		expect(received).toEqual([]);
		heartbeat.state.tick!();
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "12": 0 });
	});

	it("rejects when the board refuses the configuration", async () => {
		const { client } = setup({ knownPins: ["2", "3", "A0", "13", "9"] });
		await client.connect();
		await expect(client.reconfigure(NEW_PLAN)).rejects.toMatchObject({
			code: "config-rejected",
		});
	});

	it("refuses when not linked", async () => {
		const { client } = setup();
		await expect(client.reconfigure(NEW_PLAN)).rejects.toThrow("not linked");
	});
});

const uploadImage = (
	client: RemoteIoClient,
	image: Uint8Array,
	onProgress?: (sent: number, total: number) => void,
) =>
	client.uploadProgram(
		image,
		new DataView(image.buffer, image.byteOffset).getUint32(22, true),
		onProgress,
	);

describe("RemoteIoClient.uploadProgram", () => {
	const imageOf = (statements: number) =>
		generateBytecode({
			compiled: compiledProject({
				variables: [plcVariable("i:INT")],
				routines: [
					Array.from({ length: statements }, (_, k) => `i := ${k + 2}`),
				],
			}),
			ioBindings: [],
			cyclePeriodMs: 100,
			pinRange: UNO_PIN_RANGE,
		}).bytes;
	const frames = (board: FakeRemoteIoBoard, command: string) =>
		board.received.filter((frame) => frame.command === command);
	const linked = async (options: Parameters<typeof setup>[0] = {}) => {
		const context = setup(options);
		await context.client.connect();
		return context;
	};

	it("transfers the image in chunks, reports progress and keeps the link", async () => {
		const { board, client, states } = await linked();
		const image = imageOf(40);
		expect(image.length).toBeGreaterThan(96);
		const progress: Array<[number, number]> = [];

		await uploadImage(client, image, (sent, total) =>
			progress.push([sent, total]),
		);

		expect(board.program).toEqual(image);
		expect(board.autonomous).toBe(true);
		expect(frames(board, "PROG_BEGIN")).toHaveLength(1);
		expect(frames(board, "PROG_CHUNK")).toHaveLength(
			Math.ceil(image.length / 48),
		);
		expect(progress.at(-1)).toEqual([image.length, image.length]);
		expect(progress.map(([sent]) => sent)).toEqual(
			[...progress.map(([sent]) => sent)].sort((a, b) => a - b),
		);
		expect(client.getState()).toBe("linked");
		expect(states.at(-1)).toBe("linked");
		expect(board.closed).toBe(false);
	});

	it("sends no output image while the board runs its program, and can upload again", async () => {
		const { board, client, heartbeat } = await linked();
		await uploadImage(client, imageOf(5));
		const frames = board.received.length;
		client.setOutputs({ led: true });
		await flush();
		expect(board.received.length).toBe(frames);
		expect(heartbeat.state.stopped).toBe(true);

		const second = imageOf(6);
		await uploadImage(client, second);
		expect(board.program).toEqual(second);
	});

	it("takes back remote I/O after a transfer", async () => {
		const { board, client, heartbeat } = await linked();
		await uploadImage(client, imageOf(5));

		await client.resumeRemoteIo();

		expect(board.autonomous).toBe(false);
		expect(frames(board, "CFG")).toHaveLength(2);
		expect(heartbeat.state.stopped).toBe(false);
		client.setOutputs({ led: true });
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 1, "9": 0 });
	});

	it("resumeRemoteIo is a no-op while remote I/O is active, and refuses when not linked", async () => {
		const { board, client } = await linked();
		await client.resumeRemoteIo();
		expect(frames(board, "CFG")).toHaveLength(1);
		const { client: other } = setup();
		await expect(other.resumeRemoteIo()).rejects.toThrow("not linked");
	});

	it("keeps the new pin plan for later when reconfigured while the program runs", async () => {
		const { board, client } = await linked();
		await uploadImage(client, imageOf(5));
		await client.reconfigure({ ...PLAN, pins: [{ pin: "4", mode: "I" }] });
		expect(frames(board, "CFG")).toHaveLength(1);
		await client.resumeRemoteIo();
		expect(frames(board, "CFG").at(-1)?.args).toEqual(["4:I"]);
	});

	it("stops the heartbeat and ignores input images during the transfer", async () => {
		const { board, client, heartbeat } = await linked();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		const upload = uploadImage(client, imageOf(5));
		board.emitInputs({ "2": 0 });
		await upload;
		expect(heartbeat.state.stopped).toBe(true);
		expect(received).toEqual([]);
	});

	it("resends a chunk whose frame or acknowledgement was lost", async () => {
		const { board, client } = await linked({ dropChunks: 1, dropAcks: 1 });
		const image = imageOf(40);
		await uploadImage(client, image);
		expect(board.program).toEqual(image);
		expect(frames(board, "PROG_CHUNK").length).toBeGreaterThan(
			Math.ceil(image.length / 48),
		);
	});

	it("fails with exchange-timeout when the board stops answering, and restores the link", async () => {
		const { board, client, heartbeat } = await linked({ dropChunks: 99 });
		await expect(uploadImage(client, imageOf(5))).rejects.toMatchObject({
			code: "exchange-timeout",
		});
		expect(client.getState()).toBe("linked");
		expect(heartbeat.state.stopped).toBe(false);
		expect(frames(board, "CFG")).toHaveLength(2);
		expect(board.autonomous).toBe(false);
	});

	it("fails with exchange-rejected when the image does not fit", async () => {
		const { client } = await linked({ programCapacity: 20 });
		await expect(uploadImage(client, imageOf(5))).rejects.toMatchObject({
			code: "exchange-rejected",
			detail: "PROG_SIZE",
		});
		expect(client.getState()).toBe("linked");
	});

	it("fails with exchange-rejected when the board refuses the final check", async () => {
		const { board, client } = await linked({
			rejectProgramEnd: "PROG_INVALID",
		});
		await expect(uploadImage(client, imageOf(5))).rejects.toMatchObject({
			code: "exchange-rejected",
			detail: "PROG_INVALID",
		});
		expect(board.program).toBeNull();
		expect(client.getState()).toBe("linked");
	});

	it("refuses when not linked", async () => {
		const { client } = setup();
		await expect(uploadImage(client, imageOf(5))).rejects.toThrow("not linked");
	});
});

describe("RemoteIoClient.requestStatus", () => {
	it("reports remote I/O mode, then the running program after a transfer", async () => {
		const { board, client } = setup();
		await client.connect();
		await expect(client.requestStatus()).resolves.toEqual({
			state: "remote-io",
			fault: 0,
			imageId: 0,
		});
		expect(board.received.at(-1)?.command).toBe("STATUS");
	});

	it("refuses when not linked", async () => {
		const { client } = setup();
		await expect(client.requestStatus()).rejects.toThrow("not linked");
	});

	it("times out when the board stays silent", async () => {
		const { board, client } = setup();
		await client.connect();
		(board as unknown as { answer: () => void }).answer = () => {};
		await expect(client.requestStatus()).rejects.toMatchObject({
			code: "exchange-timeout",
		});
	});
});

describe("RemoteIoClient.runProgram and stopProgram", () => {
	const imageOf = () =>
		generateBytecode({
			compiled: compiledProject({
				variables: [plcVariable("i:INT")],
				routines: [["i := 1"]],
			}),
			ioBindings: [],
			cyclePeriodMs: 100,
			pinRange: UNO_PIN_RANGE,
		}).bytes;
	const linkedWithProgram = async () => {
		const context = setup();
		await context.client.connect();
		await uploadImage(context.client, imageOf());
		return context;
	};

	it("stops the program and leaves the board without remote I/O", async () => {
		const { board, client, heartbeat } = await linkedWithProgram();

		await client.stopProgram();

		expect(board.autonomous).toBe(false);
		expect(board.stopped).toBe(true);
		expect(client.getState()).toBe("linked");
		expect(heartbeat.state.stopped).toBe(true);
		await expect(client.requestStatus()).resolves.toMatchObject({
			state: "stopped",
		});
	});

	it("starts the stored program again", async () => {
		const { board, client } = await linkedWithProgram();
		await client.stopProgram();

		await client.runProgram();

		expect(board.autonomous).toBe(true);
		expect(board.stopped).toBe(false);
		await expect(client.requestStatus()).resolves.toMatchObject({
			state: "running",
		});
	});

	it("starts the program from remote I/O, silencing the heartbeat", async () => {
		const { board, client, heartbeat } = setup();
		await client.connect();
		board.program = imageOf();

		await client.runProgram();

		expect(board.autonomous).toBe(true);
		expect(heartbeat.state.stopped).toBe(true);
		client.setOutputs({ led: true });
		await flush();
		expect(board.outImages().at(-1)).toBeUndefined();
	});

	it("keeps remote I/O when the board has no program to start", async () => {
		const { board, client, heartbeat } = setup();
		await client.connect();

		await expect(client.runProgram()).rejects.toMatchObject({
			code: "exchange-rejected",
			detail: "PROG_INVALID",
		});

		expect(heartbeat.state.stopped).toBe(false);
		expect(
			board.received.filter((frame) => frame.command === "CFG"),
		).toHaveLength(2);
		client.setOutputs({ led: true });
		await flush();
		expect(board.outImages().at(-1)).toMatchObject({ "13": 1 });
	});

	it("refuses when not linked", async () => {
		const { client } = setup();
		await expect(client.runProgram()).rejects.toThrow("not linked");
		await expect(client.stopProgram()).rejects.toThrow("not linked");
	});
});

describe("RemoteIoClient telemetry", () => {
	const watched = async (onProgramMismatch = jest.fn()) => {
		const context = setup();
		await context.client.connect();
		const snapshots: Array<{ cycle: number; memory: number[] }> = [];
		await context.client.startWatching({
			memorySize: 20,
			imageId: 0x1234abcd,
			onSnapshot: (snapshot) =>
				snapshots.push({ cycle: snapshot.cycle, memory: [...snapshot.memory] }),
			onProgramMismatch,
		});
		return { ...context, snapshots, onProgramMismatch };
	};
	const memory = (fill: number) => Array.from({ length: 20 }, () => fill);

	it("asks the board to send its memory and delivers each complete image", async () => {
		const { board, snapshots } = await watched();
		expect(board.watching).toBe(true);

		board.emitTelemetry(memory(1), { cycle: 4, tag: 0xabcd });
		board.emitTelemetry(memory(2), { cycle: 5, tag: 0xabcd });

		expect(snapshots).toEqual([
			{ cycle: 4, memory: memory(1) },
			{ cycle: 5, memory: memory(2) },
		]);
	});

	it("reassembles an image whose frame is split across chunks", async () => {
		const { board, snapshots } = await watched();
		const line = encodeFrame("TEL", ["ABCD", "9", "0", "01".repeat(16)]);
		board.emit(line.slice(0, 20));
		board.emit(line.slice(20));
		board.emit(encodeFrame("TEL", ["ABCD", "9", "16", "01".repeat(4)]));
		expect(snapshots).toEqual([{ cycle: 9, memory: memory(1) }]);
	});

	it("reports once that the board runs another program, and delivers nothing", async () => {
		const { board, snapshots, onProgramMismatch } = await watched();
		board.emitTelemetry(memory(1), { cycle: 1, tag: 0x0001 });
		board.emitTelemetry(memory(1), { cycle: 2, tag: 0x0001 });
		expect(onProgramMismatch).toHaveBeenCalledTimes(1);
		expect(snapshots).toEqual([]);
	});

	it("does not mix telemetry frames with the answers it waits for", async () => {
		const { board, client } = await watched();
		board.emitTelemetry(memory(1), { cycle: 1, tag: 0xabcd });
		await expect(client.requestStatus()).resolves.toMatchObject({
			state: "remote-io",
		});
	});

	it("stops delivering once watching is stopped, and tells the board", async () => {
		const { board, client, snapshots } = await watched();
		await client.stopWatching();
		expect(board.watching).toBe(false);
		board.emitTelemetry(memory(1), { cycle: 1, tag: 0xabcd });
		expect(snapshots).toEqual([]);
	});

	it("stops delivering when the program is stopped from here", async () => {
		const { board, client, snapshots } = await watched();
		await client.stopProgram();
		board.emitTelemetry(memory(1), { cycle: 1, tag: 0xabcd });
		expect(snapshots).toEqual([]);
	});

	it("ignores telemetry nobody asked for", async () => {
		const { board, client } = setup();
		await client.connect();
		expect(() => board.emitTelemetry(memory(1), { cycle: 1 })).not.toThrow();
	});

	it("gives up and forgets the watch when the board does not answer", async () => {
		const { board, client } = setup();
		await client.connect();
		(board as unknown as { answer: () => void }).answer = () => {};
		const onSnapshot = jest.fn();
		await expect(
			client.startWatching({
				memorySize: 4,
				imageId: 1,
				onSnapshot,
				onProgramMismatch: jest.fn(),
			}),
		).rejects.toMatchObject({ code: "exchange-timeout" });
		board.emitTelemetry([1, 2, 3, 4], { cycle: 1, tag: 1 });
		expect(onSnapshot).not.toHaveBeenCalled();
	});

	it("refuses when not linked", async () => {
		const { client } = setup();
		await expect(
			client.startWatching({
				memorySize: 1,
				imageId: 1,
				onSnapshot: jest.fn(),
				onProgramMismatch: jest.fn(),
			}),
		).rejects.toThrow("not linked");
	});
});

describe("RemoteIoClient variable writes", () => {
	const running = async () => {
		const context = setup();
		await context.client.connect();
		context.board.autonomous = true;
		return context;
	};

	it("writes, forces and releases variables of the running program", async () => {
		const { board, client } = await running();

		await client.writeVariable(2, 7);
		await client.forceVariable(3, 1);
		await client.forceVariable(4, 9);
		await client.releaseVariable(4);

		expect(board.written.get(2)).toBe(7);
		expect([...board.forced]).toEqual([[3, 1]]);
	});

	it("releases every forced variable at once", async () => {
		const { board, client } = await running();
		await client.forceVariable(1, 1);
		await client.forceVariable(2, 1);
		await client.releaseVariable("all");
		expect(board.forced.size).toBe(0);
	});

	it("passes a DWORD above 2^31 as its signed pattern", async () => {
		const { board, client } = await running();
		await client.forceVariable(0, 4000000000);
		expect(board.forced.get(0)).toBe(-294967296);
	});

	it("reports the refusal of the board for an unknown variable", async () => {
		const { client } = await running();
		await expect(client.forceVariable(99, 1)).rejects.toMatchObject({
			code: "exchange-rejected",
			detail: "FORCE_INDEX",
		});
	});

	it("reports the refusal of the board when no program runs", async () => {
		const { board, client } = await running();
		board.autonomous = false;
		await expect(client.writeVariable(0, 1)).rejects.toMatchObject({
			code: "exchange-rejected",
			detail: "FORCE_STATE",
		});
	});

	it("refuses when not linked", async () => {
		const { client } = setup();
		await expect(client.writeVariable(0, 1)).rejects.toThrow("not linked");
		await expect(client.forceVariable(0, 1)).rejects.toThrow("not linked");
		await expect(client.releaseVariable(0)).rejects.toThrow("not linked");
	});
});

describe("RemoteIoClient without remote I/O", () => {
	const neutral = async () => {
		const context = setup({ firmware: "1.0.0" });
		await context.client.connect({ remoteIo: false });
		return context;
	};

	it("links without configuring the board or starting the heartbeat", async () => {
		const { board, client, heartbeat, states } = await neutral();
		expect(client.getState()).toBe("linked");
		expect(states).toEqual(["connecting", "linked"]);
		expect(board.received.map((frame) => frame.command)).not.toContain("CFG");
		expect(heartbeat.state.tick).toBeNull();
	});

	it("sends no output image and ignores input images until remote I/O is taken", async () => {
		const { board, client } = await neutral();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		client.setOutputs({ led: true });
		await flush();
		board.emitInputs({ "2": 0 });
		expect(board.outImages()).toEqual([]);
		expect(received).toEqual([]);
	});

	it("takes the pins of the board when asked, then serves them", async () => {
		const { board, client, heartbeat } = await neutral();
		await client.resumeRemoteIo();
		expect(
			board.received.filter((frame) => frame.command === "CFG"),
		).toHaveLength(1);
		expect(heartbeat.state.stopped).toBe(false);
		client.setOutputs({ led: true });
		await flush();
		expect(board.outImages().at(-1)).toMatchObject({ "13": 1 });
	});

	it("reports a refused transfer without configuring the board", async () => {
		const context = setup({ programCapacity: 20 });
		await context.client.connect({ remoteIo: false });
		const image = new Uint8Array(40);
		await expect(context.client.uploadProgram(image, 1)).rejects.toMatchObject({
			code: "exchange-rejected",
		});
		expect(
			context.board.received.filter((frame) => frame.command === "CFG"),
		).toHaveLength(0);
		expect(context.client.getState()).toBe("linked");
	});
});

describe("RemoteIoClient exchanges are serialized", () => {
	const commands = (board: FakeRemoteIoBoard) =>
		board.received.map((frame) => frame.command);

	it("keeps the STATUS answer when a reconfiguration is requested meanwhile", async () => {
		const { board, client } = setup();
		await client.connect();
		const link = holdAnswers(board);

		const status = client.requestStatus();
		await flush();
		const reconfiguration = client.reconfigure({ ...PLAN, pins: [] });
		await flush();
		expect(commands(board).at(-1)).toBe("STATUS");

		link.release();
		await expect(status).resolves.toMatchObject({ state: "remote-io" });
		await flush();
		expect(commands(board).at(-1)).toBe("CFG");
		link.release();
		await expect(reconfiguration).resolves.toBeUndefined();
	});

	it("waits for the configuration before asking the status", async () => {
		const { board, client } = setup();
		await client.connect();
		const link = holdAnswers(board);

		const reconfiguration = client.reconfigure(PLAN);
		await flush();
		const status = client.requestStatus();
		await flush();
		expect(commands(board).at(-1)).toBe("CFG");

		link.release();
		await expect(reconfiguration).resolves.toBeUndefined();
		await flush();
		expect(commands(board).at(-1)).toBe("STATUS");
		link.release();
		await expect(status).resolves.toMatchObject({ state: "remote-io" });
	});
});

describe("RemoteIoClient.leaveRemoteIo", () => {
	it("reports a configuration the board rejects", async () => {
		const { board, client } = setup();
		await client.connect();
		const target = board as unknown as {
			answer: (frame: { command: string }) => void;
			emit: (line: string) => void;
		};
		target.answer = (frame) => {
			if (frame.command === "CFG") target.emit(encodeFrame("ERR", ["pin"]));
		};
		await expect(client.leaveRemoteIo()).rejects.toMatchObject({
			code: "config-rejected",
		});
	});

	it("drops the outputs and leaves the board with no pins configured", async () => {
		const { board, client, heartbeat } = setup();
		await client.connect();
		client.setOutputs({ led: true });
		await flush();

		await client.leaveRemoteIo();

		expect(board.outImages().at(-1)).toEqual({ "13": 0, "9": 0 });
		expect(
			board.received.filter((frame) => frame.command === "CFG").at(-1)?.args,
		).toEqual([]);
		expect(heartbeat.state.stopped).toBe(true);
		client.setOutputs({ led: true });
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 0, "9": 0 });
	});

	it("can serve the pins again afterwards", async () => {
		const { board, client } = setup();
		await client.connect();
		await client.leaveRemoteIo();

		await client.resumeRemoteIo();

		client.setOutputs({ led: true });
		await flush();
		expect(board.outImages().at(-1)).toMatchObject({ "13": 1 });
	});

	it("is a no-op when the board does not serve its pins", async () => {
		const { board, client } = setup();
		await client.connect({ remoteIo: false });
		await client.leaveRemoteIo();
		expect(
			board.received.filter((frame) => frame.command === "CFG"),
		).toHaveLength(0);
	});

	it("refuses when not linked", async () => {
		const { client } = setup();
		await expect(client.leaveRemoteIo()).rejects.toThrow("not linked");
	});

	it("stops following a watched program", async () => {
		const { board, client } = setup();
		await client.connect();
		const onSnapshot = jest.fn();
		await client.startWatching({
			memorySize: 4,
			imageId: 0x1234abcd,
			onSnapshot,
			onProgramMismatch: jest.fn(),
		});

		await client.leaveRemoteIo();
		board.emitTelemetry([1, 2, 3, 4], { cycle: 1, tag: 0xabcd });

		expect(onSnapshot).not.toHaveBeenCalled();
	});
});

describe("RemoteIoClient restores remote I/O after a failed exchange", () => {
	const silenceConfiguration = (board: FakeRemoteIoBoard) => {
		const target = board as unknown as {
			answer: (frame: { command: string }) => void;
		};
		const original = target.answer.bind(board);
		target.answer = (frame) => {
			if (frame.command !== "CFG") original(frame);
		};
	};
	const lostWith = async (client: RemoteIoClient, action: Promise<unknown>) => {
		const lost: RemoteIoError[] = [];
		client.onLinkLost((error) => lost.push(error));
		await expect(action).rejects.toBeInstanceOf(RemoteIoError);
		await flush();
		return lost;
	};

	it("ignores input images while a transfer is in progress", async () => {
		const { board, client } = setup();
		await client.connect();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		const link = holdAnswers(board);

		const upload = client.uploadProgram(new Uint8Array(100), 1);
		await flush();
		board.emitInputs({ "2": 0 });
		link.release();
		await flush();
		board.emitInputs({ "2": 0 });
		expect(received).toEqual([]);

		link.release();
		await upload.catch(() => {});
	});

	it("delivers input images again after a failed transfer", async () => {
		const { board, client } = setup({ dropChunks: 99 });
		await client.connect();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));

		await expect(
			client.uploadProgram(new Uint8Array(10), 1),
		).rejects.toBeInstanceOf(RemoteIoError);
		board.emitInputs({ "2": 0 });

		expect(received).toHaveLength(1);
	});

	it("ends the link when the board is lost after a failed transfer", async () => {
		const { board, client } = setup({ rejectProgramEnd: "PROG_INVALID" });
		await client.connect();
		silenceConfiguration(board);

		const lost = await lostWith(
			client,
			client.uploadProgram(new Uint8Array(10), 1),
		);

		expect(lost).toHaveLength(1);
		expect(lost[0]).toMatchObject({
			code: "transport",
			detail: "board lost after a failed upload",
		});
		expect(client.getState()).toBe("disconnected");
	});

	it("ends the link when the board is lost after a refused command", async () => {
		const { board, client } = setup();
		await client.connect();
		silenceConfiguration(board);

		const lost = await lostWith(client, client.runProgram());

		expect(lost).toHaveLength(1);
		expect(lost[0]).toMatchObject({
			code: "transport",
			detail: "board lost after a refused command",
		});
		expect(client.getState()).toBe("disconnected");
	});
});

describe("remoteIoFailureCode", () => {
	it.each([
		"exchange-rejected",
		"exchange-timeout",
		"exchange-mismatch",
	] as const)("returns the %s code of a failed exchange as is", (code) => {
		expect(remoteIoFailureCode(new RemoteIoError(code))).toBe(code);
	});

	it.each(["config-rejected", "handshake-timeout"] as const)(
		"maps the %s code, which is not an exchange failure, to transport",
		(code) => {
			expect(remoteIoFailureCode(new RemoteIoError(code))).toBe("transport");
		},
	);

	it("maps any other failure to transport", () => {
		expect(remoteIoFailureCode(new Error("boom"))).toBe("transport");
		expect(remoteIoFailureCode("exchange-timeout")).toBe("transport");
		expect(remoteIoFailureCode(undefined)).toBe("transport");
	});
});
