"use client";

import {
	HmiStyleAnimationRow,
	HmiWidget,
	HmiWidgetAnimations,
	HmiWidgetData,
} from "@/schemas/hmi/hmi-widget.schema";
import { VariableType } from "@/schemas/variable/variable.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import {
	HMI_WIDGET_UI,
	HmiAnimatableStyleProp,
} from "@/ui/components/hmi/widgets/hmi-widget-ui";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import VariableSelector from "@/ui/components/variables/VariableSelector";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
	Box,
	Button,
	IconButton,
	Modal,
	Paper,
	Tab,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import { CSSProperties, useEffect, useState } from "react";

const NUMERIC_VARIABLE_TYPES: VariableType[] = [
	"INT",
	"LONG",
	"WORD",
	"DWORD",
	"REAL",
];
const STYLE_VARIABLE_TYPES: VariableType[] = [
	"BOOL",
	...NUMERIC_VARIABLE_TYPES,
];

type StyleProp = HmiAnimatableStyleProp<HmiWidgetData>;

const cellStyle: CSSProperties = {
	border: "1px solid #e0e0e0",
	padding: "4px 6px",
};
const headerCellStyle: CSSProperties = {
	...cellStyle,
	fontSize: "0.8rem",
	fontWeight: 600,
};

function defaultRowProperties(
	widget: HmiWidget,
	styleProps: StyleProp[],
): Partial<Record<string, string>> {
	return Object.fromEntries(
		styleProps.map((p) => [p.name, p.staticValue(widget.data)]),
	);
}

const PositionTab = ({ widget }: { widget: HmiWidget }) => {
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const animations = (
		widget.data as { animations?: HmiWidgetAnimations<string> }
	).animations;
	const position = animations?.position;

	const setPosition = (
		patch: Partial<{ xVariable: string; yVariable: string }>,
	) => {
		updateWidget(widget.id, {
			data: {
				...widget.data,
				animations: { ...animations, position: { ...position, ...patch } },
			},
		});
	};

	const reset = () =>
		setPosition({ xVariable: "", yVariable: "" });

	return (
		<Box
			sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 320 }}
		>
			<VariableSelector
				label="Décalage X"
				value={position?.xVariable ?? ""}
				onCommit={(mnemonic) => setPosition({ xVariable: mnemonic })}
				typeFilter={NUMERIC_VARIABLE_TYPES}
				cols={["mnemonic", "address", "scope"]}
				sx={{ width: "100% !important" }}
				baseInputSx={{ fontSize: "0.85rem !important" }}
			/>
			<VariableSelector
				label="Décalage Y"
				value={position?.yVariable ?? ""}
				onCommit={(mnemonic) => setPosition({ yVariable: mnemonic })}
				typeFilter={NUMERIC_VARIABLE_TYPES}
				cols={["mnemonic", "address", "scope"]}
				sx={{ width: "100% !important" }}
				baseInputSx={{ fontSize: "0.85rem !important" }}
			/>
			<Button
				size="small"
				startIcon={<RestartAltIcon />}
				onClick={reset}
				sx={{ alignSelf: "flex-start" }}
			>
				Réinitialiser
			</Button>
		</Box>
	);
};

const StyleTab = ({
	widget,
	styleProps,
}: {
	widget: HmiWidget;
	styleProps: StyleProp[];
}) => {
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const project = useProjectStore((s) => s.project);

	const animations = (
		widget.data as { animations?: HmiWidgetAnimations<string> }
	).animations;
	const style = animations?.style;
	const styleVariable = project?.variables.find(
		(v) => v.mnemonic === style?.variable,
	);
	const isBoolStyle = styleVariable?.getNativeType() === "boolean";

	const setStyle = (next: HmiStyleAnimationRow<string>[]) => {
		if (!style) return;
		updateWidget(widget.id, {
			data: {
				...widget.data,
				animations: { ...animations, style: { ...style, rows: next } },
			},
		});
	};

	// Les lignes existantes sont conservées au changement de variable, pour ne pas faire repartir
	// l'utilisateur de zéro : vers une variable booléenne, seules les deux premières sont gardées
	// (leurs valeurs forcées à 0/1, la forme imposée par ce type) ; vers une variable numérique,
	// le tableau est conservé tel quel (les valeurs restent libres, éditables).
	const handleVariableChange = (mnemonic: string) => {
		const variable = project?.variables.find((v) => v.mnemonic === mnemonic);
		const existingRows = style?.rows ?? [];
		const defaults = defaultRowProperties(widget, styleProps);
		const rows: HmiStyleAnimationRow<string>[] =
			variable?.getNativeType() === "boolean"
				? [
						{ value: 0, properties: existingRows[0]?.properties ?? defaults },
						{ value: 1, properties: existingRows[1]?.properties ?? defaults },
					]
				: existingRows.length > 0
					? existingRows
					: [{ value: 0, properties: defaults }];
		updateWidget(widget.id, {
			data: {
				...widget.data,
				animations: {
					...animations,
					style: { variable: mnemonic, rows },
				},
			},
		});
	};

	const addRow = () => {
		if (!style) return;
		const nextValue = Math.max(0, ...style.rows.map((r) => r.value)) + 1;
		setStyle([
			...style.rows,
			{
				value: nextValue,
				properties: defaultRowProperties(widget, styleProps),
			},
		]);
	};

	const reset = () => {
		updateWidget(widget.id, {
			data: { ...widget.data, animations: { ...animations, style: undefined } },
		});
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
			<VariableSelector
				label="Variable"
				value={style?.variable ?? ""}
				onCommit={handleVariableChange}
				typeFilter={STYLE_VARIABLE_TYPES}
				cols={["mnemonic", "address", "scope"]}
				sx={{ width: 320, maxWidth: "100% !important" }}
				baseInputSx={{ fontSize: "0.85rem !important" }}
			/>

			{style && (
				<Box>
					<table style={{ borderCollapse: "collapse" }}>
						<thead>
							<tr>
								<th style={headerCellStyle}>Valeur</th>
								{styleProps.map((p) => (
									<th key={p.name} style={headerCellStyle}>
										{p.label}
									</th>
								))}
								{!isBoolStyle && <th style={headerCellStyle} />}
							</tr>
						</thead>
						<tbody>
							{style.rows.map((row, index) => (
								<tr key={index}>
									<td style={cellStyle}>
										{isBoolStyle ? (
											<Typography sx={{ fontSize: "0.8rem" }}>
												{row.value}
											</Typography>
										) : (
											<TextField
												type="number"
												size="small"
												value={row.value}
												onChange={(e) =>
													setStyle(
														style.rows.map((r, i) =>
															i === index
																? { ...r, value: Number(e.target.value) }
																: r,
														),
													)
												}
												sx={{ width: 80 }}
											/>
										)}
									</td>
									{styleProps.map((p) => (
										<td key={p.name} style={cellStyle}>
											<TextField
												type={p.inputType}
												size="small"
												value={
													row.properties[p.name] ?? p.staticValue(widget.data)
												}
												onChange={(e) =>
													setStyle(
														style.rows.map((r, i) =>
															i === index
																? {
																		...r,
																		properties: {
																			...r.properties,
																			[p.name]: e.target.value,
																		},
																	}
																: r,
														),
													)
												}
												sx={{
													width: p.inputType === "color" ? 60 : 160,
													"& input[type=color]": {
														height: 24,
														padding: "2px 4px",
													},
												}}
											/>
										</td>
									))}
									{!isBoolStyle && (
										<td style={cellStyle}>
											<IconButton
												size="small"
												onClick={() =>
													setStyle(style.rows.filter((_, i) => i !== index))
												}
											>
												<DeleteIcon fontSize="small" />
											</IconButton>
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
					{!isBoolStyle && (
						<Button
							size="small"
							startIcon={<AddIcon />}
							onClick={addRow}
							sx={{ mt: 1 }}
						>
							Ajouter une ligne
						</Button>
					)}
				</Box>
			)}
			<Button
				size="small"
				startIcon={<RestartAltIcon />}
				onClick={reset}
				sx={{ alignSelf: "flex-start" }}
			>
				Réinitialiser
			</Button>
		</Box>
	);
};

/** Pane flottant (pas une modale MUI classique) affichant les animations du widget sélectionné —
 * ouvert depuis `HmiWidgetPropertiesPanel`, visibilité portée par le store (voir `HmiStoreState`).
 * Une barre d'onglets verticale plutôt qu'horizontale ou qu'un accordéon comme les autres blocs de
 * la colonne latérale : la table de style a besoin de largeur, pas de hauteur, pour rester
 * lisible (voir la demande d'origine).
 */
const HmiWidgetAnimationsPane = ({ widget }: { widget: HmiWidget }) => {
	const visible = useHmiStore((s) => s.animationsPaneVisible);
	const close = useHmiStore((s) => s.closeAnimationsPane);
	const styleProps = HMI_WIDGET_UI[widget.type]
		.animatableStyleProps as StyleProp[];
	const hasStyleTab = styleProps.length > 0;
	const [activeTab, setActiveTab] = useState<"position" | "style">("position");

	useEffect(() => {
		setActiveTab("position");
	}, [widget.id]);

	if (!visible) return null;

	return (
		<Modal open onClose={close}>
			<Paper
				sx={{
					position: "fixed",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width: "min(90vw, 720px)",
					height: "min(80vh, 520px)",
					display: "flex",
					flexDirection: "column",
					outline: "none",
				}}
			>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						px: 2,
						py: 1,
						borderBottom: "1px solid #e0e0e0",
					}}
				>
					<Typography variant="h6">Animations | {widget.name}</Typography>
					<IconButton size="small" onClick={close} aria-label="Fermer">
						<CloseIcon fontSize="small" />
					</IconButton>
				</Box>
				<Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
					<Tabs
						orientation="vertical"
						value={activeTab}
						onChange={(_, value) => setActiveTab(value)}
						sx={{ borderRight: "1px solid #e0e0e0", minWidth: 160 }}
					>
						<Tab
							label="Position"
							value="position"
							sx={{ alignItems: "flex-start" }}
						/>
						{hasStyleTab && (
							<Tab
								label="Style"
								value="style"
								sx={{ alignItems: "flex-start" }}
							/>
						)}
					</Tabs>
					<Box sx={{ flex: 1, minWidth: 0, overflow: "auto", p: 2 }}>
						{activeTab === "position" && <PositionTab widget={widget} />}
						{activeTab === "style" && hasStyleTab && (
							<StyleTab widget={widget} styleProps={styleProps} />
						)}
					</Box>
				</Box>
			</Paper>
		</Modal>
	);
};

export default HmiWidgetAnimationsPane;
