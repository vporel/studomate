import { createInMemoryTransportPair } from "./in-memory-transport";

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("createInMemoryTransportPair", () => {
	it("delivers a message to the other end only", async () => {
		const [a, b] = createInMemoryTransportPair();
		const onA = jest.fn();
		const onB = jest.fn();
		a.onmessage = onA;
		b.onmessage = onB;

		a.postMessage({ type: "ping" });
		await flush();

		expect(onB).toHaveBeenCalledWith({ data: { type: "ping" } });
		expect(onA).not.toHaveBeenCalled();
	});

	it("works both ways", async () => {
		const [a, b] = createInMemoryTransportPair();
		const onA = jest.fn();
		a.onmessage = onA;
		b.onmessage = jest.fn();

		b.postMessage("hello");
		await flush();

		expect(onA).toHaveBeenCalledWith({ data: "hello" });
	});

	it("delivers asynchronously", () => {
		const [a, b] = createInMemoryTransportPair();
		const onB = jest.fn();
		b.onmessage = onB;

		a.postMessage("later");

		expect(onB).not.toHaveBeenCalled();
	});

	it("hands over a copy, not the object posted", async () => {
		const [a, b] = createInMemoryTransportPair();
		const received: unknown[] = [];
		b.onmessage = (event) => received.push(event.data);
		const message = { nested: { value: 1 } };

		a.postMessage(message);
		message.nested.value = 2;
		await flush();

		expect(received).toEqual([{ nested: { value: 1 } }]);
	});

	it("holds what is posted before the other end listens, in order", async () => {
		const [a, b] = createInMemoryTransportPair();
		a.postMessage(1);
		a.postMessage(2);
		await flush();
		const received: unknown[] = [];

		b.onmessage = (event) => received.push(event.data);

		expect(received).toEqual([1, 2]);
	});

	it("stops delivering to an end once it is closed", async () => {
		const [a, b] = createInMemoryTransportPair();
		const onB = jest.fn();
		b.onmessage = onB;
		b.close();

		a.postMessage("lost");
		await flush();

		expect(onB).not.toHaveBeenCalled();
	});

	it("ignores what a closed end posts", async () => {
		const [a, b] = createInMemoryTransportPair();
		const onB = jest.fn();
		b.onmessage = onB;
		a.close();

		a.postMessage("nothing");
		await flush();

		expect(onB).not.toHaveBeenCalled();
	});
});
