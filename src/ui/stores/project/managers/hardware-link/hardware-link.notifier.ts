import type { FlashErrorCode } from "@/hardware/arduino/flash/stk500";
import type { RemoteIoErrorCode } from "@/hardware/arduino/remote-io/remote-io.client";

/**
 * What the hardware link has to tell the user. The manager describes what happened, the
 * implementation decides how to say it (see `simulation.notifier.ts`).
 */
export default interface HardwareLinkNotifier {
	linked(): void;
	/** The link could not be established; `code` says why. */
	linkFailed(code: Exclude<RemoteIoErrorCode, "cancelled">): void;
	/** A linked board stopped answering or was unplugged. */
	linkLost(): void;
	/** The firmware could not be installed on the board. */
	flashFailed(code: Exclude<FlashErrorCode, "cancelled">): void;
	/** The tab came back to the foreground after its outputs were cut while hidden. */
	outputsCutInBackground(): void;
}
