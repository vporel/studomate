import { ProgramType } from "@/schemas/program/program.schema";

/**
 * Ce que le niveau projet sait d'un programme pré-compilé : sa notation, et rien d'autre.
 *
 * Le contenu réel est **opaque** ici, et volontairement : la forme du pré-compilé dépend
 * entièrement de la notation (le GRAFCET a des étapes et des transitions, un Ladder a des
 * réseaux). Seul le compilateur de la même notation le consomme, en le rétrécissant sur `type`.
 *
 * C'est ce qui permet d'ajouter une notation sans inventer aujourd'hui la forme de son
 * pré-compilé.
 */
export type PreCompiledProgram = {
	type: ProgramType;
};
