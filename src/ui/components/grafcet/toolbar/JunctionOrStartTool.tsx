"use client";

import JunctionTool from "./JunctionTool";

const JunctionOrStartTool = ({ disabled }: { disabled?: boolean }) => (
	<JunctionTool type="junction-or-start" disabled={disabled} />
);

export default JunctionOrStartTool;
