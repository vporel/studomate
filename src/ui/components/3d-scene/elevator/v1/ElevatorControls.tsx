"use client";

import {
	DOOR_TRAVEL,
	isButtonPressed,
	type ElevatorButton,
	type ElevatorState,
} from "@/3d-scenes/elevator/v1/elevator.model";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import {
	ConsoleDisplay,
	ConsoleGroup,
	Lamp,
	consoleButtonStyle,
	PushButtonIllustration,
} from "@/ui/components/3d-scene/parts/ConsoleParts";
import type { SceneComponentProps } from "@/ui/components/3d-scene/scene-views";
import useSampledValue from "@/ui/components/3d-scene/useSampledValue";

const BUTTON_COLOR = "#37474f";
const COMMAND_COLOR = "#ef6c00";
const SENSOR_COLOR = "#2e7d32";
const FLOORS = [2, 1, 0] as const;

const selectCabinPressed = (state: ElevatorState) =>
	FLOORS.map((floor) => isButtonPressed(state, `cabinButton${floor}`)).join();
const selectLandingPressed = (state: ElevatorState) =>
	FLOORS.map((floor) => isButtonPressed(state, `landingButton${floor}`)).join();
const selectCurrentFloor = (state: ElevatorState) => state.currentFloor;
const selectLamps = (state: ElevatorState) =>
	[
		state.commands.up,
		state.commands.down,
		state.doorPosition >= DOOR_TRAVEL,
	].join();

const parseFlags = (flags: string) => flags.split(",").map((f) => f === "true");

function ButtonRow({
	prefix,
	pressed,
	interactive,
	press,
	release,
}: {
	prefix: "cabinButton" | "landingButton";
	pressed: boolean[];
	interactive: boolean;
	press: (button: ElevatorButton) => void;
	release: (button: ElevatorButton) => void;
}) {
	const t = useTranslations("scene3d.elevator");
	return (
		<div
			style={{
				display: "flex",
				alignItems: "stretch",
				justifyContent: "space-between",
				flex: 1,
			}}
		>
			{FLOORS.map((floor, i) => {
				const button = `${prefix}${floor}` as ElevatorButton;
				return (
					<button
						key={button}
						type="button"
						disabled={!interactive}
						style={{
							...consoleButtonStyle,
							cursor: interactive ? "pointer" : "default",
						}}
						onPointerDown={(event) => {
							if (event.button === 0) press(button);
						}}
						onPointerUp={() => release(button)}
						onPointerLeave={() => release(button)}
						onPointerCancel={() => release(button)}
						onBlur={() => release(button)}
						onKeyDown={(event) => {
							if (event.key === " " || event.key === "Enter") press(button);
						}}
						onKeyUp={(event) => {
							if (event.key === " " || event.key === "Enter") release(button);
						}}
					>
						<PushButtonIllustration
							color={BUTTON_COLOR}
							pressed={pressed[i]}
							disabled={!interactive}
						/>
						{t(`floor${floor}`)}
					</button>
				);
			})}
		</div>
	);
}

/** Operator panels of the lift: landing calls with the floor display, cabin buttons and lamps. */
export default function ElevatorControls({
	sample,
	interactive,
	send,
}: SceneComponentProps) {
	const t = useTranslations("scene3d.elevator");
	const tLamps = useTranslations("scene3d.elevator.lampLabels");
	const cabinPressed = useSampledValue(sample, selectCabinPressed, "");
	const landingPressed = useSampledValue(sample, selectLandingPressed, "");
	const currentFloor = useSampledValue(sample, selectCurrentFloor, null);
	const lamps = useSampledValue(sample, selectLamps, "");
	const [up, down, doorOpen] = parseFlags(lamps);
	const held = useRef(new Set<ElevatorButton>());

	useEffect(() => {
		if (!interactive) held.current.clear();
	}, [interactive]);

	const press = (button: ElevatorButton) => {
		if (!interactive || held.current.has(button)) return;
		held.current.add(button);
		send({ type: "pressButton", button });
	};
	const release = (button: ElevatorButton) => {
		if (!held.current.delete(button)) return;
		send({ type: "releaseButton", button });
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<ConsoleGroup title={t("outside")}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 12,
						flex: 1,
					}}
				>
					<ConsoleDisplay value={currentFloor} label={t("currentFloor")} />
					<ButtonRow
						prefix="landingButton"
						pressed={parseFlags(landingPressed)}
						interactive={interactive}
						press={press}
						release={release}
					/>
				</div>
			</ConsoleGroup>
			<ConsoleGroup title={t("inside")}>
				<ButtonRow
					prefix="cabinButton"
					pressed={parseFlags(cabinPressed)}
					interactive={interactive}
					press={press}
					release={release}
				/>
			</ConsoleGroup>
			<ConsoleGroup title={t("lamps")}>
				<div style={{ display: "flex", gap: 16 }}>
					{(
						[
							{ id: "up", on: up, color: COMMAND_COLOR },
							{ id: "down", on: down, color: COMMAND_COLOR },
							{ id: "doorOpen", on: doorOpen, color: SENSOR_COLOR },
						] as const
					).map(({ id, on, color }) => (
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
							<Lamp on={on} color={color} label={tLamps(id)} />
							{tLamps(id)}
						</span>
					))}
				</div>
			</ConsoleGroup>
		</div>
	);
}
