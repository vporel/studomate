"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import { Button } from "@mui/material";
import { useProjectStore } from "../projects/ProjectContext";

const RightActions = () => {
	const analysisOK = useProjectStore((state) => state.analysisOK);
	const setAnalysisErrorsVisible = useProjectStore((state) => state.setAnalysisErrorsVisible);

	return (
		<FlexBox centerVertical gap={1} sx={{ justifyContent: "flex-end" }}>
			<Button
				sx={{
					color: analysisOK === undefined ? "black" : analysisOK ? "black" : "red",
					fontWeight: "normal",
					height: "100%",
					py: "0",
					px: "3px",
					"&:hover": { backgroundColor: "rgb(230,230,230)" },
				}}
				onClick={() => setAnalysisErrorsVisible(true)}
			>
				{`Résultat d'analyse ${analysisOK === undefined ? "" : analysisOK ? "(OK)" : "(Erreurs)"}`}
			</Button>
		</FlexBox>
	);
};

export default RightActions;
