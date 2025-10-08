'use client'
import { createTheme } from '@mui/material';
import { createContext, useState, useContext, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from "@mui/material";

type Theme = {
	light: {
		primaryColor: string;
		secondaryColor: string;
		backgroundColor: string;
		textColor: string;
	},
	dark: {
		primaryColor: string;
		secondaryColor: string;
		backgroundColor: string;
		textColor: string;
	}
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
	}
};
const ThemeContext = createContext<ThemeContextType>({
	theme: defaultTheme,
	setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [theme, setTheme] = useState<Theme>(defaultTheme);	
	const [muiTheme, setMuiTheme] = useState(createTheme({
		palette: {
			primary: {
				main: theme.light.primaryColor,
				light: theme.light.primaryColor
			},
			secondary: {	
				main: theme.light.secondaryColor,
				light: theme.light.secondaryColor
			},
		}
	}))

	return (
		<ThemeContext.Provider value={{ theme, setTheme}}>
			<MuiThemeProvider theme={muiTheme}>
				{children}
			</MuiThemeProvider>
		</ThemeContext.Provider>
	);
}

export const useTheme = () => useContext(ThemeContext);