import {
	DEFAULT_INDICATOR_OFF_COLOR,
	DEFAULT_INDICATOR_ON_COLOR,
	HmiPushButtonBehavior,
	HmiWidget,
	HmiWidgetSize,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { ComponentType } from "react";
import GaugeSymbol from "../toolbar/GaugeSymbol";
import LineSymbol from "../toolbar/LineSymbol";
import NumericInputSymbol from "../toolbar/NumericInputSymbol";
import Ellipse from "./Ellipse";
import Gauge from "./Gauge";
import Line from "./Line";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import Indicator from "./Indicator";
import NumericDisplay from "./NumericDisplay";
import NumericInput from "./NumericInput";
import PushButton from "./PushButton";
import Rectangle from "./Rectangle";
import Text from "./Text";
import ToggleSwitch from "./ToggleSwitch";

/** `data` du membre de l'union `HmiWidget` correspondant à `T`. */
type WidgetData<T extends HmiWidgetType> = Extract<
	HmiWidget,
	{ type: T }
>["data"];

/** Descripteur d'un champ spécifique du panneau Propriétés (voir `HmiWidgetPropertyFields`). Le
 * câblage vers `data` passe par `get`/`set` typés sur le `*Data` du widget — pas de chemin string,
 * TS casse sur un mauvais champ. */
export type HmiWidgetPropertyField<D> =
	| {
			kind: "text";
			label: string;
			multiline?: boolean;
			get: (data: D) => string;
			set: (data: D, value: string) => D;
	  }
	| {
			kind: "color";
			label: string;
			get: (data: D) => string;
			set: (data: D, value: string) => D;
	  }
	| {
			kind: "number";
			label: string;
			min?: number;
			max?: number;
			get: (data: D) => number;
			set: (data: D, value: number) => D;
	  }
	| {
			kind: "select";
			label: string;
			options: { value: string; label: string }[];
			get: (data: D) => string;
			set: (data: D, value: string) => D;
			/** Patch supplémentaire du widget appliqué en même temps que `set` — échappatoire pour
			 * les rares champs à effet de bord (ex. l'orientation de la jauge échange largeur/hauteur). */
			widgetPatch?: (
				widget: HmiWidget,
				value: string,
			) => { size?: HmiWidgetSize };
	  }
	| {
			kind: "checkbox";
			label: string;
			get: (data: D) => boolean;
			set: (data: D, value: boolean) => D;
	  };

/** Propriété de style animable d'un widget (voir `HmiWidgetAnimationsPane`) — `staticValue` lit la
 * valeur statique courante dans `data` (valeur de départ d'une nouvelle ligne de la table). */
export type HmiAnimatableStyleProp<D> = {
	name: string;
	label: string;
	inputType: "color" | "text";
	staticValue: (data: D) => string;
};

/** Métadonnées d'affichage de chaque type de widget — pendant UI de `HMI_WIDGET_DEFINITIONS`
 * (domaine). Ajouter un widget = une entrée ici (composant + aperçu + descripteurs de champs).
 *
 * Les `label` (champs, options, événements) sont des **clés de traduction** relatives au
 * namespace `hmiEditor` (ex. `"fields.behavior"`, `"options.momentary"`) : le rendu passe par
 * `useT("hmiEditor")` dans les panneaux qui consomment ces descripteurs. `manualDescription`
 * est une **clé de traduction** (namespace `hmiEditor.widgetManual`), résolue par `HmiSection`. */
export type HmiWidgetUi<T extends HmiWidgetType = HmiWidgetType> = {
	component: ComponentType<HmiWidgetComponentProps<any>>;
	/** Symbole d'aperçu compact si le rendu réel est illisible en miniature (ex. jauge, saisie). */
	toolSymbol?: ComponentType;
	/** Largeur d'aperçu dans la palette, en px. */
	previewWidth: number;
	/** Valeur de démo passée au rendu d'aperçu (ex. jauge à 30 %). */
	previewValue: boolean | number;
	/** Ordre d'apparition dans son groupe de palette (voir `HMI_WIDGET_TOOLS`). */
	paletteOrder: number;
	/** Clé i18n (namespace `hmiEditor.widgetManual`) de la phrase du manuel pour ce widget
	 * (voir `HmiSection`). */
	manualDescription: string;
	animatableStyleProps: HmiAnimatableStyleProp<WidgetData<T>>[];
	events: { name: string; label: string }[];
	propertyFields: HmiWidgetPropertyField<WidgetData<T>>[];
};

const PUSH_BUTTON_BEHAVIORS: { value: HmiPushButtonBehavior; label: string }[] =
	[
		{ value: "momentary", label: "options.momentary" },
		{ value: "set", label: "options.set" },
		{ value: "reset", label: "options.reset" },
		{ value: "toggle", label: "options.toggle" },
	];

export const HMI_WIDGET_UI: { [T in HmiWidgetType]: HmiWidgetUi<T> } = {
	"push-button": {
		component: PushButton,
		previewWidth: 46,
		previewValue: false,
		paletteOrder: 1,
		manualDescription: "widgetManual.pushButton",
		animatableStyleProps: [],
		events: [{ name: "onPress", label: "events.onPress" }],
		propertyFields: [
			{
				kind: "select",
				label: "fields.behavior",
				options: PUSH_BUTTON_BEHAVIORS,
				get: (data) => data.behavior ?? "momentary",
				set: (data, value) => ({
					...data,
					behavior: value as HmiPushButtonBehavior,
				}),
			},
		],
	},
	"toggle-switch": {
		component: ToggleSwitch,
		previewWidth: 40,
		previewValue: false,
		paletteOrder: 2,
		manualDescription: "widgetManual.toggleSwitch",
		animatableStyleProps: [],
		events: [],
		propertyFields: [],
	},
	indicator: {
		component: Indicator,
		previewWidth: 24,
		previewValue: false,
		paletteOrder: 3,
		manualDescription: "widgetManual.indicator",
		animatableStyleProps: [],
		events: [],
		propertyFields: [
			{
				kind: "color",
				label: "fields.onColor",
				get: (data) => data.onColor ?? DEFAULT_INDICATOR_ON_COLOR,
				set: (data, value) => ({ ...data, onColor: value }),
			},
			{
				kind: "color",
				label: "fields.offColor",
				get: (data) => data.offColor ?? DEFAULT_INDICATOR_OFF_COLOR,
				set: (data, value) => ({ ...data, offColor: value }),
			},
		],
	},
	"numeric-display": {
		component: NumericDisplay,
		previewWidth: 50,
		previewValue: 0,
		paletteOrder: 4,
		manualDescription: "widgetManual.numericDisplay",
		animatableStyleProps: [],
		events: [],
		propertyFields: [
			{
				kind: "text",
				label: "fields.unit",
				get: (data) => data.unit ?? "",
				set: (data, value) => ({ ...data, unit: value }),
			},
			{
				kind: "number",
				label: "fields.decimals",
				min: 0,
				max: 6,
				get: (data) => data.decimalPlaces ?? 0,
				set: (data, value) => ({ ...data, decimalPlaces: value }),
			},
		],
	},
	gauge: {
		component: Gauge,
		toolSymbol: GaugeSymbol,
		previewWidth: 60,
		previewValue: 30,
		paletteOrder: 5,
		manualDescription: "widgetManual.gauge",
		animatableStyleProps: [],
		events: [],
		propertyFields: [
			{
				kind: "select",
				label: "fields.orientation",
				options: [
					{ value: "horizontal", label: "options.horizontal" },
					{ value: "vertical", label: "options.vertical" },
				],
				get: (data) => data.style?.orientation ?? "horizontal",
				set: (data, value) => ({
					...data,
					style: {
						...data.style,
						orientation: value as "horizontal" | "vertical",
					},
				}),
				// La taille stockée reste exprimée "comme si horizontal" : on échange largeur/hauteur
				// au changement d'orientation plutôt que de recalculer les bornes de redimensionnement
				// par orientation (voir `useHmiWidgetResize`, resté générique).
				widgetPatch: (widget) => ({
					size: { width: widget.size.height, height: widget.size.width },
				}),
			},
			{
				kind: "number",
				label: "fields.min",
				get: (data) => data.min ?? 0,
				set: (data, value) => ({ ...data, min: value }),
			},
			{
				kind: "number",
				label: "fields.max",
				get: (data) => data.max ?? 100,
				set: (data, value) => ({ ...data, max: value }),
			},
		],
	},
	"numeric-input": {
		component: NumericInput,
		toolSymbol: NumericInputSymbol,
		previewWidth: 50,
		previewValue: 0,
		paletteOrder: 6,
		manualDescription: "widgetManual.numericInput",
		animatableStyleProps: [],
		events: [],
		propertyFields: [
			{
				kind: "number",
				label: "fields.min",
				get: (data) => data.min ?? 0,
				set: (data, value) => ({ ...data, min: value }),
			},
			{
				kind: "number",
				label: "fields.max",
				get: (data) => data.max ?? 100,
				set: (data, value) => ({ ...data, max: value }),
			},
		],
	},
	text: {
		component: Text,
		previewWidth: 50,
		previewValue: 0,
		paletteOrder: 1,
		manualDescription: "widgetManual.text",
		animatableStyleProps: [
			{
				name: "text",
				label: "fields.text",
				inputType: "text",
				staticValue: (data) => data.text,
			},
		],
		events: [],
		propertyFields: [
			{
				kind: "text",
				label: "fields.text",
				multiline: true,
				get: (data) => data.text,
				set: (data, value) => ({ ...data, text: value }),
			},
			{
				kind: "number",
				label: "fields.size",
				min: 1,
				get: (data) => data.style?.fontSize ?? 14,
				set: (data, value) => ({
					...data,
					style: { ...data.style, fontSize: value },
				}),
			},
			{
				kind: "color",
				label: "fields.color",
				get: (data) => data.style?.color ?? "#333333",
				set: (data, value) => ({
					...data,
					style: { ...data.style, color: value },
				}),
			},
			{
				kind: "select",
				label: "fields.align",
				options: [
					{ value: "left", label: "options.left" },
					{ value: "center", label: "options.center" },
					{ value: "right", label: "options.right" },
				],
				get: (data) => data.style?.align ?? "center",
				set: (data, value) => ({
					...data,
					style: {
						...data.style,
						align: value as "left" | "center" | "right",
					},
				}),
			},
		],
	},
	rectangle: {
		component: Rectangle,
		previewWidth: 40,
		previewValue: 0,
		paletteOrder: 3,
		manualDescription: "widgetManual.rectangle",
		animatableStyleProps: [
			{
				name: "fill",
				label: "fields.fill",
				inputType: "color",
				staticValue: (data) => data.style.fill,
			},
			{
				name: "stroke",
				label: "fields.stroke",
				inputType: "color",
				staticValue: (data) => data.style.stroke,
			},
		],
		events: [],
		propertyFields: [
			{
				kind: "color",
				label: "fields.fill",
				get: (data) => data.style.fill,
				set: (data, value) => ({
					...data,
					style: { ...data.style, fill: value },
				}),
			},
			{
				kind: "color",
				label: "fields.stroke",
				get: (data) => data.style.stroke,
				set: (data, value) => ({
					...data,
					style: { ...data.style, stroke: value },
				}),
			},
			{
				kind: "number",
				label: "fields.strokeWidth",
				min: 0,
				get: (data) => data.style.strokeWidth ?? 0,
				set: (data, value) => ({
					...data,
					style: { ...data.style, strokeWidth: value },
				}),
			},
			{
				kind: "number",
				label: "fields.borderRadius",
				min: 0,
				get: (data) => data.style.borderRadius ?? 0,
				set: (data, value) => ({
					...data,
					style: { ...data.style, borderRadius: value },
				}),
			},
		],
	},
	ellipse: {
		component: Ellipse,
		previewWidth: 40,
		previewValue: 0,
		paletteOrder: 4,
		manualDescription: "widgetManual.ellipse",
		animatableStyleProps: [
			{
				name: "fill",
				label: "fields.fill",
				inputType: "color",
				staticValue: (data) => data.style.fill,
			},
			{
				name: "stroke",
				label: "fields.stroke",
				inputType: "color",
				staticValue: (data) => data.style.stroke,
			},
		],
		events: [],
		propertyFields: [
			{
				kind: "color",
				label: "fields.fill",
				get: (data) => data.style.fill,
				set: (data, value) => ({
					...data,
					style: { ...data.style, fill: value },
				}),
			},
			{
				kind: "color",
				label: "fields.stroke",
				get: (data) => data.style.stroke,
				set: (data, value) => ({
					...data,
					style: { ...data.style, stroke: value },
				}),
			},
			{
				kind: "number",
				label: "fields.strokeWidth",
				min: 0,
				get: (data) => data.style.strokeWidth ?? 0,
				set: (data, value) => ({
					...data,
					style: { ...data.style, strokeWidth: value },
				}),
			},
		],
	},
	line: {
		component: Line,
		toolSymbol: LineSymbol,
		previewWidth: 40,
		previewValue: 0,
		paletteOrder: 2,
		manualDescription: "widgetManual.line",
		animatableStyleProps: [
			{
				name: "color",
				label: "fields.color",
				inputType: "color",
				staticValue: (data) => data.style.color,
			},
		],
		events: [],
		propertyFields: [
			{
				kind: "color",
				label: "fields.color",
				get: (data) => data.style.color,
				set: (data, value) => ({
					...data,
					style: { ...data.style, color: value },
				}),
			},
			{
				kind: "number",
				label: "fields.thickness",
				min: 1,
				get: (data) => data.style.thickness ?? 2,
				set: (data, value) => ({
					...data,
					style: { ...data.style, thickness: value },
				}),
			},
			{
				kind: "select",
				label: "fields.orientation",
				options: [
					{ value: "horizontal", label: "options.horizontal" },
					{ value: "vertical", label: "options.vertical" },
				],
				get: (data) => data.style.orientation ?? "horizontal",
				set: (data, value) => ({
					...data,
					style: {
						...data.style,
						orientation: value as "horizontal" | "vertical",
					},
				}),
				// La taille stockée reste exprimée "comme si horizontal" : on échange
				// largeur/hauteur au changement d'orientation (voir `gauge`).
				widgetPatch: (widget) => ({
					size: { width: widget.size.height, height: widget.size.width },
				}),
			},
		],
	},
};
