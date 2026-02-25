"use client";

import { Fragment } from "react";
import { PaneProps } from "./split-pane";

const Pane = ({ children }: PaneProps) => {
	return <Fragment>{children}</Fragment>;
};

export default Pane;
