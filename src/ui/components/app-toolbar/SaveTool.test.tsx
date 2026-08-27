/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SaveTool from "./SaveTool";

jest.mock("@/ui/components/projects/ProjectContext");

describe("SaveTool", () => {
	const saveProject = jest.fn();

	function setup(hasUnsavedChanges: boolean, isSharedProject = false) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				hasUnsavedChanges,
				isSharedProject,
				saveProject,
			}),
		);
		return render(<SaveTool />);
	}

	afterEach(() => jest.clearAllMocks());

	describe("projet normal", () => {
		it("marks itself disabled when there are no unsaved changes", () => {
			setup(false);
			expect(
				screen.getByRole("button", { name: /enregistrer/i }),
			).toHaveAttribute("aria-disabled", "true");
		});

		it("does not mark itself disabled when there are unsaved changes", () => {
			setup(true);
			expect(
				screen.getByRole("button", { name: /enregistrer/i }),
			).toHaveAttribute("aria-disabled", "false");
		});

		it("triggers saveProject when clicked with unsaved changes", () => {
			setup(true);
			fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
			expect(saveProject).toHaveBeenCalledTimes(1);
		});

		it("does not trigger saveProject when clicked while disabled", () => {
			setup(false);
			fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
			expect(saveProject).not.toHaveBeenCalled();
		});
	});

	describe("projet partagé (lecture seule)", () => {
		it("affiche 'Enregistrer une copie' au lieu de 'Enregistrer'", () => {
			setup(false, true);
			expect(
				screen.getByRole("button", { name: /enregistrer une copie/i }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /^enregistrer$/i }),
			).not.toBeInTheDocument();
		});

		it("est toujours actif (jamais désactivé)", () => {
			setup(false, true);
			expect(
				screen.getByRole("button", { name: /enregistrer une copie/i }),
			).not.toHaveAttribute("aria-disabled", "true");
		});

		it("appelle saveProject au clic", () => {
			setup(false, true);
			fireEvent.click(
				screen.getByRole("button", { name: /enregistrer une copie/i }),
			);
			expect(saveProject).toHaveBeenCalledTimes(1);
		});
	});
});
