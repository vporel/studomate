"use client";

const OFF_COLOR = "#cfd8dc";

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
