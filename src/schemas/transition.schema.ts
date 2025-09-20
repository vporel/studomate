import GrafcetElement, { GrafcetElementDimensions, GrafcetElementPosition } from "./grafcet-element.schema"

export default class Transition extends GrafcetElement{
    id: string = ""
    expression: string = ""

    constructor(id: string, expression: string, position: GrafcetElementPosition, dimensions: GrafcetElementDimensions){
        super(position, dimensions)
        this.id = id
        this.expression = expression
    }

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