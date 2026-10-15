"use client";

import {
	canPlaceCarton,
	isStartPressed,
	type CartonSortingState,
} from "@/3d-scenes/carton-sorting/carton-sorting.model";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { SceneComponentProps } from "../scene-views";
import useSampledValue from "../useSampledValue";
import CartonSortingLamps from "./CartonSortingLamps";

const PRESS_FEEDBACK_MS = 200;
const HANDLE_TILT_DEG = 45;
const START_GREEN = "#2e7d32";
const FEED_GREY = "#37474f";

const selectCanPlace = (state: CartonSortingState) => canPlaceCarton(state);
const selectCartonHigh = (state: CartonSortingState) => state.cartonHigh;
const selectStartPressed = (state: CartonSortingState) => isStartPressed(state);
const selectCounter = (state: CartonSortingState) => state.counter;

const controlStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: 4,
	padding: 0,
	border: 0,
	background: "none",
	font: "13px system-ui, sans-serif",
	color: "#263238",
};

function ChromeRing() {
	return (
		<>
			<circle cx={32} cy={32} r={30} fill="#78909c" />
			<circle cx={32} cy={32} r={27} fill="#cfd8dc" />
		</>
	);
}

/** Front view of a flush push button: the cap sinks slightly when pressed. */
function PushButtonIllustration({
	color,
	pressed,
	disabled,
}: {
	color: string;
	pressed: boolean;
	disabled: boolean;
}) {
	return (
		<svg width={64} height={64} viewBox="0 0 64 64" aria-hidden="true">
			<ChromeRing />
			<circle
				cx={32}
				cy={32}
				r={pressed ? 20 : 22}
				fill={disabled ? "#90a4ae" : color}
			/>
			<circle
				cx={32}
				cy={32}
				r={pressed ? 20 : 22}
				fill="#000"
				opacity={pressed && !disabled ? 0.25 : 0}
			/>
			<ellipse cx={26} cy={25} rx={7} ry={4} fill="#fff" opacity={0.25} />
		</svg>
	);
}

/** Front view of a two-position selector: the handle leans toward the low or the high mark. */
function SelectorIllustration({ high }: { high: boolean }) {
	return (
		<svg width={64} height={64} viewBox="0 0 64 64" aria-hidden="true">
			<ChromeRing />
			<circle cx={32} cy={32} r={22} fill="#212121" />
			<g
				transform={`rotate(${high ? HANDLE_TILT_DEG : -HANDLE_TILT_DEG} 32 32)`}
			>
				<rect x={25} y={5} width={14} height={34} rx={7} fill="#050505" />
				<rect x={30.5} y={9} width={3} height={24} rx={1.5} fill="#fff" />
			</g>
		</svg>
	);
}

function CounterDisplay({
	value,
	label,
}: {
	value: number | null;
	label: string;
}) {
	return (
		<div
			role="status"
			aria-label={label}
			style={{
				flex: 1,
				alignSelf: "stretch",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				gap: 4,
				padding: "6px 12px",
				borderRadius: 4,
				background: "#1b2a22",
				boxShadow: "inset 0 0 4px #000",
			}}
		>
			<span style={{ font: "12px system-ui, sans-serif", color: "#fff" }}>
				{label}
			</span>
			<span
				style={{
					color: "#7CFC9A",
					font: "bold 28px ui-monospace, Menlo, Consolas, monospace",
					textAlign: "right",
				}}
			>
				{value ?? "-"}
			</span>
		</div>
	);
}

function Group({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 6,
				padding: "10px 16px 12px",
				borderRadius: 8,
				background: "rgba(255,255,255,0.9)",
				boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
			}}
		>
			<span
				style={{
					font: "11px system-ui, sans-serif",
					color: "#607d8b",
					textTransform: "uppercase",
					letterSpacing: 0.5,
				}}
			>
				{title}
			</span>
			<div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
				{children}
			</div>
		</div>
	);
}

/** Operator console and carton feed of the carton sorting station. */
export default function CartonSortingControls({
	sample,
	interactive,
	send,
}: SceneComponentProps) {
	const t = useTranslations("scene3d.cartonSorting");
	const canPlace = useSampledValue(sample, selectCanPlace, true);
	const high = useSampledValue(sample, selectCartonHigh, false);
	const startPressed = useSampledValue(sample, selectStartPressed, false);
	const counter = useSampledValue(sample, selectCounter, null);
	const [placeFeedback, setPlaceFeedback] = useState(false);
	const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const startHeld = useRef(false);
	useEffect(
		() => () => {
			if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
		},
		[],
	);

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
	const placeDisabled = !interactive || !canPlace;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<Group title={t("feeder")}>
				<button
					type="button"
					disabled={placeDisabled}
					style={{
						...controlStyle,
						cursor: placeDisabled ? "default" : "pointer",
					}}
					onClick={() => {
						setPlaceFeedback(true);
						if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
						feedbackTimer.current = setTimeout(
							() => setPlaceFeedback(false),
							PRESS_FEEDBACK_MS,
						);
						send({ type: "newCarton" });
					}}
				>
					<PushButtonIllustration
						color={FEED_GREY}
						pressed={placeFeedback}
						disabled={placeDisabled}
					/>
					{t("newCarton")}
				</button>
				<button
					type="button"
					role="switch"
					aria-checked={high}
					aria-label={t("heightSwitch")}
					disabled={!interactive}
					style={{
						...controlStyle,
						cursor: interactive ? "pointer" : "default",
					}}
					onClick={() => send({ type: "setCartonHigh", high: !high })}
				>
					<span style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span
							style={{ fontSize: 11, fontWeight: high ? "normal" : "bold" }}
						>
							{t("lowMark")}
						</span>
						<SelectorIllustration high={high} />
						<span
							style={{ fontSize: 11, fontWeight: high ? "bold" : "normal" }}
						>
							{t("highMark")}
						</span>
					</span>
					{t("heightSwitch")}
				</button>
			</Group>
			<Group title={t("console")}>
				<div
					style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}
				>
					<div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
						<button
							type="button"
							disabled={!interactive}
							style={{
								...controlStyle,
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
						<CounterDisplay value={counter} label={t("sortedCounter")} />
					</div>
					<CartonSortingLamps sample={sample} />
				</div>
			</Group>
		</div>
	);
}
