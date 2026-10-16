"use client";

import {
	DRILL_TRAVEL,
	isStartPressed,
	type DrillingState,
} from "@/3d-scenes/drilling/v1/drilling.model";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import {
	ConsoleGroup,
	consoleButtonStyle,
	Lamp,
	PushButtonIllustration,
} from "@/ui/components/3d-scene/parts/ConsoleParts";
import type { SceneComponentProps } from "@/ui/components/3d-scene/scene-views";
import useSampledValue from "@/ui/components/3d-scene/useSampledValue";

const COMMAND_COLOR = "#ef6c00";
const SENSOR_COLOR = "#2e7d32";
const START_GREEN = "#2e7d32";
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
	const startHeld = useRef(false);

	useEffect(() => {
		if (!interactive) startHeld.current = false;
	}, [interactive]);

	const pressStart = () => {
		if (!interactive || startHeld.current) return;
		startHeld.current = true;
		send({ type: "pressStart" });
	};
	const releaseStart = () => {
		if (!startHeld.current) return;
		startHeld.current = false;
		send({ type: "releaseStart" });
	};

	return (
		<ConsoleGroup title={t("console")}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 12,
				}}
			>
				<button
					type="button"
					disabled={!interactive}
					style={{
						...consoleButtonStyle,
						cursor: interactive ? "pointer" : "default",
					}}
					onPointerDown={(event) => {
						if (event.button === 0) pressStart();
					}}
					onPointerUp={releaseStart}
					onPointerLeave={releaseStart}
					onPointerCancel={releaseStart}
					onBlur={releaseStart}
					onKeyDown={(event) => {
						if (event.key === " " || event.key === "Enter") pressStart();
					}}
					onKeyUp={(event) => {
						if (event.key === " " || event.key === "Enter") releaseStart();
					}}
				>
					<PushButtonIllustration
						color={START_GREEN}
						pressed={startPressed}
						disabled={!interactive}
					/>
					{t("startCycle")}
				</button>
				<div
					style={{
						display: "grid",
						gridTemplateRows: `repeat(${LAMP_ROWS}, auto)`,
						gridAutoFlow: "column",
						gap: "8px 24px",
					}}
				>
					{LAMPS.map(({ id, color }, i) => (
						<span
							key={id}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 6,
								font: "12px system-ui, sans-serif",
								color: "#37474f",
							}}
						>
							<Lamp on={lit[i] === "true"} color={color} label={tLamps(id)} />
							{tLamps(id)}
						</span>
					))}
				</div>
			</div>
		</ConsoleGroup>
	);
}
