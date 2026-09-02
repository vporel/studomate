import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import AnalyseIcon from "@mui/icons-material/Rule";
import { Button } from "@mui/material";
import { useMemo } from "react";
import { useT } from "@/ui/i18n/useT";

const AnalyseButton = () => {
	const analysisHasErrors = useProjectStore((state) => state.analysisHasErrors);
	const analysisHasWarnings = useProjectStore(
		(state) => state.analysisHasWarnings,
	);
	const simulationManager = useProjectStore((state) => state.simulationManager);
	const t = useT("chrome");
	const color: string = useMemo(() => {
		if (analysisHasErrors) return "red";
		else if (analysisHasWarnings) return "orange";
		else return "rgb(70,70,70)";
	}, [analysisHasErrors, analysisHasWarnings]);

	return (
		<Button
			variant="text"
			startIcon={<AnalyseIcon />}
			sx={{ color, height: 25 }}
			onClick={() => simulationManager.analyze()}
		>
			{t("analyse")}
		</Button>
	);
};

export default AnalyseButton;
