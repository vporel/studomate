import AbstractCommand from "@/schemas/commands/AbstractCommand.class";
import Grafcet from "../Grafcet.class";

export default abstract class AbstractGrafcetCommand<P> extends AbstractCommand<Grafcet, P> {}
