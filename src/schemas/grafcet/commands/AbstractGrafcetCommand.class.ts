import AbstractCommand from "@/schemas/commands/AbstractCommand.class";
import Grafcet from "../Grafcet.class";

export default abstract class GrafcetCommand<P> extends AbstractCommand<Grafcet, P> {}
