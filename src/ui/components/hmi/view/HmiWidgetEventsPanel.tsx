"use client";

import { HmiAction, HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { Box, Button, IconButton, MenuItem, TextField, Typography } from "@mui/material";

/** Événements exposés par type de widget — absent (ou liste vide) pour un type qui n'en déclenche
 * aucun. Sert aussi à décider si le bloc "Événements" doit s'afficher pour le widget sélectionné
 * (voir `HmiCanvas`). */
export const HMI_WIDGET_EVENTS: Partial<Record<HmiWidget["type"], { name: string; label: string }[]>> = {
	"push-button": [{ name: "onPress", label: "Bouton pressé" }],
};

const HMI_ACTION_TYPES: { value: HmiAction["type"]; label: string }[] = [{ value: "navigate-to-page", label: "Changer de page" }];

function defaultAction(type: HmiAction["type"], targetHmiPageId: string): HmiAction {
	switch (type) {
		case "navigate-to-page":
			return { type: "navigate-to-page", targetHmiPageId };
	}
}

const HmiWidgetEventsPanel = ({ widget }: { widget: HmiWidget }) => {
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const project = useProjectStore((s) => s.project);
	const hmiPages = Object.values(project?.hmiPages ?? {});

	const events = HMI_WIDGET_EVENTS[widget.type];
	if (!events) return null;

	// `events` n'existe pas forcément encore sur `widget.data` (absent tant qu'aucune action n'a
	// été ajoutée) — `HMI_WIDGET_EVENTS[widget.type]` garantit déjà que ce type de widget le porte.
	const widgetEvents = (widget.data as { events?: Record<string, HmiAction[]> }).events;

	const setActions = (eventName: string, actions: HmiAction[]) => {
		updateWidget(widget.id, { data: { ...widget.data, events: { ...widgetEvents, [eventName]: actions } } });
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1.5 }}>
			{events.map(({ name, label }) => {
				const actions = widgetEvents?.[name] ?? [];
				return (
					<Box key={name} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
						<Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>{label}</Typography>
						{actions.map((action: HmiAction, index: number) => (
							<Box key={index} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
								<TextField
									select
									size="small"
									value={action.type}
									onChange={(e) => {
										const next = [...actions];
										next[index] = defaultAction(e.target.value as HmiAction["type"], hmiPages[0]?.id ?? "");
										setActions(name, next);
									}}
									sx={{ flex: 1 }}
								>
									{HMI_ACTION_TYPES.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</TextField>
								{action.type === "navigate-to-page" && (
									<TextField
										select
										size="small"
										label="Page cible"
										value={action.targetHmiPageId}
										onChange={(e) => {
											const next = [...actions];
											next[index] = { ...action, targetHmiPageId: e.target.value };
											setActions(name, next);
										}}
										sx={{ flex: 1 }}
									>
										{hmiPages.map((page) => (
											<MenuItem key={page.id} value={page.id}>
												{page.name}
											</MenuItem>
										))}
									</TextField>
								)}
								<IconButton
									size="small"
									onClick={() => setActions(name, actions.filter((_: HmiAction, i: number) => i !== index))}
								>
									<DeleteIcon fontSize="small" />
								</IconButton>
							</Box>
						))}
						<Button
							size="small"
							startIcon={<AddIcon />}
							onClick={() => setActions(name, [...actions, defaultAction("navigate-to-page", hmiPages[0]?.id ?? "")])}
							sx={{ alignSelf: "flex-start" }}
						>
							Ajouter une action
						</Button>
					</Box>
				);
			})}
		</Box>
	);
};

export default HmiWidgetEventsPanel;
