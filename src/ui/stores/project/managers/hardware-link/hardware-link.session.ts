import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";

/**
 * What the current link is made of: the client talking to the board and the pin plan it was
 * configured with. An asynchronous operation captures `attempt` when it starts and checks
 * `isCurrent` when it resumes: a link closed in between must not be resurrected by a late answer.
 */
export default class HardwareLinkSession {
	client: RemoteIoClient | null = null;
	plan: RemoteIoPlan | null = null;
	private generation = 0;

	get attempt(): number {
		return this.generation;
	}

	isCurrent(attempt: number): boolean {
		return attempt === this.generation;
	}

	/** Ends the current link: every operation that captured an earlier attempt is now stale. */
	invalidate(): void {
		this.generation++;
		this.client = null;
		this.plan = null;
	}
}
