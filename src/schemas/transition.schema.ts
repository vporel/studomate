import GrafcetElement from "./grafcet-element.schema"

export default class Transition extends GrafcetElement{
    id: string = ""
    expression: string = ""

    /**
     * 
     * @returns null if there is no error
     */
    validate(): string[]|null{
        /*
            Expression
        */

        return null
    }
}