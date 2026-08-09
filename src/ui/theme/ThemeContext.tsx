"use client";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { frFR } from "@mui/x-data-grid/locales";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

declare module "@mui/material/styles" {
	interface Palette {
		energized: Palette["primary"];
	}
	interface PaletteOptions {
		energized?: PaletteOptions["primary"];
	}
}

type Theme = {
	light: {
		primaryColor: string;
		secondaryColor: string;
		backgroundColor: string;
		textColor: string;
		energizedColor: string;
	};
};

type ThemeContextType = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

export const DEFAULT_THEME: Theme = {
	light: {
		primaryColor: "#1976d2",
		secondaryColor: "#606060",
		//Fond des pages (canvas du grafcet, écran d'accueil...), par opposition au blanc des
		//surfaces "papier" (palette.background.paper, valeur par défaut de MUI)
		backgroundColor: "rgb(235, 235, 235)",
		textColor: "#000000",
		energizedColor: "#00d800",
	},
};
const ThemeContext = createContext<ThemeContextType>({
	theme: DEFAULT_THEME,
	setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
	const breakpoints = useMemo(() => createTheme({}).breakpoints, []);
	const muiTheme = useMemo(
		() =>
			createTheme(
				{
					palette: {
						mode: "light",
						primary: {
							main: theme.light.primaryColor,
							light: theme.light.primaryColor,
						},
						secondary: {
							main: theme.light.secondaryColor,
							light: theme.light.secondaryColor,
						},
						background: {
							default: theme.light.backgroundColor,
						},
						energized: {
							main: theme.light.energizedColor,
							light: theme.light.energizedColor,
							dark: theme.light.energizedColor,
							contrastText: "#fff",
						},
					},
					typography: {
						fontFamily: '"Poppins", system-ui, sans-serif',
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
				},
				frFR,
			),
		[breakpoints, theme],
	);

	const contextValue = useMemo(() => ({ theme, setTheme }), [theme]);

	return (
		<ThemeContext.Provider value={contextValue}>
			<MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
		</ThemeContext.Provider>
	);
};

export const useTheme = () => useContext(ThemeContext);
