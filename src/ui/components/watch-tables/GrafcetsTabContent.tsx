"use client";

import { getStepVariableId } from "@/project-analyser/analysers/grafcet/grafcet.analyser";
import { useT } from "@/ui/i18n/useT";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";

function GrafcetRow({ grafcetId }: { grafcetId: string }) {
	const grafcetName = useProjectStore(
		(state) => state.project!.getGrafcet(grafcetId)!.name,
	);
	const stepNumbers = useProjectStore(
		useShallow((state) =>
			Object.values(state.project!.getGrafcet(grafcetId)!.steps)
				.filter((step) => step.data.number !== "")
				.map((step) => step.data.number as number)
				.sort((a, b) => a - b),
		),
	);
	const activeStepNumbers = useProjectStore(
		useShallow((state) =>
			stepNumbers.filter(
				(number) =>
					state.simulationVariablesStates[
						getStepVariableId(grafcetId, number)
					]?.value === true,
			),
		),
	);

	return (
		<FlexBox between centerVertical sx={{ mb: 1, gap: 2 }}>
			<Typography variant="subtitle2">{grafcetName}</Typography>
			<Typography>
				{activeStepNumbers.length > 0 ? activeStepNumbers.join(", ") : "-"}
			</Typography>
		</FlexBox>
	);
}

export default function GrafcetsTabContent() {
	const t = useT("pages.watchTables");
	const grafcetIds = useProjectStore(
		useShallow((state) => Object.keys(state.project!.grafcets)),
	);

	if (grafcetIds.length === 0) {
		return <Typography>{t("noGrafcets")}</Typography>;
	}

	return (
		<>
			{grafcetIds.map((grafcetId) => (
				<GrafcetRow key={grafcetId} grafcetId={grafcetId} />
			))}
		</>
	);
}
