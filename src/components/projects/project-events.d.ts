import Grafcet from "@/schemas/grafcet/Grafcet.class";

export type ProjectEventsOut = {
	"project-created": void; // Emitted when a new project is created
	"project-opened": void; // Emitted when a project is opened
	"project-saved": void; // Emitted when the project is saved
	"grafcet-open": Grafcet; //Emitted to ask to open a grafcet in the UI
};
