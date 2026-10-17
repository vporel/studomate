import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import HardwareLinkSession from "./hardware-link.session";

describe("HardwareLinkSession", () => {
	it("starts without a client or a plan", () => {
		const session = new HardwareLinkSession();
		expect(session.client).toBeNull();
		expect(session.plan).toBeNull();
	});

	it("recognises the attempt it is on, and no other", () => {
		const session = new HardwareLinkSession();
		const attempt = session.attempt;
		expect(session.isCurrent(attempt)).toBe(true);
		expect(session.isCurrent(attempt + 1)).toBe(false);
	});

	it("makes every captured attempt stale once invalidated, and forgets the link", () => {
		const session = new HardwareLinkSession();
		session.client = {} as RemoteIoClient;
		session.plan = { pins: [], inputs: [], outputs: [] };
		const before = session.attempt;

		session.invalidate();

		expect(session.isCurrent(before)).toBe(false);
		expect(session.isCurrent(session.attempt)).toBe(true);
		expect(session.client).toBeNull();
		expect(session.plan).toBeNull();
	});
});
