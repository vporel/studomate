import Program from "@/schemas/program/program.schema";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";

/** Item toggling whether a program is executed (namespace `explorer.menu`). */
export default function executionMenuItems(
	program: Program | undefined,
	manager: {
		setExcludedFromExecution(programId: string, excluded: boolean): void;
	},
	designing: boolean,
	t: (key: "excludeFromExecution" | "includeInExecution") => string,
): ContextMenuItemType[][] {
	if (!program) return [];
	const excluded = program.excludedFromExecution;
	if (!excluded && !program.canBeExcludedFromExecution()) return [];
	return [
		[
			{
				label: t(excluded ? "includeInExecution" : "excludeFromExecution"),
				disabled: !designing,
				onClick: () => manager.setExcludedFromExecution(program.id, !excluded),
			},
		],
	];
}
