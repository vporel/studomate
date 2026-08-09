import { VariableUpdatableFields } from "@/schemas/variable/variable.schema";
import Project from "../project.schema";
import AbstractProjectCommand from "./abstract-project.command";

export default class VariablesUpdateCommand extends AbstractProjectCommand<
	{
		id: string;
		newData: Partial<VariableUpdatableFields>;
		oldData: Partial<VariableUpdatableFields>;
	}[]
> {
	getType(): string {
		return "variables-update";
	}

	execute(project: Project): [project: Project, isCommandValid: boolean] {
		project.variables = project.variables.map((v) => {
			const payload = this.payload.find((p) => p.id === v.id);
			if (!payload) return v;
			return v.update(payload.newData);
		});
		this.applyMnemonicRenames(project, "forward");
		return [project, true];
	}

	cancel(project: Project): Project {
		project.variables = project.variables.map((v) => {
			const payload = this.payload.find((p) => p.id === v.id);
			if (!payload) return v;
			return v.update(payload.oldData);
		});
		this.applyMnemonicRenames(project, "backward");
		return project;
	}

	/**
	 * Renaming a variable must rewrite every expression/reference to it, in *all* the grafcets
	 * and ladders of the project — not only the ones currently open in the editor.
	 *
	 * Doing it here rather than in a UI manager guarantees two things:
	 * - it reaches every program, since the command owns the whole project;
	 * - undo is exactly symmetric by construction, instead of being replayed by hand.
	 */
	private applyMnemonicRenames(project: Project, direction: "forward" | "backward"): void {
		const renames: Record<string, string> = {};
		for (const { newData, oldData } of this.payload) {
			const from = direction === "forward" ? oldData.mnemonic : newData.mnemonic;
			const to = direction === "forward" ? newData.mnemonic : oldData.mnemonic;
			if (!from || !to || from === to) continue;
			renames[from] = to;
		}
		if (Object.keys(renames).length === 0) return;

		Object.values(project.grafcets).forEach((grafcet) => {
			grafcet.renameIdentifiersInExpressions(renames);
		});
		Object.values(project.ladders).forEach((ladder) => {
			ladder.renameVariableReferences(renames);
		});
	}
}
