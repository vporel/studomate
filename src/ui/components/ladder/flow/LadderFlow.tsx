"use client";

import SectionReorderCommand from "@/schemas/ladder/commands/section-reorder.command";
import {
	closestCenter,
	DndContext,
	DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box, useTheme } from "@mui/material";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useMemo } from "react";
import { useT } from "@/ui/i18n/useT";
import { useLadderStore } from "../context/LadderContext";
import buildLadderReorderAnnouncements, {
	ladderReorderScreenReaderInstructions,
} from "./ladder-reorder-announcements";
import LadderSection from "./LadderSection";
import useLadderSectionSelection from "./useLadderSectionSelection";

import "@xyflow/react/dist/style.css";
import "./_ladder-page.css";

function LadderFlowContent() {
	const th = useTheme();
	const tReorderRaw = useT("ladderEditor.reorder");
	const tReorder = useMemo(
		() =>
			(key: string, values?: Record<string, string | number>) =>
				tReorderRaw(key as never, values as never),
		[tReorderRaw],
	);
	const sections = useLadderStore((state) => state.ladder.sections);
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);
	// Distance minimale avant d'activer le drag : sans elle, un simple clic sur la poignée
	// (ou un drag démarré ailleurs dans le header) déclencherait un reorder involontaire.
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const announcements = useMemo(
		() =>
			buildLadderReorderAnnouncements(
				sections.map((section) => section.id),
				tReorder,
			),
		[sections, tReorder],
	);
	const screenReaderInstructions = useMemo(
		() => ladderReorderScreenReaderInstructions(tReorder),
		[tReorder],
	);

	useLadderSectionSelection();

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;

			const previousOrderedSectionIds = sections.map((section) => section.id);
			const oldIndex = previousOrderedSectionIds.indexOf(active.id as string);
			const newIndex = previousOrderedSectionIds.indexOf(over.id as string);
			const orderedSectionIds = arrayMove(
				previousOrderedSectionIds,
				oldIndex,
				newIndex,
			);

			commandsStackManager.executeOperation([
				new SectionReorderCommand({
					orderedSectionIds,
					previousOrderedSectionIds,
				}),
			]);
		},
		[sections, commandsStackManager],
	);

	return (
		<Box
			className="ladder-page"
			sx={{
				padding: "25px",
				width: "100%",
				height: "100%",
				overflowX: "hidden",
				overflowY: "auto",
				background: th.palette.background.default,
				position: "relative",
				display: "flex",
				flexDirection: "column",
				alignItems: "stretch",
			}}
		>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
				accessibility={{
					announcements,
					screenReaderInstructions,
				}}
			>
				<SortableContext
					items={sections.map((section) => section.id)}
					strategy={verticalListSortingStrategy}
				>
					{sections.map((section, index) => (
						// Chaque section a son propre ReactFlowProvider pour isoler les instances
						<ReactFlowProvider key={section.id}>
							<LadderSection section={section} index={index} />
						</ReactFlowProvider>
					))}
				</SortableContext>
			</DndContext>
		</Box>
	);
}

export default function LadderFlow() {
	return <LadderFlowContent />;
}
