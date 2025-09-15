import Action from "./action.schema"
import GrafcetElement from "./grafcet-element.schema"

export default class Step extends GrafcetElement{
    id: string = ""
    number: number = 0
    actions: Action[] = []

    /**
     * 
     * @returns null if there is no error
     */
    validate(): string[]|null{

        return null
    }
}