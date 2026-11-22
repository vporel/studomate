"use client";

import { useEffect, useRef } from "react";

const OFF_COLOR = "#cfd8dc";

/** Lamp colour of an output driven by the program. */
export const COMMAND_COLOR = "#ef6c00";
/** Lamp colour of an input read by the program. */
export const SENSOR_COLOR = "#2e7d32";
const START_COLOR = "#2e7d32";

/** Side, in px, of the round illustration of a console button. */
export const CONSOLE_BUTTON_SIZE = 55;

export const consoleButtonStyle: React.CSSProperties = {
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

export function ChromeRing() {
	return (
		<>
			<circle cx={32} cy={32} r={30} fill="#78909c" />
			<circle cx={32} cy={32} r={27} fill="#cfd8dc" />
		</>
	);
}

/** Front view of a flush push button: the cap sinks slightly when pressed. */
export function PushButtonIllustration({
	color,
	pressed,
	disabled,
}: {
	color: string;
	pressed: boolean;
	disabled: boolean;
}) {
	return (
		<svg
			width={CONSOLE_BUTTON_SIZE}
			height={CONSOLE_BUTTON_SIZE}
			viewBox="0 0 64 64"
			aria-hidden="true"
		>
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

export function ConsoleDisplay({
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

export function Lamp({
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

/** A lamp followed by its label. */
export function LampWithLegend({
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
			style={{
				display: "flex",
				alignItems: "center",
				gap: 6,
				font: "12px system-ui, sans-serif",
				color: "#37474f",
			}}
		>
			<Lamp on={on} color={color} label={label} />
			{label}
		</span>
	);
}

/**
 * The "start" push button: held down with the pointer, Space or Enter, it sends `pressStart` once
 * and `releaseStart` when let go (including on blur or when the pointer leaves).
 */
export function StartHoldButton({
	interactive,
	pressed,
	label,
	send,
}: {
	interactive: boolean;
	pressed: boolean;
	label: string;
	send: (interaction: unknown) => void;
}) {
	const held = useRef(false);

	useEffect(() => {
		if (!interactive) held.current = false;
	}, [interactive]);

	const press = () => {
		if (!interactive || held.current) return;
		held.current = true;
		send({ type: "pressStart" });
	};
	const release = () => {
		if (!held.current) return;
		held.current = false;
		send({ type: "releaseStart" });
	};

	return (
		<button
			type="button"
			disabled={!interactive}
			style={{
				...consoleButtonStyle,
				cursor: interactive ? "pointer" : "default",
			}}
			onPointerDown={(event) => {
				if (event.button === 0) press();
			}}
			onPointerUp={release}
			onPointerLeave={release}
			onPointerCancel={release}
			onBlur={release}
			onKeyDown={(event) => {
				if (event.key === " " || event.key === "Enter") press();
			}}
			onKeyUp={(event) => {
				if (event.key === " " || event.key === "Enter") release();
			}}
		>
			<PushButtonIllustration
				color={START_COLOR}
				pressed={pressed}
				disabled={!interactive}
			/>
			{label}
		</button>
	);
}
