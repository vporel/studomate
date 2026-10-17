"use client";

import { CounterBlockParams } from "@/schemas/ladder/block.schema";
import {
	COUNTER_TYPES,
	CounterType,
} from "@/schemas/ladder/function-blocks/counter.schema";
import SystemBlockDialog from "./SystemBlockDialog";

const COUNTER_TYPE_KEYS: Record<CounterType, string> = {
	CTU: "typeCTU",
	CTD: "typeCTD",
	CTUD: "typeCTUD",
};

const readVariant = (initial: CounterBlockParams) => initial.counterType;

/**
 * Configuration window of a counter block (name + type), see `SystemBlockDialog`. The control
 * (R/LD), PV and CV are edited directly on the node (see `ParamPinRow`), like PT/ET for a timer.
 */
export default function CounterBlockDialog() {
	return (
		<SystemBlockDialog<CounterBlockParams, CounterType>
			blockType="counter"
			i18nNamespace="ladderEditor.counterDialog"
			variants={COUNTER_TYPES}
			variantKeys={COUNTER_TYPE_KEYS}
			defaultVariant="CTU"
			showNote
			readVariant={readVariant}
			buildCreation={(name, counterType) => ({
				name,
				counterType,
				control: "",
				pv: "",
			})}
			applyEdit={(initial, name, counterType) => ({
				...initial,
				name,
				counterType,
			})}
		/>
	);
}
