import {
	ZONE_TO_PIN_CAPABILITY,
	type HardwarePin,
} from "@/hardware/hardware-device.descriptor";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import type Project from "@/schemas/project/project.schema";
import type Variable from "@/schemas/variable/variable.schema";
import ProjectAnalyserIssue from "./project.analyser.issue";

/**
 * Checks the addresses of the project variables against the pins of its hardware target.
 * Without a target, addresses are free: nothing is checked.
 */
export default function analyseHardwareTarget(
	project: Project,
): ProjectAnalyserIssue[] {
	const target = project.hardwareTarget;
	if (!target) return [];

	const source = { sourceType: "project", sourceId: project.id } as const;
	const device = HardwareDeviceRegistry.get(target.modelId);
	if (!device) {
		return [
			new ProjectAnalyserIssue("error", "HARDWARE_MODEL_UNKNOWN", source, {
				modelId: String(target.modelId),
			}),
		];
	}

	const issues: ProjectAnalyserIssue[] = [];
	const pinsByAddress = new Map<string, HardwarePin>(
		device.pins.map((pin) => [pin.address, pin]),
	);
	const variablesByPin = new Map<string, Variable[]>();

	for (const variable of project.variables) {
		if (!variable.address) continue;
		const pin = pinsByAddress.get(variable.address);
		const params = {
			variableName: variable.mnemonic,
			address: variable.address,
			device: device.label,
		};

		if (variable.zone === "memory") {
			if (pin) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"HARDWARE_MEMORY_VARIABLE_ON_PIN",
						source,
						params,
					),
				);
			}
			continue;
		}

		if (!pin) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"HARDWARE_PIN_UNKNOWN",
					source,
					params,
				),
			);
			continue;
		}
		if (pin.reservedFor) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"HARDWARE_PIN_RESERVED",
					source,
					params,
				),
			);
			continue;
		}
		if (!pin.capabilities.includes(ZONE_TO_PIN_CAPABILITY[variable.zone])) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"HARDWARE_PIN_CAPABILITY_MISMATCH",
					source,
					{ ...params, zone: variable.zone },
				),
			);
			continue;
		}
		variablesByPin.set(pin.address, [
			...(variablesByPin.get(pin.address) ?? []),
			variable,
		]);
	}

	for (const [address, variables] of variablesByPin) {
		if (variables.length < 2) continue;
		issues.push(
			new ProjectAnalyserIssue("error", "HARDWARE_PIN_DUPLICATE", source, {
				address,
				device: device.label,
				variableNames: variables.map((v) => v.mnemonic).join(", "),
			}),
		);
	}

	return issues;
}
