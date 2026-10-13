import type { AdmissibilityIssue } from "@/bytecode/bytecode.admissibility";
import type { FlashErrorCode } from "@/hardware/arduino/flash/stk500";
import type {
	RemoteIoErrorCode,
	RemoteIoUploadErrorCode,
} from "@/hardware/arduino/remote-io/remote-io.client";

/** An admissibility issue, with the name of the program it points at when there is one. */
export type ProgramBlockingIssue = AdmissibilityIssue & {
	programName?: string;
};

/** Why a link could not be established. */
export type LinkFailureCode = Exclude<
	RemoteIoErrorCode,
	"cancelled" | RemoteIoUploadErrorCode
>;

/** Why a program could not be sent to the board. */
export type ProgramUploadFailure =
	/** The analysis of the project reports errors. */
	| "analysis"
	/** The project does not compile. */
	| "compilation"
	/** The project uses something the board cannot run, which the analysis let through. */
	| "unsupported"
	| RemoteIoUploadErrorCode
	| "transport";

/** Why the board did not start or stop its program. */
export type ProgramCommandFailure = RemoteIoUploadErrorCode | "transport";

/**
 * What the hardware link has to tell the user. The manager describes what happened, the
 * implementation decides how to say it (see `simulation.notifier.ts`).
 */
export default interface HardwareLinkNotifier {
	linked(): void;
	/** The link could not be established; `code` says why. */
	linkFailed(code: LinkFailureCode): void;
	/** A linked board stopped answering or was unplugged. */
	linkLost(): void;
	/** The firmware could not be installed on the board. */
	flashFailed(code: Exclude<FlashErrorCode, "cancelled">): void;
	/** The board holds the program and runs it by itself; the link is closed. */
	programUploaded(): void;
	/** The program does not fit the board: nothing was sent. */
	programBlocked(issues: ProgramBlockingIssue[]): void;
	programUploadFailed(code: ProgramUploadFailure): void;
	/** The board did not start or stop its program. */
	programCommandFailed(code: ProgramCommandFailure): void;
	/** The tab came back to the foreground after its outputs were cut while hidden. */
	outputsCutInBackground(): void;
}
