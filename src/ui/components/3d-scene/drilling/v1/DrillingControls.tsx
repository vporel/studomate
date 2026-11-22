"use client";

import {
	DRILL_TRAVEL,
	isStartPressed,
	type DrillingState,
} from "@/3d-scenes/drilling/v1/drilling.model";
import ConsoleGroup from "@/ui/components/3d-scene/parts/ConsoleGroup";
import ConsolePanels from "@/ui/components/3d-scene/parts/ConsolePanels";
import {
	COMMAND_COLOR,
	LampWithLegend,
	SENSOR_COLOR,
	StartHoldButton,
} from "@/ui/components/3d-scene/parts/ConsoleParts";
import type { SceneComponentProps } from "@/ui/components/3d-scene/scene-views";
import useSampledValue from "@/ui/components/3d-scene/useSampledValue";
import { useTranslations } from "next-intl";

/** Lamps flow by column: the three commands, then the two limit switches. */
const LAMP_ROWS = 3;
const LAMPS = [
	{ id: "down", color: COMMAND_COLOR },
	{ id: "up", color: COMMAND_COLOR },
	{ id: "spindle", color: COMMAND_COLOR },
	{ id: "high", color: SENSOR_COLOR },
	{ id: "low", color: SENSOR_COLOR },
] as const;

const selectStartPressed = (state: DrillingState) => isStartPressed(state);
const selectLamps = (state: DrillingState) =>
	[
		state.commands.down,
		state.commands.up,
		state.commands.spindle,
		state.position <= 0,
		state.position >= DRILL_TRAVEL,
	].join();

/** Operator console of the drilling station: start button and indicator lamps. */
export default function DrillingControls({
	sample,
	interactive,
	send,
}: SceneComponentProps) {
	const t = useTranslations("scene3d.drilling");
	const tLamps = useTranslations("scene3d.drilling.lamps");
	const startPressed = useSampledValue(sample, selectStartPressed, false);
	const lit = useSampledValue(sample, selectLamps, "").split(",");

	return (
		<ConsolePanels>
			<ConsoleGroup title={t("console")}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 12,
					}}
				>
					<StartHoldButton
						interactive={interactive}
						pressed={startPressed}
						label={t("startCycle")}
						send={send}
					/>
					<div
						style={{
							display: "grid",
							gridTemplateRows: `repeat(${LAMP_ROWS}, auto)`,
							gridAutoFlow: "column",
							gap: "8px 24px",
						}}
					>
						{LAMPS.map(({ id, color }, i) => (
							<LampWithLegend
								key={id}
								on={lit[i] === "true"}
								color={color}
								label={tLamps(id)}
							/>
						))}
					</div>
				</div>
			</ConsoleGroup>
		</ConsolePanels>
	);
}
