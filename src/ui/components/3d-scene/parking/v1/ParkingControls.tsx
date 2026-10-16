"use client";

import {
	BARRIER_CLEAR,
	isCarWaiting,
	type ParkingInteraction,
	type ParkingState,
} from "@/3d-scenes/parking/v1/parking.model";
import { useTranslations } from "next-intl";
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
const WARNING_COLOR = "#c62828";
const CAR_BUTTONS = [
	{ id: "arrival", interaction: { type: "arrival" } },
	{ id: "departure", interaction: { type: "departure" } },
] as const satisfies readonly { id: string; interaction: ParkingInteraction }[];

const selectPlaces = (state: ParkingState) => state.places;
const selectLamps = (state: ParkingState) =>
	[
		isCarWaiting(state, "entry"),
		isCarWaiting(state, "exit"),
		state.barriers.entry >= BARRIER_CLEAR,
		state.barriers.exit >= BARRIER_CLEAR,
		state.full,
	].join();

const parseFlags = (flags: string) => flags.split(",").map((f) => f === "true");

/** Operator panels of the car park: console with places counter and lamps, and cars behaviour. */
export default function ParkingControls({
	sample,
	interactive,
	send,
}: SceneComponentProps) {
	const t = useTranslations("scene3d.parking");
	const tLamps = useTranslations("scene3d.parking.lampLabels");
	const places = useSampledValue(sample, selectPlaces, null);
	const [entryRequest, exitRequest, entryOpen, exitOpen, full] = parseFlags(
		useSampledValue(sample, selectLamps, ""),
	);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<ConsoleGroup title={t("console")}>
				<div
					style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}
				>
					<ConsoleDisplay value={places} label={t("places")} />
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(2, auto)",
							justifyContent: "start",
							gap: "8px 24px",
						}}
					>
						{(
							[
								{ id: "entryRequest", on: entryRequest, color: SENSOR_COLOR },
								{ id: "exitRequest", on: exitRequest, color: SENSOR_COLOR },
								{ id: "entryBarrierOpen", on: entryOpen, color: COMMAND_COLOR },
								{ id: "exitBarrierOpen", on: exitOpen, color: COMMAND_COLOR },
								{ id: "full", on: full, color: WARNING_COLOR },
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
				</div>
			</ConsoleGroup>
			<ConsoleGroup title={t("carsBehaviour")}>
				<div
					style={{
						display: "flex",
						alignItems: "stretch",
						justifyContent: "space-between",
						gap: 20,
						flex: 1,
					}}
				>
					{CAR_BUTTONS.map(({ id, interaction }) => (
						<button
							key={id}
							type="button"
							disabled={!interactive}
							style={{
								...consoleButtonStyle,
								cursor: interactive ? "pointer" : "default",
							}}
							onClick={() => send(interaction)}
						>
							<PushButtonIllustration
								color={BUTTON_COLOR}
								pressed={false}
								disabled={!interactive}
							/>
							{t(id)}
						</button>
					))}
				</div>
			</ConsoleGroup>
		</div>
	);
}
