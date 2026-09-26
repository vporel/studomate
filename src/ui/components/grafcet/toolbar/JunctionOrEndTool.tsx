"use client";

import JunctionTool from "./JunctionTool";

const JunctionOrEndTool = ({ disabled }: { disabled?: boolean }) => (
	<JunctionTool type="junction-or-end" disabled={disabled} />
);

export default JunctionOrEndTool;
