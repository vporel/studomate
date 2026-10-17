"use client";

import {
	canPlaceCarton,
	isStartPressed,
	type CartonSortingState,
} from "@/3d-scenes/carton-sorting/v1/carton-sorting.model";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { SceneComponentProps } from "@/ui/components/3d-scene/scene-views";
import useSampledValue from "@/ui/components/3d-scene/useSampledValue";
import {
	ChromeRing,
	ConsoleDisplay,
	ConsoleGroup,
	consoleButtonStyle,
	PushButtonIllustration,
} from "@/ui/components/3d-scene/parts/ConsoleParts";
import CartonSortingLamps from "./CartonSortingLamps";

const PRESS_FEEDBACK_MS = 200;
const HANDLE_TILT_DEG = 45;
const START_GREEN = "#2e7d32";
const FEED_GREY = "#37474f";

const selectCanPlace = (state: CartonSortingState) => canPlaceCarton(state);
const selectCartonHigh = (state: CartonSortingState) => state.cartonHigh;
const selectStartPressed = (state: CartonSortingState) => isStartPressed(state);
const selectCounter = (state: CartonSortingState) => state.counter;

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
			<ConsoleGroup title={t("feeder")}>
				<button
					type="button"
					disabled={placeDisabled}
					style={{
						...consoleButtonStyle,
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
						...consoleButtonStyle,
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
			</ConsoleGroup>
			<ConsoleGroup title={t("console")}>
				<div
					style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}
				>
					<div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
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
						<ConsoleDisplay value={counter} label={t("sortedCounter")} />
					</div>
					<CartonSortingLamps sample={sample} />
				</div>
			</ConsoleGroup>
		</div>
	);
}
