/** @jest-environment jsdom */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen, within } from "@testing-library/react";
import UserProfileFields from "./UserProfileFields";

function choose(label: string, option: string) {
	fireEvent.mouseDown(screen.getByLabelText(label));
	fireEvent.click(within(screen.getByRole("listbox")).getByText(option));
}

describe("UserProfileFields", () => {
	it("hides the school type unless the user is a student", () => {
		renderWithI18n(
			<UserProfileFields
				value={{ userType: null, schoolType: null }}
				onChange={jest.fn()}
			/>,
		);
		expect(screen.queryByLabelText("Type d'établissement")).toBeNull();
	});

	it("shows the school type for a student", () => {
		renderWithI18n(
			<UserProfileFields
				value={{ userType: "student" as any, schoolType: null }}
				onChange={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("Type d'établissement")).toBeInTheDocument();
	});

	it("reports the chosen user type", () => {
		const onChange = jest.fn();
		renderWithI18n(
			<UserProfileFields
				value={{ userType: null, schoolType: null }}
				onChange={onChange}
			/>,
		);

		choose("Vous utilisez Studomate en tant que", "Enseignant / formateur");

		expect(onChange).toHaveBeenCalledWith({
			userType: "teacher",
			schoolType: null,
		});
	});

	it("clears the school type when switching from student to another profile", () => {
		const onChange = jest.fn();
		renderWithI18n(
			<UserProfileFields
				value={{ userType: "student" as any, schoolType: "bts" as any }}
				onChange={onChange}
			/>,
		);

		choose("Vous utilisez Studomate en tant que", "Enseignant / formateur");

		expect(onChange).toHaveBeenCalledWith({
			userType: "teacher",
			schoolType: null,
		});
	});

	it("reports the chosen school type", () => {
		const onChange = jest.fn();
		renderWithI18n(
			<UserProfileFields
				value={{ userType: "student" as any, schoolType: null }}
				onChange={onChange}
			/>,
		);

		choose("Type d'établissement", "Université");

		expect(onChange).toHaveBeenCalledWith({
			userType: "student",
			schoolType: "university",
		});
	});

	it("goes back to 'not provided' when the empty option is chosen", () => {
		const onChange = jest.fn();
		renderWithI18n(
			<UserProfileFields
				value={{ userType: "teacher" as any, schoolType: null }}
				onChange={onChange}
			/>,
		);

		choose("Vous utilisez Studomate en tant que", "Non renseigné");

		expect(onChange).toHaveBeenCalledWith({ userType: null, schoolType: null });
	});
});
