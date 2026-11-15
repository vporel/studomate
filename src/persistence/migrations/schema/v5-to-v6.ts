import { ProjectMigration } from "./migration";

const OLD_ACTION_HANDLE = "target:step";
const NEW_ACTION_HANDLE = "target:predecessor";

function migrateConnection(connection: unknown): unknown {
	const target = (connection as Record<string, unknown> | null)?.target as
		Record<string, unknown> | undefined;
	if (target?.type !== "action" || target.handle !== OLD_ACTION_HANDLE)
		return connection;
	return {
		...(connection as object),
		target: { ...target, handle: NEW_ACTION_HANDLE },
	};
}

function migrateProgram(program: unknown): unknown {
	if (!program || typeof program !== "object") return program;
	const p = program as Record<string, unknown>;
	if (p.type !== "grafcet" || !Array.isArray(p.connections)) return program;
	return { ...p, connections: p.connections.map(migrateConnection) };
}

/**
 * The incoming handle of a grafcet action is renamed from `target:step` to `target:predecessor`:
 * an action can now be activated by a step or by the action chained before it.
 */
const v5ToV6: ProjectMigration = {
	from: 5,
	description:
		"Rename the incoming handle of grafcet actions from `target:step` to `target:predecessor`",
	migrate: (project) => {
		const programs = project.programs;
		if (!programs || typeof programs !== "object")
			return { ...project, schemaVersion: 6 };
		const migrated = Object.fromEntries(
			Object.entries(programs).map(([id, program]) => [
				id,
				migrateProgram(program),
			]),
		);
		return { ...project, programs: migrated, schemaVersion: 6 };
	},
};

export default v5ToV6;
