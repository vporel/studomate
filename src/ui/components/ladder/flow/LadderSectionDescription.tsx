"use client";

import SectionUpdateCommand from "@/schemas/ladder/commands/section-update.command";
import Section from "@/schemas/ladder/section.schema";
import { InputBase } from "@mui/material";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";

export default function LadderSectionDescription({
	section,
}: {
	section: Section;
}) {
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLTextAreaElement>) => {
			const newDesc = e.target.value;
			if (newDesc === section.description) return;
			commandsStackManager.executeOperation([
				new SectionUpdateCommand({
					sectionId: section.id,
					description: newDesc,
					previousDescription: section.description,
				}),
			]);
		},
		[section.id, section.description, commandsStackManager],
	);

	return (
		<InputBase
			defaultValue={section.description}
			key={`desc-${section.description}`}
			placeholder="Description (optionnelle)…"
			multiline
			minRows={1}
			maxRows={5}
			onBlur={handleBlur}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					(e.target as HTMLTextAreaElement).value = section.description;
					(e.target as HTMLTextAreaElement).blur();
				}
			}}
			sx={{
				display: "block",
				width: "100%",
				fontSize: "0.8rem",
				color: "text.secondary",
				pl: 2,
				pr: 3,
				py: 0.5,
				"& textarea": {
					p: 0,
					pl: 1,
					cursor: "text",
					border: "1px solid lightgray",
					resize: "none",
					overflowY: "auto",
					"&::placeholder": { fontStyle: "italic" },
				},
			}}
			inputProps={{ "aria-label": "Description de la section" }}
		/>
	);
}
