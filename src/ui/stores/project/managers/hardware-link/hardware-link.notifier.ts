import type { AdmissibilityIssue } from "@/bytecode/bytecode.admissibility";
import type { FlashErrorCode } from "@/hardware/arduino/flash/stk500";
import type {
	RemoteIoErrorCode,
	RemoteIoExchangeErrorCode,
} from "@/hardware/arduino/remote-io/remote-io.client";

/** An admissibility issue, with the name of the program it points at when there is one. */
export type ProgramBlockingIssue = AdmissibilityIssue & {
	programName?: string;
};

/** Why a link could not be established. */
export type LinkFailureCode = Exclude<
	RemoteIoErrorCode,
	"cancelled" | RemoteIoExchangeErrorCode
>;

/** Why a program could not be sent to the board. */
export type ProgramUploadFailure =
	/** The analysis of the project reports errors. */
	| "analysis"
	/** The project does not compile. */
	| "compilation"
	/** The project uses something the board cannot run, which the analysis let through. */
	| "unsupported"
	| RemoteIoExchangeErrorCode
	| "transport";

/** Why the board did not start or stop its program. */
export type ProgramCommandFailure = RemoteIoExchangeErrorCode | "transport";

/** Why the interface could not start following the program of the board. */
export type OnlineFailure =
	| "analysis"
	| "compilation"
	| "unsupported"
	/** The board holds no program. */
	| "no-program"
	/** The board holds another program than the one of the project. */
	| "program-differs"
	| RemoteIoExchangeErrorCode
	| "transport";

/** Why the interface stopped following the program of the board. */
export type OnlineLoss = "program-differs" | "board-fault" | "board-stopped";

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
	/** The interface could not start following the program of the board. */
	onlineFailed(reason: OnlineFailure): void;
	/** The interface stopped following the program of the board; `fault` is the code it reports. */
	onlineLost(reason: OnlineLoss, fault: number): void;
	/** A write to a variable of the program of the board did not reach it. */
	boardVariableFailed(code: ProgramCommandFailure): void;
}
