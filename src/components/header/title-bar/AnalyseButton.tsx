import { useProjectStore } from "@/components/projects/ProjectContext";
import { Rule as AnalyseIcon } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useMemo } from "react";

const AnalyseButton = () => {
	const analysisOK = useProjectStore((state) => state.analysisOK);
	const simulationManager = useProjectStore((state) => state.simulationManager);
	const color: string = useMemo(() => {
		if (analysisOK === undefined) return "rgb(70,70,70)";
		else if (analysisOK) return "green";
		else return "red";
	}, [analysisOK]);

	return (
		<Button
			variant="text"
			startIcon={<AnalyseIcon />}
			sx={{ color, height: 25 }}
			onClick={() => simulationManager.analyze()}
		>
			Analyser
		</Button>
	);
};

export default AnalyseButton;
