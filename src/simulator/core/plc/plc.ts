
export type PLCVariableScope = "input"|"output"|"memory"
export type PLCVariableType = "boolean" | "number" | "string";
export type PLCVariableValue = boolean | number | string;

export class PLCVariable {
  private id: string;
  private name: string;
  private scope: PLCVariableScope;
  private type: PLCVariableType;
  private value: PLCVariableValue;

  constructor(id: string, name: string, scope: PLCVariableScope, type: PLCVariableType){
    this.id = id;
    this.name = name;
    this.scope = scope;
    this.type = type;
    if(scope !== "memory" && type === "string") throw new Error("A string variable is only allowed for the memory scope")
    this.value = type === "boolean" ? false : (type === "number" ? 0 : "");
  }

  public getId(): string {
    return this.id
  }

  public getName(): string {
    return this.name
  }

  public getScope(): PLCVariableScope {
    return this.scope
  }

  public getType(): PLCVariableType {
    return this.type
  }

  public getValue(): PLCVariableValue {
    return this.value
  }

  public setValue(value: PLCVariableValue): void {
    if(typeof value !== this.type) throw new Error("The type of the value does not match the variable type")
    this.value = value
  }

  public copy(): PLCVariable{
    return Object.assign(new PLCVariable("", "", "input", "boolean"), this)
  }
}

export type PLCProgram = (plc: PLC) => void

export default class PLC {
  private inputImage: Record<string, PLCVariable> = {};
  private outputImage: Record<string, PLCVariable> = {};
  private physicalInputs: Record<string, PLCVariable> = {};
  private physicalOutputs: Record<string, PLCVariable> = {};
  private memory: Record<string, PLCVariable> = {};
  private scanTimeMs: number;
  private cycleTimer: NodeJS.Timeout | null = null;
  private program: PLCProgram;

  constructor(config: {
    scanTimeMs: number, 
    program: PLCProgram,
    inputVariables: {id: string, name: string, type: PLCVariableType}[],
    outputVariables: {id: string, name: string, type: PLCVariableType}[],
    memoryVariable: {id: string, name: string, type: PLCVariableType}[]
  }){
    this.scanTimeMs = config.scanTimeMs;
    this.program = config.program;
    config.inputVariables.forEach(inputVar => {
      this.physicalInputs[inputVar.id] = new PLCVariable(inputVar.id, inputVar.name, "input", inputVar.type)
    })
    config.outputVariables.forEach(outputVar => {
      this.physicalInputs[outputVar.id] = new PLCVariable(outputVar.id, outputVar.name, "input", outputVar.type)
    })
    config.memoryVariable.forEach(memoryVar => {
      this.physicalInputs[memoryVar.id] = new PLCVariable(memoryVar.id, memoryVar.name, "input", memoryVar.type)
    })
  }

  //Physical Inputs/Outputs
  public setPhysicalInputValueById(id: string, value: PLCVariableValue): void {
    const input = this.getPhysicalInputById(id)

  }

  public setPhysicalInputValueByName(name: string, value: PLCVariableValue): void {
    const input = this.getPhysicalInputByName(name)
  }

  private getPhysicalInputById(id: string): PLCVariable{
    const input = this.physicalInputs[id]
    if(!input) throw new Error(`No input found with id ${id}`)
    return input
  }

  private getPhysicalInputByName(name: string): PLCVariable{
    const input = Object.values(this.physicalInputs).find(i => i.getName() === name);
    if(!input) throw new Error(`No input found with name ${name}`)
    return input
  }

  //Scan cycle
  private scan(): void {
    this.readInputs()
    this.executeProgram()
    this.writeOutputs()
    this.internalTasks()
  }

  private readInputs(): void {
    Object.entries(this.physicalInputs).forEach(([id, v]) => {
      this.inputImage[id] = v.copy()
    })
  }
  private executeProgram(): void { 
      this.program(this)
   }

  private writeOutputs(): void { 
    Object.entries(this.outputImage).forEach(([id, v]) => {
      this.physicalOutputs[id] = v.copy()
    })
   }
  private internalTasks(): void { 
    
   }

  // Exécution
  public start(): void { 
    
    if (!this.cycleTimer) {
      this.cycleTimer = setInterval(() => this.scan(), this.scanTimeMs);
    }

   }
  public stop(): void { 
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }

   }

}