"use client";

import CartonSortingModel, {
	type CartonSortingState,
} from "@/3d-scenes/carton-sorting/carton-sorting.model";
import { useTranslations } from "next-intl";
import type { SceneComponentProps } from "../scene-views";
import useSampledValue from "../useSampledValue";

const COMMAND_COLOR = "#ef6c00";
const SENSOR_COLOR = "#2e7d32";
const OFF_COLOR = "#cfd8dc";
const CYLINDERS = ["p1", "p2", "p3"] as const;

type LampStates = Record<string, boolean>;

function selectLamps(state: CartonSortingState): LampStates {
	const sensors = CartonSortingModel.readSensors(state);
	const lamps: LampStates = {
		t1: state.t1Running,
		t2t3: state.t2t3Running,
		atStation: sensors.cartonAtStation === true,
		high: sensors.cartonHigh === true,
		atP2: sensors.cartonAtP2 === true,
		atP3: sensors.cartonAtP3 === true,
	};
	for (const key of CYLINDERS) {
		lamps[`${key}CmdOut`] = state.commands[`${key}Out`];
		lamps[`${key}CmdIn`] = state.commands[`${key}In`];
		lamps[`${key}AtOut`] = sensors[`${key}AtOut`] === true;
		lamps[`${key}AtIn`] = sensors[`${key}AtIn`] === true;
	}
	return lamps;
}

const sameLamps = (a: LampStates, b: LampStates) => {
	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => a[key] === b[key])
	);
};

const NO_LAMPS_LIT: LampStates = {};

function Lamp({
	on,
	color,
	label,
}: {
	on: boolean;
	color: string;
	label: string;
}) {
	return (
		<span
			role="img"
			aria-label={label}
			data-lit={on}
			style={{
				display: "inline-block",
				width: 14,
				height: 14,
				borderRadius: "50%",
				background: on ? color : OFF_COLOR,
				boxShadow: on ? `0 0 6px ${color}` : "inset 0 0 2px rgba(0, 0, 0, 0.4)",
			}}
		/>
	);
}

const captionStyle: React.CSSProperties = {
	font: "11px system-ui, sans-serif",
	color: "#546e7a",
	whiteSpace: "nowrap",
	fontWeight: "normal",
};

type LampColumn = { id: string; label: string; color: string };

/** Column captions: every section of the table shares the same four columns. */
function LampCaptions({
	title,
	columns,
	spaced = false,
}: {
	title?: string;
	columns: LampColumn[];
	spaced?: boolean;
}) {
	return (
		<tr>
			<th
				style={{
					...captionStyle,
					textAlign: "left",
					paddingTop: spaced ? 8 : 0,
				}}
			>
				{title}
			</th>
			{columns.map((column) => (
				<th
					key={column.id}
					style={{ ...captionStyle, padding: spaced ? "8px 6px 0" : "0 6px" }}
				>
					{column.label}
				</th>
			))}
		</tr>
	);
}

function LampRow({
	title,
	columns,
	lamps,
	idOf = (column) => column.id,
}: {
	title?: string;
	columns: LampColumn[];
	lamps: LampStates;
	idOf?: (column: LampColumn) => string;
}) {
	return (
		<tr>
			<th style={{ ...captionStyle, textAlign: "left" }}>{title}</th>
			{columns.map((column) => (
				<td key={column.id} style={{ textAlign: "center", padding: 3 }}>
					<Lamp
						on={lamps[idOf(column)] === true}
						color={column.color}
						label={title ? `${title} ${column.label}` : column.label}
					/>
				</td>
			))}
		</tr>
	);
}

/** Indicator lamps of the carton sorting station: cylinder commands and positions, conveyors, carton detection. */
export default function CartonSortingLamps({
	sample,
}: Pick<SceneComponentProps, "sample">) {
	const t = useTranslations("scene3d.cartonSorting.lamps");
	const lamps = useSampledValue(sample, selectLamps, NO_LAMPS_LIT, sameLamps);
	const cylinderColumns: LampColumn[] = [
		{ id: "CmdOut", label: t("cmdOut"), color: COMMAND_COLOR },
		{ id: "CmdIn", label: t("cmdIn"), color: COMMAND_COLOR },
		{ id: "AtOut", label: t("atOut"), color: SENSOR_COLOR },
		{ id: "AtIn", label: t("atIn"), color: SENSOR_COLOR },
	];
	const conveyorColumns: LampColumn[] = [
		{ id: "t1", label: "T1", color: COMMAND_COLOR },
		{ id: "t2t3", label: "T2 / T3", color: COMMAND_COLOR },
	];
	const stationColumns: LampColumn[] = [
		{ id: "atStation", label: t("present"), color: SENSOR_COLOR },
		{ id: "high", label: t("high"), color: SENSOR_COLOR },
		{ id: "atP2", label: "P2", color: SENSOR_COLOR },
		{ id: "atP3", label: "P3", color: SENSOR_COLOR },
	];

	return (
		<table style={{ borderCollapse: "collapse" }}>
			<thead>
				<LampCaptions columns={cylinderColumns} />
			</thead>
			<tbody>
				{CYLINDERS.map((key) => (
					<LampRow
						key={key}
						title={key.toUpperCase()}
						columns={cylinderColumns}
						lamps={lamps}
						idOf={(column) => `${key}${column.id}`}
					/>
				))}
				<LampCaptions title={t("belts")} columns={conveyorColumns} spaced />
				<LampRow columns={conveyorColumns} lamps={lamps} />
				<LampCaptions title={t("station")} columns={stationColumns} spaced />
				<LampRow columns={stationColumns} lamps={lamps} />
			</tbody>
		</table>
	);
}
