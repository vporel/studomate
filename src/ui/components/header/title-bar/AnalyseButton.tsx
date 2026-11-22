import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import AnalyseIcon from "@mui/icons-material/Rule";
import { Button } from "@mui/material";
import { useMemo } from "react";
import { useT } from "@/ui/i18n/useT";
import { MODE_CONTROL_HEIGHT } from "./mode-control-style";

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
			sx={{ color, height: MODE_CONTROL_HEIGHT }}
			onClick={() => simulationManager.analyze()}
		>
			{t("analyse")}
		</Button>
	);
};

export default AnalyseButton;
