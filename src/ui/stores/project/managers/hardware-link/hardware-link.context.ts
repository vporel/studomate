import type { IoBinding } from "@/bytecode/bytecode.generator";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import type { HardwareDeviceDescriptor } from "@/hardware/hardware-device.descriptor";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "@/ui/stores/project/project.store";
import type HardwareLinkNotifier from "./hardware-link.notifier";
import type { HardwareLinkState } from "./hardware-link.state";
import type HardwareLinkSession from "./hardware-link.session";
import type { LinkOpener } from "./hardware-link.session";

export interface ResolvedHardwarePlan {
	plan: RemoteIoPlan;
	descriptor: HardwareDeviceDescriptor;
}

/** What `HardwareLinkManager` shares with the collaborators that carry out parts of its job. */
export default interface HardwareLinkContext {
	readonly session: HardwareLinkSession;
	readonly notifier: HardwareLinkNotifier;
	getStoreState: ProjectStoreGetFunction;
	setStoreState: ProjectStoreSetFunction;
	setLinkState(hardwareLink: HardwareLinkState): void;
	/** Pin plan of the current project for its hardware target; `null` without a usable target. */
	resolvePlan(): ResolvedHardwarePlan | null;
	/** Bindings of the variables to the pins of the plan, for the program of the board. */
	ioBindings(plan: RemoteIoPlan): IoBinding[];
	/** Opens the link if it is not open; true when the board is linked afterwards. */
	ensureLink(openedBy: LinkOpener): Promise<boolean>;
	unlink(): Promise<void>;
	reportFailure(error: unknown): void;
}
