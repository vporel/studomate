"use client";

import useGotoProgram from "../useGotoProgram";
import AnalysisResultSections from "./AnalysisResultSections";

export default function AnalysisResult() {
	const onGotoProgram = useGotoProgram();

	return <AnalysisResultSections onGotoProgram={onGotoProgram} />;
}
