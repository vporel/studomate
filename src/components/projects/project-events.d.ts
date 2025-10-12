import Grafcet from "@/schemas/grafcet/Grafcet.class";

export type ProjectEventsOut = {
	saved: void;
	"grafcet-open": Grafcet;
};
