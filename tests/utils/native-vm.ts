import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const VM_DIRECTORY = path.resolve(__dirname, "../../firmwares/vm");

let driverPath: string | null = null;
let workDirectory: string | null = null;

function workDir(): string {
	workDirectory ??= mkdtempSync(path.join(tmpdir(), "stdm-vm-"));
	return workDirectory;
}

/**
 * Builds the native driver of the VM once per test process, with the system C compiler and
 * the undefined-behaviour sanitizer, so any UB of the C core fails the test that triggers it.
 */
export function nativeDriverPath(): string {
	if (driverPath) return driverPath;
	const output = path.join(workDir(), "stdm_run");
	execFileSync(
		process.env.CC ?? "cc",
		[
			"-std=c99",
			"-Wall",
			"-Wextra",
			"-Werror",
			"-fsanitize=undefined",
			"-fno-sanitize-recover=undefined",
			"-g",
			"-DSTDM_TRACE_OPS",
			path.join(VM_DIRECTORY, "stdm_vm.c"),
			path.join(VM_DIRECTORY, "stdm_run.c"),
			"-o",
			output,
		],
		{ stdio: "pipe" },
	);
	driverPath = output;
	return output;
}

export interface NativeCycle {
	/** `ran`/`idle` for `poll`, absent for `cycle`. */
	status?: "ran" | "idle";
	fault: number;
	variables: number[];
	pins: Record<number, number>;
}

function parseState(line: string): NativeCycle {
	const match = /^(?:(ran|idle) )?(\d+) \|([^|]*)\|(.*)$/.exec(line.trim());
	if (!match) throw new Error(`Unreadable VM output: ${line}`);
	const [, status, fault, variables, pins] = match;
	return {
		status: status as NativeCycle["status"],
		fault: Number(fault),
		variables:
			variables.trim() === "" ? [] : variables.trim().split(/\s+/).map(Number),
		pins: Object.fromEntries(
			pins
				.trim()
				.split(/\s+/)
				.filter(Boolean)
				.map((entry) => entry.split("=").map(Number) as [number, number]),
		),
	};
}

let imageCounter = 0;

export class NativeVm {
	private readonly imagePath: string;

	constructor(image: Uint8Array) {
		const directory = path.join(workDir(), "images");
		mkdirSync(directory, { recursive: true });
		this.imagePath = path.join(directory, `image-${imageCounter++}.bin`);
		writeFileSync(this.imagePath, image);
	}

	/** Verification status of the C core (0: accepted). */
	verify(): number {
		const result = spawnSync(nativeDriverPath(), [this.imagePath, "verify"], {
			encoding: "utf8",
		});
		return Number(result.stdout.trim());
	}

	/** Runs the commands and returns the state printed by each `cycle` / `poll` / `mem`. */
	run(commands: string[]): NativeCycle[] {
		const result = spawnSync(nativeDriverPath(), [this.imagePath], {
			input: commands.join("\n") + "\n",
			encoding: "utf8",
		});
		if (result.status !== 0) {
			throw new Error(`VM driver failed: ${result.stdout}${result.stderr}`);
		}
		return result.stdout
			.split("\n")
			.filter((line) => line.trim() !== "")
			.map(parseState);
	}

	/** Opcodes executed by each `cycle` of the commands (the VM counts them in the native build). */
	opcodesPerCycle(commands: string[]): number[] {
		const withCounts = commands.flatMap((command) =>
			/^cycle/.test(command) ? [command, "ops"] : [command],
		);
		const result = spawnSync(nativeDriverPath(), [this.imagePath], {
			input: withCounts.join("\n") + "\n",
			encoding: "utf8",
		});
		return result.stdout
			.split("\n")
			.filter((line) => line.startsWith("ops "))
			.map((line) => Number(line.slice(4)));
	}

	/** Output of a start that the VM refuses. */
	startError(): string {
		return spawnSync(nativeDriverPath(), [this.imagePath], {
			input: "",
			encoding: "utf8",
		}).stdout.trim();
	}
}

/** Verification status of the C core for each image. */
export function nativeVerifyMany(images: Uint8Array[]): number[] {
	const result = spawnSync(nativeDriverPath(), ["--verify-hex"], {
		input:
			images.map((image) => Buffer.from(image).toString("hex")).join("\n") +
			"\n",
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	return result.stdout.split("\n").filter(Boolean).map(Number);
}
