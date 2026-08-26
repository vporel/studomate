import AbstractCommand from "@/schemas/commands/abstract.command";
import HmiPage from "../hmi-page.schema";

export default abstract class AbstractHmiCommand<P> extends AbstractCommand<HmiPage, P> {}
