import type { FlashErrorCode } from "@/hardware/arduino/flash/stk500";
import type { RemoteIoErrorCode } from "@/hardware/arduino/remote-io/remote-io.client";
import { getT } from "@/ui/i18n/translateGlobal";
import { toast } from "react-toastify";
import HardwareLinkNotifier from "./hardware-link.notifier";

/** Toast notifications; the text lives in `src/i18n/messages/{fr,en}/toasts.json`. */
export default class ToastHardwareLinkNotifier implements HardwareLinkNotifier {
	linked(): void {
		toast.success(getT("toasts")("hardwareLinked"));
	}

	linkFailed(code: Exclude<RemoteIoErrorCode, "cancelled">): void {
		toast.error(getT("toasts")(`hardwareLinkFailed.${code}`));
	}

	outputsCutInBackground(): void {
		toast.warn(getT("toasts")("hardwareOutputsCutInBackground"));
	}

	flashFailed(code: Exclude<FlashErrorCode, "cancelled">): void {
		toast.error(getT("toasts")(`hardwareFlashFailed.${code}`));
	}

	linkLost(): void {
		toast.error(getT("toasts")("hardwareLinkLost"));
	}
}
