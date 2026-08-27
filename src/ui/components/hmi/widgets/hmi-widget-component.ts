import { HmiWidgetBaseData } from "@/schemas/hmi/hmi-widget.schema";

/**
 * Interface commune à tous les composants de widget HMI, générique sur son `data` — chacun
 * pioche dans `data` les champs propres à son type (voir `GaugeData`, `PushButtonData`...) plutôt
 * que de les recevoir un par un. Permet à `HmiWidgetItem` de rendre n'importe quel widget via un
 * mapping type -> composant (voir `HMI_WIDGET_COMPONENTS` dans `hmi-widget-components.ts`), sans
 * switch par type. `TData` n'est pas contraint à `HmiWidgetBaseData` : une forme (rectangle,
 * ellipse, texte) n'a pas de variable "principale" (voir `RectangleData`).
 */
export interface HmiWidgetComponentProps<TData = HmiWidgetBaseData> {
	data: TData;
	/** Valeur courante de la variable liée (booléenne ou numérique selon le type de widget) —
	 * absente pour un widget sans variable principale (ex. une forme). */
	value?: boolean | number;
	/** Mode édition : widget sélectionné. */
	selected?: boolean;
	/** `true` uniquement sur la page « Simulation HMI » : les animations pilotées par variable
	 * (voir `useHmiStyleAnimation`) y sont actives. Sur les pages de conception elles restent
	 * inertes, même si une simulation tourne en arrière-plan. */
	animationsEnabled?: boolean;
	/** Aperçu compact (toolbar) : masque le libellé. */
	hideLabel?: boolean;
	/** Mode édition : clic de sélection. */
	onClick?: () => void;
	/** Mode simulation : écrit une nouvelle valeur dans la variable liée — absent pour les
	 * widgets en lecture seule (voyant, jauge, afficheur numérique). */
	onValueChange?: (value: boolean | number) => void;
	/** Mode simulation : déclenche les actions liées à l'événement nommé (voir `HmiWidgetEvents`)
	 * — indépendant de `onValueChange`, un widget peut ne pas avoir de variable liée. */
	onTrigger?: (eventName: string) => void;
}
