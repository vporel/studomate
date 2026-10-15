"use client";

/** Name of the simulated project, framed at the top center of the scene. */
export default function ProjectTitle({ name }: { name: string | null }) {
	if (!name) return null;
	return (
		<div
			title={name}
			style={{
				position: "absolute",
				top: 12,
				left: "50%",
				transform: "translateX(-50%)",
				maxWidth: "40%",
				padding: "6px 20px",
				border: "1px solid #b0bec5",
				borderRadius: 6,
				background: "rgba(255,255,255,0.9)",
				boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
				color: "#263238",
				font: "bold 15px system-ui, sans-serif",
				letterSpacing: 1,
				textTransform: "uppercase",
				whiteSpace: "nowrap",
				overflow: "hidden",
				textOverflow: "ellipsis",
				pointerEvents: "none",
			}}
		>
			{name}
		</div>
	);
}
