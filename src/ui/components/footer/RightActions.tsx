"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Button } from "@mui/material";
import { useProjectStore } from "../projects/ProjectContext";

const RightActions = () => {
	const analysisHasErrors = useProjectStore((state) => state.analysisHasErrors);
	const analysisHasWarnings = useProjectStore((state) => state.analysisHasWarnings);
	const setAnalysisResultVisible = useProjectStore((state) => state.setAnalysisResultVisible);

	return (
		<FlexBox centerVertical gap={1} sx={{ justifyContent: "flex-end" }}>
			<Button
				sx={{
					color: analysisHasErrors ? "red" : analysisHasWarnings ? "orange" : "black",
					fontWeight: "normal",
					height: "100%",
					py: "0",
					px: "3px",
					"&:hover": { backgroundColor: "rgb(230,230,230)" },
				}}
				onClick={() => setAnalysisResultVisible(true)}
			>
				{`Résultat d'analyse ${!analysisHasErrors && !analysisHasWarnings ? "(OK)" : analysisHasErrors ? "(Erreurs)" : "(Avertissements)"}`}
			</Button>
		</FlexBox>
	);
};

export default RightActions;
