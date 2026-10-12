import FakeRemoteIoBoard, {
	createManualHeartbeat,
} from "@tests/utils/fake-remote-io-board";
import RemoteIoClient, {
	RemoteIoError,
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
	});
	const states: RemoteIoState[] = [];
	client.onStateChange((state) => states.push(state));
	return { board, heartbeat, client, states };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

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
		const { board, client } = setup();
		const received: RemoteIoInputValues[] = [];
		client.onInputs((values) => received.push(values));
		await client.connect();
		client.setOutputs({ led: true });

		const reconfiguring = client.reconfigure(NEW_PLAN);
		board.emitInputs({ "4": 1 });
		await reconfiguring;

		expect(received).toEqual([]);
		client.setOutputs({});
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
