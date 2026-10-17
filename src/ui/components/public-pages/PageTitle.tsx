import { Typography } from "@mui/material";
import { ReactNode } from "react";

export default function PageTitle({ children }: { children: ReactNode }) {
	return (
		<Typography variant="h2" component="h1" color="primary" gutterBottom>
			{children}
		</Typography>
	);
}
