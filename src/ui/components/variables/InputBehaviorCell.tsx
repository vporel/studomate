"use client";

import {
	DEFAULT_SLIDER_PARAMS,
	getAllowedInputBehaviorKinds,
	InputBehavior,
	InputBehaviorKind,
} from "@/schemas/variable/input-behavior";
import { validateBehavior } from "@/schemas/variable/variable.validator";
import { useT } from "@/ui/i18n/useT";
import useFormatInputBehavior, {
	INPUT_BEHAVIOR_KIND_LABEL_KEYS,
} from "@/ui/lib/variables/useFormatInputBehavior";
import {
	Box,
	Button,
	ButtonBase,
	MenuItem,
	Popover,
	TextField,
	Typography,
} from "@mui/material";
import { MouseEvent, SyntheticEvent, useState } from "react";
import { useProjectStore } from "../projects/ProjectContext";

const NONE = "none";

/** An empty field gives `NaN` (rejected by validation) rather than `Number("")`'s `0`. */
const toNumber = (text: string) => (text.trim() === "" ? NaN : Number(text));

function buildBehavior(
	kind: InputBehaviorKind | typeof NONE,
	min: string,
	max: string,
): InputBehavior | null {
	if (kind === NONE) return null;
	if (kind === "slider")
		return { kind, params: { min: toNumber(min), max: toNumber(max) } };
	return { kind, params: null };
}

// The popover is rendered in a portal, but React events still bubble to the grid cell: without
// this, typing or clicking in it would start row editing or move the grid's focus.
const stopPropagation = (e: SyntheticEvent) => e.stopPropagation();

/**
 * "Behavior" cell of the inputs table: shows the behavior summary and, in design mode, opens a
 * popover to choose it (and the bounds of a slider).
 */
export default function InputBehaviorCell({
	variableId,
	editable,
}: {
	variableId: string;
	editable: boolean;
}) {
	const t = useT("pages.variablesGrid.behavior");
	const tv = useT("variableValidation");
	const formatBehavior = useFormatInputBehavior();
	const variablesManager = useProjectStore((s) => s.variablesManager);
	const variable = useProjectStore((s) =>
		s.project?.variables.find((v) => v.id === variableId),
	);
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const [kind, setKind] = useState<InputBehaviorKind | typeof NONE>(NONE);
	const [min, setMin] = useState("");
	const [max, setMax] = useState("");

	if (!variable) return null;
	const allowedKinds = getAllowedInputBehaviorKinds(variable.zone, variable.type);
	if (allowedKinds.length === 0) return null;

	const open = (e: MouseEvent<HTMLElement>) => {
		e.stopPropagation();
		const current = variable.behavior;
		const sliderParams =
			current?.kind === "slider" ? current.params : DEFAULT_SLIDER_PARAMS;
		setKind(current?.kind ?? NONE);
		setMin(String(sliderParams.min));
		setMax(String(sliderParams.max));
		setAnchor(e.currentTarget);
	};

	const draft = buildBehavior(kind, min, max);
	const issues = validateBehavior(variable.zone, variable.type, draft);
	const error =
		issues.length > 0
			? tv(issues[0].code as never, issues[0].params as never)
			: undefined;

	const apply = () => {
		if (error) return;
		variablesManager.updateVariable(variable.id, { behavior: draft });
		setAnchor(null);
	};

	const summary = formatBehavior(variable.behavior);

	return (
		<>
			{editable ? (
				<ButtonBase
					onClick={open}
					onDoubleClick={stopPropagation}
					aria-label={t("editAria", { mnemonic: variable.mnemonic })}
					sx={{
						width: "100%",
						height: "100%",
						justifyContent: "flex-start",
						font: "inherit",
						color: summary ? "inherit" : "text.disabled",
					}}
				>
					{summary || t("none")}
				</ButtonBase>
			) : (
				<Typography variant="body2" sx={{ lineHeight: "35px" }}>
					{summary}
				</Typography>
			)}
			<Popover
				open={!!anchor}
				anchorEl={anchor}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
				onClick={stopPropagation}
				onDoubleClick={stopPropagation}
				onMouseDown={stopPropagation}
				onKeyDown={(e) => {
					e.stopPropagation();
					if (e.key === "Enter") apply();
				}}
			>
				<Box
					sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, width: 260 }}
				>
					<TextField
						select
						size="small"
						label={t("kind")}
						value={kind}
						onChange={(e) =>
							setKind(e.target.value as InputBehaviorKind | typeof NONE)
						}
					>
						<MenuItem value={NONE}>{t("none")}</MenuItem>
						{allowedKinds.map((k) => (
							<MenuItem key={k} value={k}>
								{t(INPUT_BEHAVIOR_KIND_LABEL_KEYS[k])}
							</MenuItem>
						))}
					</TextField>
					{kind === "slider" && (
						<Box sx={{ display: "flex", gap: 1 }}>
							<TextField
								size="small"
								type="number"
								label={t("min")}
								value={min}
								onChange={(e) => setMin(e.target.value)}
							/>
							<TextField
								size="small"
								type="number"
								label={t("max")}
								value={max}
								onChange={(e) => setMax(e.target.value)}
							/>
						</Box>
					)}
					{error && (
						<Typography variant="caption" color="error">
							{error}
						</Typography>
					)}
					<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
						<Button size="small" onClick={() => setAnchor(null)}>
							{t("cancel")}
						</Button>
						<Button
							size="small"
							variant="contained"
							disabled={!!error}
							onClick={apply}
						>
							{t("apply")}
						</Button>
					</Box>
				</Box>
			</Popover>
		</>
	);
}
