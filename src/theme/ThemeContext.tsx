"use client";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type Theme = {
	light: {
		primaryColor: string;
		secondaryColor: string;
		backgroundColor: string;
		textColor: string;
	};
	dark: {
		primaryColor: string;
		secondaryColor: string;
		backgroundColor: string;
		textColor: string;
	};
};

type ThemeContextType = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const defaultTheme: Theme = {
	light: {
		primaryColor: "#1976d2",
		secondaryColor: "#9c27b0",
		backgroundColor: "#ffffff",
		textColor: "#000000",
	},
	dark: {
		primaryColor: "#90caf9",
		secondaryColor: "#ce93d8",
		backgroundColor: "#121212",
		textColor: "#ffffff",
	},
};
const ThemeContext = createContext<ThemeContextType>({
	theme: defaultTheme,
	setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [theme, setTheme] = useState<Theme>(defaultTheme);
	const breakpoints = useMemo(() => createTheme({}).breakpoints, []);
	const muiTheme = useMemo(
		() =>
			createTheme({
				palette: {
					primary: {
						main: theme.light.primaryColor,
						light: theme.light.primaryColor,
					},
					secondary: {
						main: theme.light.secondaryColor,
						light: theme.light.secondaryColor,
					},
				},
				typography: {
					h1: {
						fontWeight: "bold",
						fontSize: "3rem",
						[breakpoints.up("md")]: { fontSize: "3.5rem" },
					},
					h2: {
						fontWeight: "bold",
						fontSize: "2rem",
						[breakpoints.up("md")]: { fontSize: "2rem" },
					},
					h3: {
						fontWeight: "bold",
						fontSize: "1.3rem",
						[breakpoints.up("md")]: { fontSize: "1.5rem" },
					},
					h4: {
						fontWeight: "bold",
						fontSize: "1.1rem",
						[breakpoints.up("md")]: { fontSize: "1.2rem" },
					},
					h5: {
						fontWeight: "bold",
						fontSize: "1rem",
						[breakpoints.up("md")]: { fontSize: "1rem" },
					},
					h6: {
						fontWeight: "bold",
						fontSize: "0.8rem",
						[breakpoints.up("md")]: { fontSize: "0.9rem" },
					},
					allVariants: {
						textDecoration: "none",
						color: "inherit",
					},
					button: {
						textTransform: "none",
						"&.btn-rounded": { borderRadius: "20px" },
						"&.grow": { borderRadius: "30px", padding: "10px 30px", fontSize: 15 },
					},
				},
			}),
		[breakpoints, theme]
	);

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			<MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
		</ThemeContext.Provider>
	);
};

export const useTheme = () => useContext(ThemeContext);
