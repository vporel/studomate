import type { HardwareDeviceDescriptor } from "@/hardware/hardware-device.descriptor";
import { MAX_PENDING_TARGETS } from "./bytecode-format";
import type { BytecodeImage } from "./bytecode.generator";
import { variableMemorySize } from "./variable-memory";
import verifyBytecode, { TOO_MANY_PENDING_JUMPS } from "./bytecode.verifier";

export type AdmissibilityIssue =
	| {
			code: "IMAGE_TOO_LARGE";
			sizeBytes: number;
			limitBytes: number;
			/** Routine whose code is the largest, to point the user at what to simplify. */
			heaviestRoutine: { programId: string | null; sizeBytes: number } | null;
	  }
	| { code: "VARIABLE_MEMORY_EXCEEDED"; sizeBytes: number; limitBytes: number }
	| { code: "STACK_TOO_DEEP"; depth: number; limit: number }
	| { code: "CALL_DEPTH_EXCEEDED"; depth: number; limit: number }
	| { code: "JUMP_NESTING_EXCEEDED"; limit: number };

export interface AdmissibilityReport {
	admissible: boolean;
	issues: AdmissibilityIssue[];
	/** Exact sizes of the image, for display. */
	metrics: {
		imageBytes: number;
		codeBytes: number;
		/** RAM of the variables: 1 byte per boolean, 2 per INT/WORD, 4 per 32-bit variable. */
		variableBytes: number;
		/** Variables, evaluation stack, return addresses and time-base phases. */
		ramBytes: number;
	};
}

/**
 * Compares an image to what the target and its shipped firmware can hold (`limits` of its
 * descriptor). The sizes are exact:
 * the generator knows them at compile time.
 */
export default function checkAdmissibility(
	image: BytecodeImage,
	limits: HardwareDeviceDescriptor["limits"],
): AdmissibilityReport {
	const { layout } = image;
	const variableBytes = variableMemorySize(layout);
	const ramBytes =
		variableBytes +
		4 * layout.maxStack +
		2 * layout.maxCallDepth +
		2 * layout.sysCount;
	const issues: AdmissibilityIssue[] = [];

	if (layout.imageSize > limits.programStorageBytes) {
		const heaviest = layout.routineSizes.reduce(
			(best, sizeBytes, i) =>
				best === null || sizeBytes > best.sizeBytes
					? { programId: layout.routineProgramIds[i], sizeBytes }
					: best,
			null as { programId: string | null; sizeBytes: number } | null,
		);
		issues.push({
			code: "IMAGE_TOO_LARGE",
			sizeBytes: layout.imageSize,
			limitBytes: limits.programStorageBytes,
			heaviestRoutine: heaviest,
		});
	}
	if (variableBytes > limits.vm.variableBytes) {
		issues.push({
			code: "VARIABLE_MEMORY_EXCEEDED",
			sizeBytes: variableBytes,
			limitBytes: limits.vm.variableBytes,
		});
	}
	if (layout.maxStack > limits.vm.maxStack) {
		issues.push({
			code: "STACK_TOO_DEEP",
			depth: layout.maxStack,
			limit: limits.vm.maxStack,
		});
	}
	if (layout.maxCallDepth > limits.vm.maxCallDepth) {
		issues.push({
			code: "CALL_DEPTH_EXCEEDED",
			depth: layout.maxCallDepth,
			limit: limits.vm.maxCallDepth,
		});
	}
	const structure = verifyBytecode(
		image.bytes,
		image.bytes.length,
		limits.vm.pinRange,
	);
	if (!structure.valid) {
		if (structure.reason === TOO_MANY_PENDING_JUMPS) {
			issues.push({
				code: "JUMP_NESTING_EXCEEDED",
				limit: MAX_PENDING_TARGETS,
			});
		} else {
			throw new Error(
				`The generator produced an invalid image: ${structure.reason}`,
			);
		}
	}

	return {
		admissible: issues.length === 0,
		issues,
		metrics: {
			imageBytes: layout.imageSize,
			codeBytes: layout.codeSize,
			variableBytes,
			ramBytes,
		},
	};
}
