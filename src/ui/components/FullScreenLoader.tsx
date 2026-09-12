import { Box, CircularProgress } from "@mui/material";

const FullScreenLoader = () => (
	<Box
		sx={{
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			height: "100vh",
		}}
	>
		<CircularProgress />
	</Box>
);

export default FullScreenLoader;
