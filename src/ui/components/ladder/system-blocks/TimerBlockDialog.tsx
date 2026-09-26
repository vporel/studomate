"use client";

import { TimerBlockParams } from "@/schemas/ladder/block.schema";
import {
	TIMER_TYPES,
	TimerType,
} from "@/schemas/ladder/function-blocks/timer.schema";
import SystemBlockDialog from "./SystemBlockDialog";

const TIMER_TYPE_KEYS: Record<TimerType, string> = {
	TON: "typeTON",
	TOF: "typeTOF",
	TP: "typeTP",
};

const readVariant = (initial: TimerBlockParams) => initial.timerType;

/**
 * Configuration window of a timer block (name + type), see `SystemBlockDialog`. `pt` is edited
 * directly on the node.
 */
export default function TimerBlockDialog() {
	return (
		<SystemBlockDialog<TimerBlockParams, TimerType>
			blockType="timer"
			i18nNamespace="ladderEditor.timerDialog"
			variants={TIMER_TYPES}
			variantKeys={TIMER_TYPE_KEYS}
			defaultVariant="TON"
			readVariant={readVariant}
			buildCreation={(name, timerType) => ({ name, timerType, pt: "" })}
			applyEdit={(initial, name, timerType) => ({
				...initial,
				name,
				timerType,
			})}
		/>
	);
}
