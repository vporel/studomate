/**
 * The notations a program can be written in.
 *
 * Adding one means adding its schema, its pipeline (analyse / pre-compile / compile) and
 * its editor — but nothing in the project model or in the pipeline entry points.
 */
export const PROGRAM_TYPES = ["grafcet"] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];

export const PROGRAM_TYPE_LABELS: Record<ProgramType, string> = {
	grafcet: "Grafcet",
};

/**
 * A program held by a project — a unit of executable logic, whatever the notation.
 *
 * **Deliberately thin.** It carries only what the *project* level needs to know: identity,
 * name, and which notation it is written in. Everything else is specific to the notation
 * and stays there.
 *
 * The temptation would be to hoist "elements", "connections" or a common editing interface
 * up here. That would be designing from a single example: a Ladder program has no elements
 * and no connections, it has rungs. Such an abstraction can only be drawn honestly once a
 * second notation actually exists.
 */
export default abstract class Program {
	id: string;
	name: string;
	abstract readonly type: ProgramType;

	constructor(id: string, name: string) {
		this.id = id;
		this.name = name;
	}

	abstract copy(): Program;
}
