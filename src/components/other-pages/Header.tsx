"use client";

import routes from "@/app/routes";
import { APP_NAME } from "@/constants";
import FlexBox from "@/lib/boxes/FlexBox";
import { Box, Button, Typography } from "@mui/material";
import Link from "next/link";

const Header = () => {
	return (
		<FlexBox
			component="header"
			centerVertical
			justifyContent="space-between"
			sx={{
				borderBottom: "1px solid lightgray",
				padding: 1,
			}}
		>
			<FlexBox centerVertical gap={1}>
				<Box component="img" src="/images/favicon.ico" sx={{ width: "30px" }} />
				<Typography sx={{ pr: 1, borderRight: "3px solid black", fontWeight: "bold" }}>
					{APP_NAME}
				</Typography>
				<Button LinkComponent={Link} href={routes.home()}>
					APP WEB
				</Button>
			</FlexBox>
			<Box
				component={Link}
				href={routes.about()}
				sx={{ "&:hover, &:hover *": { color: (th) => th.palette.primary.main } }}
			>
				À propos
			</Box>
		</FlexBox>
	);
};

export default Header;
