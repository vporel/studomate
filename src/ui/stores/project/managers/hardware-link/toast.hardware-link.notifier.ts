import type { FlashErrorCode } from "@/hardware/arduino/flash/stk500";
import { getT } from "@/ui/i18n/translateGlobal";
import { toast } from "react-toastify";
import HardwareLinkNotifier, {
	type LinkFailureCode,
	type ProgramBlockingIssue,
	type OnlineFailure,
	type OnlineLoss,
	type ProgramCommandFailure,
	type ProgramUploadFailure,
} from "./hardware-link.notifier";

/** Toast notifications; the text lives in `src/i18n/messages/{fr,en}/toasts.json`. */
export default class ToastHardwareLinkNotifier implements HardwareLinkNotifier {
	linked(): void {
		toast.success(getT("toasts")("hardwareLinked"));
	}

	linkFailed(code: LinkFailureCode): void {
		toast.error(getT("toasts")(`hardwareLinkFailed.${code}`));
	}

	outputsCutInBackground(): void {
		toast.warn(getT("toasts")("hardwareOutputsCutInBackground"));
	}

	flashFailed(code: Exclude<FlashErrorCode, "cancelled">): void {
		toast.error(getT("toasts")(`hardwareFlashFailed.${code}`));
	}

	programUploaded(): void {
		toast.success(getT("toasts")("hardwareProgramUploaded"));
	}

	programBlocked(issues: ProgramBlockingIssue[]): void {
		const t = getT("toasts");
		const lines = issues.map((issue) => {
			switch (issue.code) {
				case "IMAGE_TOO_LARGE":
					return issue.programName
						? t("hardwareProgramBlocked.IMAGE_TOO_LARGE_WITH_PROGRAM", {
								size: issue.sizeBytes,
								limit: issue.limitBytes,
								program: issue.programName,
								programSize: issue.heaviestRoutine?.sizeBytes ?? 0,
							})
						: t("hardwareProgramBlocked.IMAGE_TOO_LARGE", {
								size: issue.sizeBytes,
								limit: issue.limitBytes,
							});
				case "VARIABLE_MEMORY_EXCEEDED":
					return t("hardwareProgramBlocked.VARIABLE_MEMORY_EXCEEDED", {
						size: issue.sizeBytes,
						limit: issue.limitBytes,
					});
				case "STACK_TOO_DEEP":
					return t("hardwareProgramBlocked.STACK_TOO_DEEP", {
						depth: issue.depth,
						limit: issue.limit,
					});
				case "CALL_DEPTH_EXCEEDED":
					return t("hardwareProgramBlocked.CALL_DEPTH_EXCEEDED", {
						depth: issue.depth,
						limit: issue.limit,
					});
				case "JUMP_NESTING_EXCEEDED":
					return t("hardwareProgramBlocked.JUMP_NESTING_EXCEEDED", {
						limit: issue.limit,
					});
			}
		});
		toast.error(lines.join(" "));
	}

	programUploadFailed(code: ProgramUploadFailure): void {
		toast.error(getT("toasts")(`hardwareProgramFailed.${code}`));
	}

	programCommandFailed(code: ProgramCommandFailure): void {
		toast.error(getT("toasts")(`hardwareProgramCommandFailed.${code}`));
	}

	onlineFailed(reason: OnlineFailure): void {
		toast.error(getT("toasts")(`hardwareOnlineFailed.${reason}`));
	}

	onlineLost(reason: OnlineLoss, fault: number): void {
		const t = getT("toasts");
		if (reason !== "board-fault") {
			toast.error(t(`hardwareOnlineLost.${reason}`));
			return;
		}
		const known = [1, 2, 3, 4].includes(fault);
		toast.error(
			t(known ? `hardwareBoardFault.${fault}` : "hardwareBoardFault.other", {
				fault,
			}),
		);
	}

	boardVariableFailed(code: ProgramCommandFailure): void {
		toast.error(getT("toasts")(`hardwareVariableWriteFailed.${code}`));
	}

	linkLost(): void {
		toast.error(getT("toasts")("hardwareLinkLost"));
	}
}
