export type ProjectPreCompilerErrorSource = {
	sourceType: "grafcet" | "grafcet-step" | "grafcet-transition" | "grafcet-action" | "ladder" | "ladder-network";
	sourceId: string;
};

export class ProjectPreCompilerErrorSourceBuilder {
	static buildGrafcetSource(grafcetId: string): ProjectPreCompilerErrorSource {
		return { sourceType: "grafcet", sourceId: grafcetId };
	}

	static buildStepSource(stepId: string): ProjectPreCompilerErrorSource {
		return { sourceType: "grafcet-step", sourceId: stepId };
	}

	static buildTransitionSource(transitionId: string): ProjectPreCompilerErrorSource {
		return { sourceType: "grafcet-transition", sourceId: transitionId };
	}

	static buildActionSource(actionId: string): ProjectPreCompilerErrorSource {
		return { sourceType: "grafcet-action", sourceId: actionId };
	}

	static buildLadderNetworkSource(networkId: string): ProjectPreCompilerErrorSource {
		return { sourceType: "ladder-network", sourceId: networkId };
	}
}

/**
 * Thrown by the sub-compilers when an expression cannot be compiled.
 * Carries the location of the error in the project structure.
 */
export default class ProjectPreCompilerError extends Error {
	readonly source: ProjectPreCompilerErrorSource;

	constructor(source: ProjectPreCompilerErrorSource, message: string) {
		super(message);
		this.source = source;
	}
}
