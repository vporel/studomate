import { HmiWidgetType } from "@/schemas/hmi/hmi-widget.schema";
import { ComponentType } from "react";
import Ellipse from "./Ellipse";
import Gauge from "./Gauge";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import Indicator from "./Indicator";
import NumericDisplay from "./NumericDisplay";
import NumericInput from "./NumericInput";
import PushButton from "./PushButton";
import Rectangle from "./Rectangle";
import Text from "./Text";
import ToggleSwitch from "./ToggleSwitch";

/**
 * Mapping type de widget -> composant de rendu — même principe que `GRAFCET_ELEMENTS_CONFIG`
 * (voir `grafcet-nodes-definitions.ts`) : ajouter un widget consiste à créer son composant (qui
 * implémente `HmiWidgetComponentProps<SonData>`) et à l'ajouter ici, sans toucher à
 * `HmiWidgetItem`. Chaque composant est en réalité typé sur son propre `data` (`GaugeData`,
 * `PushButtonData`...) — cette map les unifie sous `HmiWidgetComponentProps<any>` pour pouvoir
 * les indexer par `HmiWidgetType`, comme `HmiWidgetItem` a besoin de le faire pour rendre
 * n'importe quel widget sans switch. C'est `HmiWidgetItem` qui garantit que chaque composant ne
 * reçoit jamais que le `data` correspondant à son propre type.
 */
export const HMI_WIDGET_COMPONENTS: Record<HmiWidgetType, ComponentType<HmiWidgetComponentProps<any>>> = {
	"push-button": PushButton,
	indicator: Indicator,
	"toggle-switch": ToggleSwitch,
	"numeric-display": NumericDisplay,
	gauge: Gauge,
	"numeric-input": NumericInput,
	rectangle: Rectangle,
	ellipse: Ellipse,
	text: Text,
};
