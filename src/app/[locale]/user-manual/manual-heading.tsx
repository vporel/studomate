"use client";

import {
	createContext,
	useContext,
	type ComponentPropsWithoutRef,
	type ReactNode,
} from "react";

/** Number of levels subtracted from every manual heading (1 when the section title is the page's `h1`). */
const ManualHeadingOffsetContext = createContext(0);

export function ManualHeadingOffsetProvider({
	offset,
	children,
}: {
	offset: number;
	children: ReactNode;
}) {
	return (
		<ManualHeadingOffsetContext.Provider value={offset}>
			{children}
		</ManualHeadingOffsetContext.Provider>
	);
}

const createManualHeading = (level: 2 | 3 | 4) => {
	const ManualHeading = (props: ComponentPropsWithoutRef<"h2">) => {
		const offset = useContext(ManualHeadingOffsetContext);
		const Tag = `h${level - offset}` as "h1" | "h2" | "h3";
		return <Tag {...props} />;
	};
	ManualHeading.displayName = `ManualH${level}`;
	return ManualHeading;
};

export const ManualH2 = createManualHeading(2);
export const ManualH3 = createManualHeading(3);
export const ManualH4 = createManualHeading(4);
