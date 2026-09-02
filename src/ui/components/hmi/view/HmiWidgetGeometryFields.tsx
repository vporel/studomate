"use client";

import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidget,
	HmiWidgetSize,
} from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import useCommittedField from "@/ui/lib/hooks/useCommittedField";
import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { ReactNode, useEffect } from "react";
import { useT } from "@/ui/i18n/useT";
import { HMI_WIDGET_DEFAULT_MIN_SIZE } from "./constants";
import { HmiWidgetRect } from "./useHmiWidgetResize";

type GeometryKey = "x" | "y" | "width" | "height";

const clamp = (value: number, min: number, max: number) =>
	Math.max(min, Math.min(max, value));

/** Nouveau rectangle après édition d'un seul champ (`key`) à `value` dans les sections Position /
 * Dimensions. Borne au canvas et à `minSize` ; avec `aspectRatio` (voir
 * `HmiWidget.getResizeAspectRatio`), la dimension non éditée suit pour préserver le ratio. */
export function applyGeometryEdit(
	current: HmiWidgetRect,
	key: GeometryKey,
	value: number,
	minSize: HmiWidgetSize,
	aspectRatio?: number,
): HmiWidgetRect {
	let { x, y } = current.position;
	let { width, height } = current.size;
	if (key === "x") {
		x = clamp(value, 0, HMI_CANVAS_WIDTH - width);
	} else if (key === "y") {
		y = clamp(value, 0, HMI_CANVAS_HEIGHT - height);
	} else if (key === "width") {
		width = clamp(value, minSize.width, HMI_CANVAS_WIDTH - x);
		if (aspectRatio)
			height = clamp(width / aspectRatio, minSize.height, HMI_CANVAS_HEIGHT - y);
	} else {
		height = clamp(value, minSize.height, HMI_CANVAS_HEIGHT - y);
		if (aspectRatio)
			width = clamp(height * aspectRatio, minSize.width, HMI_CANVAS_WIDTH - x);
	}
	return { position: { x, y }, size: { width, height } };
}

/** Sections "Position" et "Dimensions" du panneau Propriétés : une saisie numérique directe des
 * coordonnées et de la taille du widget, en complément du glisser et des poignées sur le canvas.
 * Les valeurs sont bornées au canvas et à la taille minimale du type ; un ratio verrouillé
 * (`HmiWidget.getResizeAspectRatio`) fait suivre la dimension non éditée.
 *
 * La frappe est répercutée aussitôt en aperçu visuel (`onPreview`, même canal que les poignées),
 * mais la commande annulable n'est enregistrée qu'au blur ou sur Entrée — une valeur par frappe
 * remplirait la pile d'annulation. */
const HmiWidgetGeometryFields = ({
	widget,
	onPreview,
}: {
	widget: HmiWidget;
	onPreview: (rect: HmiWidgetRect | null) => void;
}) => {
	const t = useT("hmiEditor.panel");
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const aspectRatio = HmiWidget.getResizeAspectRatio(widget);
	const minSize =
		HMI_WIDGET_DEFINITIONS[widget.type].minSize ?? HMI_WIDGET_DEFAULT_MIN_SIZE;

	// Filet de sécurité : toute évolution externe (glisser, poignées, undo/redo) coupe un aperçu de
	// saisie resté ouvert. La resynchro des champs est portée par `useCommittedField` lui-même.
	useEffect(() => {
		onPreview(null);
	}, [
		widget.position.x,
		widget.position.y,
		widget.size.width,
		widget.size.height,
		onPreview,
	]);
	useEffect(() => () => onPreview(null), [onPreview]);

	const canonical = (key: GeometryKey) =>
		key === "x"
			? widget.position.x
			: key === "y"
				? widget.position.y
				: key === "width"
					? widget.size.width
					: widget.size.height;

	const axisOf = (key: GeometryKey, rect: HmiWidgetRect) =>
		key === "x"
			? rect.position.x
			: key === "y"
				? rect.position.y
				: key === "width"
					? rect.size.width
					: rect.size.height;

	// Options d'un champ géométrique : `parse` borne l'axe (sans ratio, pour que `useCommittedField`
	// détecte l'absence de changement), `onEdit` alimente l'aperçu et `onCommit` enregistre la
	// commande — les deux en repassant par `applyGeometryEdit` avec le ratio.
	const fieldOptions = (key: GeometryKey) => ({
		value: canonical(key),
		parse: (text: string): number | null => {
			const n = Number(text);
			if (text.trim() === "" || !Number.isFinite(n)) return null;
			return axisOf(key, applyGeometryEdit(widget, key, n, minSize));
		},
		onEdit: (value: number | null) =>
			onPreview(
				value === null
					? null
					: applyGeometryEdit(widget, key, value, minSize, aspectRatio),
			),
		onCommit: (value: number) => {
			const rect = applyGeometryEdit(widget, key, value, minSize, aspectRatio);
			const patch: Parameters<typeof updateWidget>[1] = {};
			if (
				rect.position.x !== widget.position.x ||
				rect.position.y !== widget.position.y
			)
				patch.position = rect.position;
			if (
				rect.size.width !== widget.size.width ||
				rect.size.height !== widget.size.height
			)
				patch.size = rect.size;
			if (patch.position || patch.size) updateWidget(widget.id, patch);
		},
	});

	const xField = useCommittedField<number>(fieldOptions("x"));
	const yField = useCommittedField<number>(fieldOptions("y"));
	const widthField = useCommittedField<number>(fieldOptions("width"));
	const heightField = useCommittedField<number>(fieldOptions("height"));

	const field = (
		f: ReturnType<typeof useCommittedField<number>>,
		label: string,
	) => (
		<TextField
			label={label}
			size="small"
			type="number"
			sx={{ flex: 1, minWidth: 0 }}
			slotProps={{
				inputLabel: { shrink: true },
				htmlInput: { onKeyDown: f.onKeyDown },
			}}
			value={f.value}
			onChange={f.onChange}
			onBlur={f.onBlur}
		/>
	);

	// Un type à ratio imposé (voyant carré) ne laisse rien à lier : l'icône n'a pas de sens.
	const canLockAspectRatio =
		HMI_WIDGET_DEFINITIONS[widget.type].aspectRatio === undefined;
	const linked = widget.data.lockAspectRatio ?? false;

	return (
		<>
			<Section title={t("position")}>
				{field(xField, "X")}
				{field(yField, "Y")}
			</Section>
			<Section title={t("dimensions")}>
				{field(widthField, t("width"))}
				{canLockAspectRatio && (
					<Tooltip
						title={
							linked
								? t("sizeLinked")
								: t("linkSize")
						}
					>
						<IconButton
							size="small"
							onClick={() =>
								updateWidget(widget.id, {
									data: { lockAspectRatio: !linked },
								})
							}
							color={linked ? "primary" : "default"}
							sx={{ alignSelf: "center", mt: "6px", flexShrink: 0 }}
						>
							{linked ? (
								<LinkIcon fontSize="small" />
							) : (
								<LinkOffIcon fontSize="small" />
							)}
						</IconButton>
					</Tooltip>
				)}
				{field(heightField, t("height"))}
			</Section>
		</>
	);
};

const Section = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) => (
	<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
		<Typography
			variant="caption"
			sx={{ fontWeight: 700, color: "text.secondary" }}
		>
			{title}
		</Typography>
		<Box sx={{ display: "flex", gap: 1 }}>{children}</Box>
	</Box>
);

export default HmiWidgetGeometryFields;
