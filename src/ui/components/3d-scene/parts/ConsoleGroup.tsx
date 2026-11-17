"use client";

import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslations } from "next-intl";
import { type ReactNode, useContext } from "react";
import { ConsolePanelIndexContext, useScenePanels } from "./ScenePanelsContext";

/**
 * A panel of the controls of a scene, folded down to its title by a click on it. A folded panel
 * keeps its content in place, hidden, so that the box holding the panels keeps its width.
 */
export default function ConsoleGroup({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	const t = useTranslations("scene3d.panels");
	const index = useContext(ConsolePanelIndexContext);
	const { isCollapsed, toggle } = useScenePanels();
	const collapsed = isCollapsed(index);
	const label = collapsed ? t("expand") : t("collapse");

	return (
		<div
			role="group"
			aria-label={title}
			style={index > 0 ? { borderTop: "1px solid #e0e0e0" } : undefined}
		>
			<button
				type="button"
				aria-expanded={!collapsed}
				aria-label={`${label}: ${title}`}
				title={label}
				onClick={() => toggle(index)}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					width: "100%",
					padding: "6px 8px 6px 16px",
					border: "none",
					background: "none",
					cursor: "pointer",
					font: "11px system-ui, sans-serif",
					color: "#607d8b",
					textTransform: "uppercase",
					letterSpacing: 0.5,
				}}
			>
				{title}
				{collapsed ? (
					<ExpandMoreIcon fontSize="small" />
				) : (
					<ExpandLessIcon fontSize="small" />
				)}
			</button>
			<div
				style={
					collapsed
						? { height: 0, overflow: "hidden", visibility: "hidden" }
						: undefined
				}
			>
				<div
					style={{
						display: "flex",
						alignItems: "flex-end",
						gap: 20,
						padding: "4px 16px 12px",
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
