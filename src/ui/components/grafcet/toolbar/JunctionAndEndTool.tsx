"use client";

import JunctionTool from "./JunctionTool";

const JunctionAndEndTool = ({ disabled }: { disabled?: boolean }) => (
	<JunctionTool type="junction-and-end" disabled={disabled} />
);

export default JunctionAndEndTool;
