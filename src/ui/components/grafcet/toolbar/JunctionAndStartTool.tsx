"use client";

import JunctionTool from "./JunctionTool";

const JunctionAndStartTool = ({ disabled }: { disabled?: boolean }) => (
	<JunctionTool type="junction-and-start" disabled={disabled} />
);

export default JunctionAndStartTool;
