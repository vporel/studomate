/**
 * @jest-environment jsdom
 */
import { render, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { i18nWrapper } from "@tests/utils/i18n";
import ManualContentIndex from "./ManualContentIndex";

describe("ManualContentIndex", () => {
	it("n'émet rien dans le rendu serveur", () => {
		const Wrapper = i18nWrapper();
		const html = renderToString(
			<Wrapper>
				<ManualContentIndex onReady={() => {}} />
			</Wrapper>,
		);
		expect(html).toBe("");
	});

	it("construit l'index de recherche après montage, sections et sous-sections comprises", async () => {
		const onReady = jest.fn();
		render(<ManualContentIndex onReady={onReady} />, {
			wrapper: i18nWrapper(),
		});
		await waitFor(() => expect(onReady).toHaveBeenCalled());
		const index = onReady.mock.calls[0][0];
		expect(Object.keys(index)).toEqual(
			expect.arrayContaining(["intro", "grafcet", "grafcet-steps"]),
		);
		expect(index["grafcet-steps"].length).toBeGreaterThan(0);
	});
});
