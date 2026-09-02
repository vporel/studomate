import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { Scene } from "./draw-op";
import grafcetToScene from "./grafcet-scene";
import { LadderRenderContext } from "./ladder-render-context";
import ladderToSectionScenes from "./ladder-scene";

export type ProgramSceneConfig =
	| { type: "grafcet"; program: Grafcet }
	| { type: "ladder"; program: Ladder };

/** Une page d'export : sa scène de dessin et, pour une section de ladder, son intitulé à
 * accoler au titre de la page. */
export type ProgramScenePage = { heading?: string; scene: Scene };

/**
 * Pages de dessin d'un programme. Un grafcet tient sur une page ; un ladder produit une page par
 * section (le zoom reste constant quel que soit le nombre de sections).
 * `ladderContext` fournit les libellés que le schéma seul ne porte pas — voir `LadderRenderContext`.
 */
export default function renderProgramScenes(
	config: ProgramSceneConfig,
	ladderContext?: LadderRenderContext,
): ProgramScenePage[] {
	return config.type === "grafcet"
		? [{ scene: grafcetToScene(config.program) }]
		: ladderToSectionScenes(config.program, ladderContext);
}
