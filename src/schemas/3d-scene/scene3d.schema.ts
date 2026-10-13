/** 3D simulation scene chosen for a project, with its points wired to project variables. */
export type Scene3d = {
	/** Id of a scene of the catalogue (`src/3d-scenes/scene.registry.ts`). */
	sceneId: string;
	/** Scene point id → variable id (the id, not the mnemonic: a rename breaks nothing). */
	bindings: Record<string, string>;
};
