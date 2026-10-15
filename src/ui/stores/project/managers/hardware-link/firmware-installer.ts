import { FlashError, flashFirmware } from "@/hardware/arduino/flash/stk500";
import { RemoteIoError } from "@/hardware/arduino/remote-io/remote-io.client";
import trackEvent from "@/ui/services/analytics";
import type HardwareLinkContext from "./hardware-link.context";
import {
	IDLE_HARDWARE_FIRMWARE,
	type FirmwareInstallReason,
	type HardwareFirmwareState,
} from "./hardware-link.state";
import type { RemoteIoDevice } from "./remote-io-device";

const POST_FLASH_DELAY_MS = 1500;

/** Asks the user, then writes the shipped firmware to the board. */
export default class FirmwareInstaller {
	private resolveAnswer: ((accepted: boolean) => void) | null = null;
	private flashAbort: AbortController | null = null;

	constructor(
		private readonly context: HardwareLinkContext,
		private readonly options: { postFlashDelayMs?: number } = {},
	) {}

	/**
	 * The firmware has to be (re)installed when the board stays silent or runs an incompatible
	 * version.
	 */
	static reasonFor(error: unknown): FirmwareInstallReason | null {
		if (!(error instanceof RemoteIoError)) return null;
		if (error.code === "handshake-timeout") return "missing";
		if (
			error.code === "protocol-mismatch" ||
			error.code === "firmware-outdated"
		) {
			return "outdated";
		}
		return null;
	}

	/** Answer of the user to the installation dialog. */
	answer(accepted: boolean): void {
		this.resolveAnswer?.(accepted);
	}

	/** Declines a pending question and interrupts a flash in progress. */
	cancel(): void {
		this.resolveAnswer?.(false);
		this.flashAbort?.abort();
	}

	/**
	 * Resolves to true when the board has restarted on the new firmware; false when declined,
	 * failed or abandoned.
	 */
	async install(
		device: RemoteIoDevice,
		reason: FirmwareInstallReason,
		attempt: number,
	): Promise<boolean> {
		const { session, notifier } = this.context;
		this.setState({ phase: "confirming", reason, progress: null });
		const accepted = await new Promise<boolean>((resolve) => {
			this.resolveAnswer = resolve;
		});
		this.resolveAnswer = null;
		if (!accepted || !session.isCurrent(attempt)) {
			if (!accepted) trackEvent("firmware-installed", { outcome: "declined" });
			this.setState(IDLE_HARDWARE_FIRMWARE);
			return false;
		}

		this.setState({ phase: "flashing", reason, progress: null });
		const abort = new AbortController();
		this.flashAbort = abort;
		try {
			let image: Uint8Array;
			try {
				image = await device.loadFirmware();
			} catch {
				throw new FlashError("firmware-unavailable");
			}
			await flashFirmware({
				transport: device.transport,
				image,
				signal: abort.signal,
				onProgress: (progress) =>
					this.setState({ phase: "flashing", reason, progress }),
			});
			await new Promise((r) =>
				setTimeout(r, this.options.postFlashDelayMs ?? POST_FLASH_DELAY_MS),
			);
			trackEvent("firmware-installed", { outcome: "installed" });
			return session.isCurrent(attempt);
		} catch (error) {
			if (session.isCurrent(attempt)) {
				console.error("Firmware installation failed:", error);
				const code = error instanceof FlashError ? error.code : "transport";
				if (code !== "cancelled") {
					trackEvent("firmware-installed", { outcome: "failed" });
					notifier.flashFailed(code);
				}
			}
			return false;
		} finally {
			this.flashAbort = null;
			this.setState(IDLE_HARDWARE_FIRMWARE);
		}
	}

	private setState(hardwareFirmware: HardwareFirmwareState) {
		this.context.setStoreState(() => ({ hardwareFirmware }));
	}
}
