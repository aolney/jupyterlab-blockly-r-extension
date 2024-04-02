import { RGenerator } from "./RGenerator";
import { side_effects_r_generator as side_effects_r_generator_1 } from "./RGenerator";
import { CustomFields as CustomFields_1 } from "./SearchDropdown.js";
import * as Blockly from "blockly";
import { createMinusField } from "./field_minus";
import { createPlusField } from "./field_plus";
import { NotebookPanel, INotebookTracker } from "@jupyterlab/notebook";
import { Kernel, KernelMessage } from "@jupyterlab/services";
import * as rendermime from "@jupyterlab/rendermime";
import { IRenderMime, MimeModel } from "@jupyterlab/rendermime";

export const side_effects_r_generator: string = side_effects_r_generator_1;
export const CustomFields: any = CustomFields_1;



RGenerator.finish = ((code: string): string => {
  const imports: string[] = [];
  const functions: string[] = [];
  let enumerator: any = Object.keys(RGenerator.definitions_);
  for(let i in enumerator){
    const definitions: any = RGenerator.definitions_;
    const def: string = definitions[enumerator[i]];
    if (def.indexOf("library(") === 0) {
      void (imports.push(def));
    }
    if ((def.indexOf("function() ") === 0) ? true : (def.indexOf("# ") === 0)) {
      void (functions.push(def));
    }
  }
  delete RGenerator.definitions_;
  delete RGenerator.functionNames_;
  RGenerator.nameDB_.reset();
  return ((("\n" + imports) + ("\n" + functions)) + "\n\n") + code;
});

/**
 * Encode the current Blockly workspace as an XML string
 */
export function encodeWorkspace(): string {
  const xml: Element = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
  return Blockly.Xml.domToText(xml);
}

/**
 * Decode an XML string and load the represented blocks into the Blockly workspace
 */
export function decodeWorkspace(xmlText: string): void {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  const xmlElement = xmlDoc.documentElement;
  Blockly.Xml.domToWorkspace(xmlElement, Blockly.getMainWorkspace() as Blockly.WorkspaceSvg);
}


Blockly.Blocks["textFromFile_R"]={
  init: function() {
    console.log("textFromFile_R init");
    this.appendValueInput("FILENAME").setCheck("String").appendField("read text from file");
    this.setOutput(true, void 0);
    this.setColour(230);
    this.setTooltip("Use this to read a flat text file. It will output a string.");
    this.setHelpUrl("https://stackoverflow.com/a/9069670");
  },
};

RGenerator["textFromFile_R"]=((block: Blockly.Block): string[] => {
  const fileName: string = RGenerator.valueToCode(block, "FILENAME", RGenerator.ORDER_ATOMIC);
  return [((("readChar(" + fileName) + ", file.info(") + fileName) + ")$size)", RGenerator.ORDER_FUNCTION_CALL];
});

Blockly.Blocks["readFile_R"]={
  init: function() {
    console.log("readFile_R init");
    this.appendValueInput("FILENAME").setCheck("String").appendField("read file");
    this.setOutput(true, void 0);
    this.setColour(230);
    this.setTooltip("Use this to read a file. It will output a file, not a string.");
    this.setHelpUrl("https://stat.ethz.ch/R-manual/R-devel/library/base/html/connections.html");
  },
};
RGenerator["readFile_R"]=((block: Blockly.Block): string[] => [("file(" + (RGenerator.valueToCode(block, "FILENAME", RGenerator.ORDER_ATOMIC))) + ", \'rt\')", RGenerator.ORDER_FUNCTION_CALL]);

/**
* A template to create arbitrary code blocks (FREESTYLE) in these dimensions: dummy/input; output/nooutput
*/

export function makeCodeBlock_R(blockName: string, hasInput: boolean, hasOutput: boolean): void {
  Blockly.Blocks[blockName]={
    init: function() {
      const input: Blockly.Input = hasInput ? this.appendValueInput("INPUT").setCheck(void 0) : this.appendDummyInput();
      console.log(blockName + " init");
      input.appendField(new Blockly.FieldTextInput("type code here...") as Blockly.Field, "CODE");
      if (hasOutput) {
        this.setOutput(true, void 0);
      }
      else {
        this.setNextStatement(true);
        this.setPreviousStatement(true);
      }
      this.setColour(230);
      this.setTooltip(((("You can put any R code in this block. Use this block if you " + (hasInput ? "do" : "don\'t")) + " need to connect an input block and ") + (hasOutput ? "do" : "don\'t")) + " need to connect an output block.");
      this.setHelpUrl("https://cran.r-project.org/manuals.html");
    },
  };
  RGenerator[blockName]=((block: Blockly.Block): string | string[] => {
    const userCode: string = block.getFieldValue("CODE").toString();
    let code: string;
    if (hasInput) {
      const input_1: string = RGenerator.valueToCode(block, "INPUT", RGenerator.ORDER_ATOMIC);
      code = ((userCode + " ") + input_1).trim();
    }
    else {
      code = userCode.trim();
    }
    return hasOutput ? [code, RGenerator.ORDER_ATOMIC] : (code + "\n");
  });
}

makeCodeBlock_R("dummyOutputCodeBlock_R", false, true);

makeCodeBlock_R("dummyNoOutputCodeBlock_R", false, false);

makeCodeBlock_R("valueOutputCodeBlock_R", true, true);

makeCodeBlock_R("valueNoOutputCodeBlock_R", true, false);


/**
* Create a Blockly/R templated import/library block
*/
export function makeImportBlock_R(blockName: string, labelOne: string): void {
  Blockly.Blocks[blockName]={
    init: function() {
      this.appendDummyInput().appendField(labelOne).appendField(new Blockly.FieldVariable("some library") as Blockly.Field, "libraryName");
      this.setNextStatement(true);
      this.setPreviousStatement(true);
      this.setColour(230);
      this.setTooltip("Load an R package to access functions in that package");
      this.setHelpUrl("https://stat.ethz.ch/R-manual/R-devel/library/base/html/library.html");
    },
  };
  RGenerator[blockName]=((block: Blockly.Block): string => (
    ("library(" + (RGenerator.getVariableName(block.getFieldValue("libraryName")))) + ")\n"
    )
  );
}

makeImportBlock_R("import_R", "library");

Blockly.Blocks["indexer_R"]={
  init: function() {
      this.appendValueInput("INDEX").appendField(new Blockly.FieldVariable("{dictVariable}") as Blockly.Field, "VAR").appendField("[");
      this.appendDummyInput().appendField("]");
      this.setInputsInline(true);
      this.setOutput(true);
      this.setColour(230);
      this.setTooltip("Gets a list from the variable at a given indices. Not supported for all variables.");
      this.setHelpUrl("https://cran.r-project.org/doc/manuals/R-lang.html#Indexing");
  },
};

RGenerator["indexer_R"]=((block: Blockly.Block): string[] => [(((block.getFieldValue("VAR").toString()) + "[") + (RGenerator.valueToCode(block, "INDEX", RGenerator.ORDER_ATOMIC))) + "]", RGenerator.ORDER_ATOMIC]);

Blockly.Blocks["doubleIndexer_R"]={
  init: function() {
      this.appendValueInput("INDEX").appendField(new Blockly.FieldVariable("{dictVariable}") as Blockly.Field, "VAR").appendField("[[");
      this.appendDummyInput().appendField("]]");
      this.setInputsInline(true);
      this.setOutput(true);
      this.setColour(230);
      this.setTooltip("Gets an item from the variable at a given index. Not supported for all variables.");
      this.setHelpUrl("https://cran.r-project.org/doc/manuals/R-lang.html#Indexing");
  },
};

RGenerator["doubleIndexer_R"]=((block: Blockly.Block): string[] => [(((block.getFieldValue("VAR").toString()) + "[[") + (RGenerator.valueToCode(block, "INDEX", RGenerator.ORDER_ATOMIC))) + "]]", RGenerator.ORDER_ATOMIC]);

/**
* A template for variable argument function block creation (where arguments are in a list), including the code generator.
*/
export function makeFunctionBlock_R(blockName: string, label: string, outputType: string, tooltip: string, helpurl: string, functionStr: string): void {
  Blockly.Blocks[blockName]={
    init: function() {
      console.log(blockName + " init");
      this.appendValueInput("x").setCheck(void 0).appendField(label);
      this.setInputsInline(true);
      this.setOutput(true, outputType);
      this.setColour(230);
      this.setTooltip(tooltip);
      this.setHelpUrl(helpurl);
    },
  };  
  RGenerator[blockName] = ((block: Blockly.Block): string[] => {
    const valueCode = RGenerator.valueToCode(block, "x", RGenerator.ORDER_MEMBER);
    const sanitizedValueCode = valueCode.replace(/^\[|\]$/g, "");
    return [`${functionStr}(${sanitizedValueCode})`, RGenerator.ORDER_FUNCTION_CALL];
  });
}

makeFunctionBlock_R("reversedBlock_R", "reversed", "None", "Provides a reversed version of its argument.", "https://stat.ethz.ch/R-manual/R-devel/library/base/html/rev.html", "rev");

makeFunctionBlock_R("boolConversion_R", "as bool", "Boolean", "Convert something to Boolean.", "https://stat.ethz.ch/R-manual/R-devel/library/base/html/logical.html", "as.logical");

makeFunctionBlock_R("strConversion_R", "as str", "String", "Convert something to String.", "https://stat.ethz.ch/R-manual/R-patched/library/base/html/toString.html", "toString");

makeFunctionBlock_R("floatConversion_R", "as float", "Number", "Convert something to Float.", "https://stat.ethz.ch/R-manual/R-devel/library/base/html/numeric.html", "as.numeric");

makeFunctionBlock_R("intConversion_R", "as int", "Number", "Convert something to Int.", "https://stat.ethz.ch/R-manual/R-devel/library/base/html/integer.html", "as.integer");


Blockly.Blocks["unlistBlock_R"]={
  init: function() {
    this.appendValueInput("LIST").setCheck("Array").appendField("vector");
    this.setInputsInline(true);
    this.setOutput(true, "Array");
    this.setColour(230);
    this.setTooltip("Use this to convert a list to a vector");
    this.setHelpUrl("https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/unlist");
  },
};

RGenerator["unlistBlock_R"]=((block: Blockly.Block): string[] => [("unlist(" + (RGenerator.valueToCode(block, "LIST", RGenerator.ORDER_MEMBER))) + ", use.names = FALSE)", RGenerator.ORDER_FUNCTION_CALL]);

Blockly.Blocks["uniqueBlock_R"]={
  init: function() {
      this.appendValueInput("LIST").setCheck("Array").appendField("unique");
      this.setInputsInline(true);
      this.setOutput(true, "Array");
      this.setColour(230);
      this.setTooltip("Use this to get the unique elements of a list");
      this.setHelpUrl("https://stackoverflow.com/questions/3879522/finding-unique-values-from-a-list");
  },
};

RGenerator["uniqueBlock_R"]=((block: Blockly.Block): string[] => [("unique(unlist(" + (RGenerator.valueToCode(block, "LIST", RGenerator.ORDER_MEMBER))) + ", use.names = FALSE))", RGenerator.ORDER_FUNCTION_CALL]);


export function createDynamicArgumentMutator(this: any, mutatorName: string, startCount: number, emptyLeadSlotLabel: string, nonEmptyLeadSlotLabel: string, additionalSlotLabel: string): void {
  const mutator: any = {
    itemCount_: 0,
    mutationToDom: function(): any {
      const container: any = Blockly.utils.xml.createElement("mutation");
      container.setAttribute("items", this.itemCount_);
      return container;
    },
    domToMutation: function(xmlElement: any): any {
      const itemsAttribute: string | null = xmlElement.getAttribute("items");
      const targetCount: number = itemsAttribute ? parseInt(itemsAttribute, 10) : 0;
      return this.updateShape_(targetCount);
    },
    updateShape_: function(targetCount_1: number): any {
      while (this.itemCount_ < targetCount_1) {
        this.addPart_();
      }
      while (this.itemCount_ > targetCount_1) {
        this.removePart_();
      }
      return this.updateMinus_();
    },
    plus: function(): any{
      this.addPart_();
      return this.updateMinus_();
    },
    minus: function(): void {
      if (this.itemCount_ !== 0) {
        this.removePart_();
        this.updateMinus_();
      }
    },
    addPart_: function(): void {
      if (this.itemCount_ === 0) {
        this.removeInput("EMPTY");
        this.topInput_ = this.appendValueInput("ADD" + this.itemCount_).appendField(createPlusField(), "PLUS").appendField(nonEmptyLeadSlotLabel).setAlign(Blockly.inputs.Align.RIGHT);
      }
      else {
        this.appendValueInput("ADD" + this.itemCount_).appendField(additionalSlotLabel).setAlign(Blockly.inputs.Align.RIGHT);
      }
      this.itemCount_ = (this.itemCount_ + 1);
    },
    removePart_: function(): void {
      this.itemCount_ = (this.itemCount_ - 1);
      this.removeInput("ADD" + this.itemCount_);
      if (this.itemCount_ === 0) {
        this.topInput_ = this.appendDummyInput("EMPTY").appendField(createPlusField(), "PLUS").appendField(emptyLeadSlotLabel);
      }
    },
    updateMinus_: function(): void {
      const minusField: Blockly.Field = this.getField("MINUS");
      if (!minusField && (this.itemCount_ > 0)) {
        this.topInput_.insertFieldAt(1, createMinusField(), "MINUS");
      }
      else if (minusField && (this.itemCount_ < 1)) {
        this.topInput_.removeField("MINUS");
      }
    },
  };
  Blockly.Extensions.registerMutator(mutatorName, mutator, function(this: any): any {
    this.getInput("EMPTY").insertFieldAt(0, createPlusField(), "PLUS");
    return this.updateShape_(startCount);
  });
}



Blockly.Blocks["pipe_R"] = Blockly.Blocks["lists_create_with"];
createDynamicArgumentMutator("pipeMutator", 1, "add pipe output", "to", "then to");
Blockly.Blocks["pipe_R"]={
  init: function() {
    const input_1: Blockly.Input = this.appendValueInput("INPUT");
    input_1.appendField("pipe");
    this.appendDummyInput("EMPTY");
    this.setOutput(true);
    this.setColour(230);
    this.setTooltip("A dplyr pipe, i.e. %>%");
    this.setHelpUrl("");
    Blockly.Extensions.apply("pipeMutator", this, true);
  }
}
RGenerator["pipe_R"] = ((block: any): string[] => {
  const elements: string[] = [];
  const itemCount = block.itemCount_;
  for (let i = 0; i < itemCount; i++) {
    const addValue = RGenerator.valueToCode(block, "ADD" + i, RGenerator.ORDER_COMMA);
    elements.push(addValue);
  }
  const elementString = elements.join(" %>%\n    ");
  const inputCode = RGenerator.valueToCode(block, "INPUT", RGenerator.ORDER_MEMBER);
  const outputCode = `${inputCode} %>%\n    ${elementString}`;
  return [outputCode, RGenerator.ORDER_FUNCTION_CALL];
});

Blockly.Blocks["ggplot_plus_R"] = Blockly.Blocks["lists_create_with"];
createDynamicArgumentMutator("plusMutator", 1, "add plot element", "with", "and with");
Blockly.Blocks["ggplot_plus_R"]={
  init: function() {
    const input_1: Blockly.Input = this.appendValueInput("INPUT");
    input_1.appendField("make plot");
    this.appendDummyInput("EMPTY");
    this.setOutput(true);
    this.setColour(230);
    this.setTooltip("A ggplot");
    this.setHelpUrl("");
    Blockly.Extensions.apply("plusMutator", this, true);
  }
}
RGenerator["ggplot_plus_R"] = ((block: any): string[] => {
  const elements: string[] = [];
  const itemCount = block.itemCount_;
  for (let i = 0; i < itemCount; i++) {
    const addValue = RGenerator.valueToCode(block, "ADD" + i, RGenerator.ORDER_COMMA);
    elements.push(addValue);
  }
  const elementString = elements.join(" +\n    ");
  const inputCode = RGenerator.valueToCode(block, "INPUT", RGenerator.ORDER_MEMBER);
  const outputCode = `${inputCode} +\n    ${elementString}`;
  return [outputCode, RGenerator.ORDER_FUNCTION_CALL];
});





export class IntellisenseEntry{
  readonly Name: string;
  readonly Info: string;
  readonly isFunction: boolean;
  readonly isClass: boolean;
  constructor(Name: string, Info: string, isFunction: boolean, isClass: boolean) {
    this.Name = Name;
    this.Info = Info;
    this.isFunction = isFunction;
    this.isClass = isClass;
  }
}

export class IntellisenseVariable{
  readonly VariableEntry: IntellisenseEntry;
  readonly ChildEntries: IntellisenseEntry[];
  constructor(VariableEntry: IntellisenseEntry, ChildEntries: IntellisenseEntry[]) {
    this.VariableEntry = VariableEntry;
    this.ChildEntries = ChildEntries;
  }
}





let notebooksInstance: INotebookTracker | null = null;
export function setNotebooksInstance(notebooks: INotebookTracker) {
  notebooksInstance = notebooks;
};
export function getNotebooksInstance(): INotebookTracker | null {
  return notebooksInstance;
};

export function GetKernel(): [NotebookPanel, Kernel.IKernelConnection] | undefined {
  const notebook = getNotebooksInstance();
  if (notebook) {
    const matchValue: NotebookPanel | null = notebook.currentWidget;
    if (matchValue == null) {
      return void 0;
    }
  else {
    const widget: NotebookPanel = matchValue;
    const matchValue_1: Kernel.IKernelConnection | null | undefined = widget.sessionContext.session?.kernel;
    if (matchValue_1 == null) {
      return void 0;
    }
    else {
      return [widget, matchValue_1] as [NotebookPanel, Kernel.IKernelConnection];
    }
    }
  }
  else {
    return void 0;
  }
}

/**
 * Get a completion (tab+tab) using the kernel. Typically this will be following a "." but it could also be to match a known identifier against a few initial letters.
 */
export function GetKernelCompletion(queryString: string): Promise<string[]> {
  const matchValue: [NotebookPanel, Kernel.IKernelConnection] | undefined = GetKernel();
  if (matchValue == null) {
    return Promise.reject((() => {
      throw 1;
    })());
  }
  else {
    const kernel: Kernel.IKernelConnection = matchValue[1];
    return new Promise<string[]>((resolve, reject) => {
      setTimeout(() => {
        kernel.requestComplete({
          code: queryString,
          cursor_pos: queryString.length,
        }).then((_arg: KernelMessage.ICompleteReplyMsg) => {
          const content = _arg.content;
          if ('matches' in content) {
            resolve(content.matches.slice());
          }
        }).catch((_arg_1: Error) => {
          reject([queryString + " is unavailable"]);
        });
      }, 100);
    });
  }
}

// requestInspectTimeout, not used


/**
 * Get an inspection (shift+tab) using the kernel. AFAIK this only works after a complete known identifier.
 */
export function GetKernalInspection(queryString: string): Promise<string> {
  const matchValue: [NotebookPanel, Kernel.IKernelConnection] | undefined = GetKernel();
  if (matchValue == null) {
    console.log("NOKERNEL");
    return Promise.reject(new Error("Kernel not available"));
  } else {
    const widget: NotebookPanel = matchValue[0];
    const kernel: Kernel.IKernelConnection = matchValue[1];
    return new Promise<string>((resolve, reject) => {
      kernel.requestInspect({
        code: queryString,
        cursor_pos: queryString.length,
        detail_level: 0,
      }).then((_arg: KernelMessage.IInspectReplyMsg) => {
        const content = _arg.content;
        if ("found" in content) {
          const mimeType: string | undefined = widget.content.rendermime.preferredMimeType(content.data);
          const payload = content.data;
          const model: MimeModel = new rendermime.MimeModel({
            data: payload,
          });
          if(mimeType){
            const renderer: IRenderMime.IRenderer = widget.content.rendermime.createRenderer(mimeType);
            renderer.renderModel(model).then(() => {
              resolve(renderer.node.innerText);
            }).catch((error: any) => {
              console.log(queryString + ":RENDER_ERROR");
              reject(error);
            });
          }
        } else {
          console.log(queryString + ":UNDEFINED");
          resolve("UNDEFINED");
        }
      }).catch((_arg_2: Error) => {
        console.log(queryString + ":UNAVAILABLE");
        reject(new Error(queryString + " is unavailable"));
      });
    });
  }
}


export const intellisenseLookup: Map<string, IntellisenseVariable> = new Map<string, IntellisenseVariable>([]);

export function RestoreIntellisenseCacheFromStateDB(pojo: any): void {
  try {
    const cache: Map<string, IntellisenseVariable> = new Map<string, IntellisenseVariable>(pojo);
    cache.forEach((value, key) => {
      intellisenseLookup.set(key, value);
    });
    console.log("Intellisense cache restored successfully.");
  } catch (error) {
    console.error("Failed to restore intellisense cache from JSON state. Error:", error);
  }
}




/**
 * Determine if an entry is a function. We have separate blocks for properties and functions because only function blocks need parameters
 * This is a bit weird for R; not sure about standardization of this information
 * We need some special handling for cases like dplyr %>%, which is surrounded in backticks
 */
export function isFunction_R(query: string, info: string): boolean {
  if (query.indexOf("`") === 0) {
      return true;
  }
  else if (info.indexOf("Class attribute:\n\'function\'") >= 0) {
      return true;
  }
  else if (info.indexOf("Usage") >= 0) {
      return info.indexOf("Arguments") >= 0;
  }
  else {
      return false;
  }
}

/**
* Determine if an entry is a class.
* Again weird for R; making it the inverse of function
*/
export function isClass_R(info: string): boolean {
  return !isFunction_R("", info);
}

export function addToDict(dict: any, k: any, v: any) {
  if (dict.has(k)) {
    throw new Error("An item with the same key has already been added. Key: " + k);
  }
  dict.set(k, v);
}

/**
 * Request an IntellisenseVariable. If the type does not descend from object, the children will be empty.
 * Sometimes we will create a variable but it will have no type until we make an assignment.
 * We might also create a variable and then change its type.
 * So we need to check for introspections/completions repeatedly (no caching right now).
 */
export function RequestIntellisenseVariable_R(block: Blockly.Block, parentName: string): void {
  GetKernalInspection(parentName).then((parentInspection: string) => {
    const parent: IntellisenseEntry = new IntellisenseEntry(parentName, parentInspection, isFunction_R(parentName, parentInspection), isClass_R(parentInspection));
    let shouldGetChildren: boolean;
    let outArg: IntellisenseVariable = new IntellisenseVariable(parent, []);
    const matchValue: [boolean, IntellisenseVariable] = [
      intellisenseLookup.has(parent.Name),
      outArg
    ];
    if (matchValue[0]) {
      const cached: IntellisenseVariable = matchValue[1];
      if (cached.VariableEntry.Info !== parent.Info || cached.ChildEntries.length === 0) {
        shouldGetChildren = true;
      } else {
        shouldGetChildren = false;
      }
    } else {
      shouldGetChildren = true;
    }
    if (shouldGetChildren) {
      GetKernelCompletion(parentName + "::").then((completions: string[]) => {
        const pr: Promise<string>[] = completions.map((completion: string) => GetKernalInspection(completion));
        return Promise.all(pr).then((inspections: string[]) => {
          const intellisenseVariable: IntellisenseVariable = new IntellisenseVariable(parent, completions.map((completion: string, index: number) => {
            const childName: string = completion.replace(new RegExp(parentName + "::"), "");
            return new IntellisenseEntry(childName, inspections[index], isFunction_R(childName, inspections[index]), isClass_R(inspections[index]));
          }));
          if (intellisenseLookup.has(parentName)) {
            intellisenseLookup.set(parentName, intellisenseVariable);
          } else {
            addToDict(intellisenseLookup, parentName, intellisenseVariable);
          }
          const intellisenseUpdateEvent = new Blockly.Events.BlockChange(block, "field", "VAR", 0, 1);
          intellisenseUpdateEvent.group = "INTELLISENSE";
          console.log("event status is " + Blockly.Events.disable);
          Blockly.Events.enable;
          Blockly.Events.fire(intellisenseUpdateEvent);
        }).catch(error => {
          console.log("Error resolving promises:", error);
        });
      }).catch(error => {
        console.log("Error getting completions:", error);
      });
    } else {
      console.log("Not refreshing intellisense for " + parent.Name);
    }
  }).catch((error: Error) => {
    console.log("Intellisense event failed to fire; " + error.message);
  });
}



export function requestAndStubOptions_R(block: Blockly.Block, varName: string): string[][] {
  if ((varName !== "") && !block.isInFlyout) {
    RequestIntellisenseVariable_R(block, varName);
  }
  if (block.isInFlyout) {
    return [[" ", " "]];
  }
  else if ((varName !== "") && intellisenseLookup.has(varName)) {
    return [["!Waiting for kernel to respond with options.", "!Waiting for kernel to respond with options."]];
  }
  else {
    return [["!Not defined until you execute code.", "!Not defined until you execute code."]];
  }
}


export function getIntellisenseMemberOptions(memberSelectionFunction: ((arg0: IntellisenseEntry) => boolean), varName: string): string[][] {
  const outArg: IntellisenseVariable | undefined = intellisenseLookup.get(varName);
  if (outArg) {
    if (!outArg.VariableEntry.isFunction && outArg.ChildEntries.length > 0) {
      return outArg.ChildEntries.filter(memberSelectionFunction).map((ie: IntellisenseEntry) => [ie.Name, ie.Name]);
    } else if (outArg.VariableEntry.Info === "UNDEFINED") {
      return [["!Not defined until you execute code.", "!Not defined until you execute code."]];
    } else {
      return [["!No properties available.", "!No properties available."]];
    }
  } else {
    return [["!Not defined until you execute code.", "!Not defined until you execute code."]];
  }
}

export function getIntellisenseVarTooltip(varName: string): string {
  const outArg: IntellisenseVariable | undefined = intellisenseLookup.get(varName);
  if (outArg) {
    return outArg.VariableEntry.Info;
  } else {
    return "!Not defined until you execute code.";
  }
}


export function tryGetValue<K, V>(map: Map<K, V>, key: K, defaultValue: V | undefined): [boolean, V | undefined] {
  return map.has(key) ? [true, map.get(key)] : [false, defaultValue];
}

export function getIntellisenseMemberTooltip(varName: string, memberName: string): string {
  const matchValue: [boolean, IntellisenseVariable | null | undefined] = tryGetValue(intellisenseLookup, varName, null);

  if (matchValue[0]) {
    const matchValueChild: IntellisenseEntry | undefined = matchValue[1]?.ChildEntries.find(c => c.Name === memberName);

    if (matchValueChild == null) {
      return "!Not defined until you execute code.";
    } else {
      return matchValueChild.Info;
    }
  } else {
    return "!Not defined until you execute code.";
  }
}

/**
 * Update all the blocks that use intellisense. Called after the kernel executes a cell so our intellisense in Blockly is updated.
 */
export function UpdateAllIntellisense_R(): void {
  const workspace: Blockly.Workspace = Blockly.getMainWorkspace();
  
  const blocks: Blockly.Block[] = workspace.getBlocksByType("varGetProperty_R", false);
  workspace.getBlocksByType("varDoMethod_R", false).forEach(block => blocks.push(block));
  
  blocks.forEach((block: any) => {
    block.updateIntellisense(block, null, ((varName: string): string[][] => requestAndStubOptions_R(block, varName)));
  });

  (workspace as Blockly.WorkspaceSvg).registerToolboxCategoryCallback(
    'VARIABLE', flyoutCategoryBlocks_R);
}

/**
 * Remove a field from a block safely, even if it doesn't exist
 */
export function SafeRemoveField(block: Blockly.Block, fieldName: string, inputName: string): void {
  const matchValue: Blockly.Field | null = block.getField(fieldName);
  const matchValue_1: Blockly.Input | null = block.getInput(inputName);
  if (!matchValue) {}
  else if (!matchValue_1) {
    console.log(((("error removing (" + fieldName) + ") from block; input (") + inputName) + ") does not exist");
  }
  else {
    matchValue_1.removeField(fieldName);
  }
}

/**
* Remove an input safely, even if it doesn't exist
*/
export function SafeRemoveInput(block: Blockly.Block, inputName: string): void {
  if (!block.getInput(inputName)) {}
  else {
    block.removeInput(inputName);
  }
}

createDynamicArgumentMutator("intelliblockMutator", 1, "add argument", "using", "and");

export function makeMemberIntellisenseBlock_R(blockName: string, preposition: string, verb: string, memberSelectionFunction: ((arg0: IntellisenseEntry) => boolean), hasArgs: boolean, hasDot: boolean): void {
  Blockly.Blocks[blockName] = {
    varSelectionUserName(thisBlockClosure: Blockly.Block, selectedOption: string): string {
      const fieldVariable = thisBlockClosure.getField("VAR") as Blockly.FieldVariable;
      const lastVar: Blockly.VariableModel = thisBlockClosure.workspace.getAllVariables().slice(-1)[0];
      const dataString: string | null = thisBlockClosure.data;
      const data: string[] = dataString && dataString.indexOf(":") >= 0 ? dataString.split(":") : [""];
      if (selectedOption == null) {
        const matchValue: string = fieldVariable.getText();
        const matchValue_1: string = data[0];
        const matchValue_2: string = lastVar ? lastVar.name : "";
        return matchValue === "" ? (matchValue_1 === "" ? matchValue_2 : matchValue_1) : matchValue;
      } else {
        const source = fieldVariable.getOptions();
        const source2 = source.find((option: Blockly.MenuOption) => option[1] === selectedOption);
        return source2 ? (typeof source2[0] === 'string' ? source2[0] : "") : "";
      }
    },
    selectedMember: "",
    updateIntellisense(thisBlockClosure: any, selectedVarOption: string, optionsFunction: (varUserName: string) => string[][]){
      const input: Blockly.Input | null = thisBlockClosure.getInput("INPUT");
      SafeRemoveField(thisBlockClosure, "MEMBER", "INPUT");
      SafeRemoveField(thisBlockClosure, "USING", "INPUT");
      const varUserName: string = thisBlockClosure.varSelectionUserName(thisBlockClosure, selectedVarOption);
      
      const flatOptions: string[] = optionsFunction(varUserName).map(arr => arr[0]);

      const dataString: string = thisBlockClosure.data ? thisBlockClosure.data : "";      
      if(input){
        let customfield = new CustomFields.FieldFilter(dataString, flatOptions, function(this: any, newMemberSelectionIndex: any) {
          const thisSearchDropdown: typeof CustomFields_1 = this;
          const newMemberSelection: string = newMemberSelectionIndex === "" ? dataString : thisSearchDropdown.WORDS[newMemberSelectionIndex];        
          thisSearchDropdown.setTooltip(getIntellisenseMemberTooltip(varUserName, newMemberSelection));          
          let matchValue;
          thisBlockClosure.selectedMember = (matchValue = [newMemberSelection.indexOf("!") === 0, this.selectedMember], matchValue[1] === "" ? newMemberSelection : matchValue[0] ? this.selectedMember : newMemberSelection);
          if (varUserName !== "" && thisBlockClosure.selectedMember !== "") {
            thisBlockClosure.data = thisBlockClosure.selectedMember;
          }
          return newMemberSelection;
        })

        input.appendField(customfield, "MEMBER");
      } 
      if (thisBlockClosure.data === undefined || thisBlockClosure.data === null) {
        thisBlockClosure.data = thisBlockClosure.selectedMember;
      }
      const memberField: Blockly.Field | null = thisBlockClosure.getField("MEMBER");
      if(memberField){
        memberField.setTooltip(getIntellisenseMemberTooltip(varUserName, memberField.getText()));
      }
      },
      init: function(): void{
        console.log(blockName + " init");
        const input_1: Blockly.Input = this.appendDummyInput("INPUT");

        input_1.appendField(preposition).appendField(new Blockly.FieldVariable(
          "variable name",
          ((newSelection: string): any => {
          this.updateIntellisense(this, newSelection, ((varName: string): string[][] => requestAndStubOptions_R(this, varName)));
          return newSelection;
          })
        ) as Blockly.Field, "VAR").appendField(verb);

        this.updateIntellisense(this, null, ((varName_1: string): string[][] => requestAndStubOptions_R(this, varName_1)));

        this.setOutput(true);
        this.setColour(230);
        this.setTooltip("!Not defined until you execute code.");
        this.setHelpUrl("");
        if (hasArgs) {
          this.appendDummyInput("EMPTY");
          Blockly.Extensions.apply("intelliblockMutator", this, true);
        }
      },
      onchange: function(e: Blockly.Events.BlockChange): void {
        if ((this.workspace && !this.isInFlyout) && (e.group === "INTELLISENSE")) {
          const data_1: string[] = this.data ? this.data.toString() : "";
          this.updateIntellisense(this, null, ((varName_2: string): string[][] => getIntellisenseMemberOptions(memberSelectionFunction, varName_2)));
          const memberField: Blockly.Field = this.getField("MEMBER");
          if (data_1[1] !== "") {
            memberField.setValue(data_1[1]);
          }
          const varName_3: string = this.varSelectionUserName(this, null);
          this.setTooltip(getIntellisenseVarTooltip(varName_3));
        }
      },
  };
  RGenerator[blockName] = ((block: any): string[] => {
    const varName: string = RGenerator.getVariableName(block.getFieldValue("VAR"));
    const memberName: string = block.getFieldValue("MEMBER").toString();
    let code = "";
    if (memberName.indexOf("!") === 0) {
      code = "";
    } else if (hasArgs) {
      const args: string[] = Array.from({ length: block.itemCount_ }, (_, i) => {
        return RGenerator.valueToCode(block, "ADD" + i.toString(), RGenerator.ORDER_COMMA);
      });
      const cleanArgs: string = args.join(",");
      code = varName + (hasDot ? "::" : "") + memberName + "(" + cleanArgs + ")";
    } else {
      code = varName + (hasDot ? "::" : "") + memberName;
    }
    return [code, RGenerator.ORDER_FUNCTION_CALL];
  });
}


makeMemberIntellisenseBlock_R("varGetProperty_R", "from", "get", (ie: IntellisenseEntry): boolean => !ie.isFunction, false, true);
makeMemberIntellisenseBlock_R("varDoMethod_R", "with", "do", (ie: IntellisenseEntry): boolean => ie.isFunction, true, true);

export class FlyoutRegistryEntry{
  readonly LanguageName: string;
  readonly KernelCheckFunction: ((arg0: string) => boolean);
  readonly FlyoutFunction: ((arg0: Blockly.Workspace) => Element[]);
  constructor(LanguageName: string, KernelCheckFunction: ((arg0: string) => boolean), FlyoutFunction: ((arg0: Blockly.Workspace) => Element[])) {
    this.LanguageName = LanguageName;
    this.KernelCheckFunction = KernelCheckFunction;
    this.FlyoutFunction = FlyoutFunction;
  }
}

Blockly.Variables.flyoutCategoryBlocks = ((workspace: Blockly.Workspace): Element[] => {
  if(registry){
    const matchValue: [NotebookPanel, Kernel.IKernelConnection] | undefined = GetKernel();
    if (matchValue) {
      const k: Kernel.IKernelConnection = matchValue[1];
      const entryOption = registry.find(e => e.KernelCheckFunction(k.name));
      return entryOption ? entryOption.FlyoutFunction(workspace) : [];
    } else {
      return [];
    }
  } else {
    return [];
  }
});

export function flyoutCategoryBlocks_R(workspace: Blockly.Workspace): Element[] {
  const variableModelList: Blockly.VariableModel[] = workspace.getVariablesOfType("");
  const xmlList: Element[] = [];

  const button = document.createElement('button');
  button.setAttribute('text', '%{BKY_NEW_VARIABLE}');
  button.setAttribute('callbackKey', 'CREATE_VARIABLE');
  (workspace as Blockly.WorkspaceSvg).registerButtonCallback('CREATE_VARIABLE', function (button) {
    Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace());
  });
  xmlList.push(button);

  if (variableModelList.length > 0) {
    const lastVarFieldXml: Blockly.VariableModel = variableModelList[variableModelList.length - 1];
    if (Blockly.Blocks.variables_set) {
      const xml: Element = Blockly.utils.xml.createElement("block");
      xml.setAttribute("type", "variables_set");
      xml.setAttribute("gap", Blockly.Blocks.math_change ? "8" : "24");
      xml.appendChild(Blockly.Variables.generateVariableFieldDom(lastVarFieldXml));
      xmlList.push(xml);
    }
    if (Blockly.Blocks.math_change) {
      const xml_1: Element = Blockly.utils.xml.createElement("block");
      xml_1.setAttribute("type", "math_change");
      xml_1.setAttribute("gap", Blockly.Blocks.math_change ? "20" : "8");
      xml_1.appendChild(Blockly.Variables.generateVariableFieldDom(lastVarFieldXml));
      const shadowBlockDom: Element = Blockly.utils.xml.textToDom("<value name=\'DELTA\'><shadow type=\'math_number\'><field name=\'NUM\'>1</field></shadow></value>");
      xml_1.appendChild(shadowBlockDom);
      xmlList.push(xml_1);
    }
    if (Blockly.Blocks.varGetProperty_R) {
      const xml_2: Element = Blockly.utils.xml.createElement("block");
      xml_2.setAttribute("type", "varGetProperty_R");
      xml_2.setAttribute("gap", Blockly.Blocks.varGetProperty_R ? "20" : "8");
      xml_2.appendChild(Blockly.Variables.generateVariableFieldDom(lastVarFieldXml));
      xmlList.push(xml_2);
    }
    if (Blockly.Blocks.varDoMethod_R) {
      const xml_3: Element = Blockly.utils.xml.createElement("block");
      xml_3.setAttribute("type", "varDoMethod_R");
      xml_3.setAttribute("gap", Blockly.Blocks.varDoMethod_R ? "20" : "8");
      xml_3.appendChild(Blockly.Variables.generateVariableFieldDom(lastVarFieldXml));
      xmlList.push(xml_3);
    }
    if (Blockly.Blocks.varCreateObject_R) {
      const xml_4: Element = Blockly.utils.xml.createElement("block");
      xml_4.setAttribute("type", "varCreateObject_R");
      xml_4.setAttribute("gap", Blockly.Blocks.varCreateObjectR ? "20" : "8");
      xml_4.appendChild(Blockly.Variables.generateVariableFieldDom(lastVarFieldXml));
      xmlList.push(xml_4);
    }
    if (Blockly.Blocks.variables_get) {
      for (const variableModel of variableModelList) {
        const xml_5: Element = Blockly.utils.xml.createElement("block");
        xml_5.setAttribute("type", "variables_get");
        xml_5.setAttribute("gap", "8");
        xml_5.appendChild(Blockly.Variables.generateVariableFieldDom(variableModel));
        xmlList.push(xml_5);
      }
    }
  }
  return xmlList;
}


export const registry: FlyoutRegistryEntry[] = [];
registry.push(new FlyoutRegistryEntry("R", (name: string): boolean => (name === "ir"), flyoutCategoryBlocks_R));

export function DoFinalInitialization(workspace: Blockly.WorkspaceSvg): void {
  workspace.registerToolboxCategoryCallback("SPECIAL", (workspace: Blockly.Workspace): any[] => {
    const blockList: any[] = [];
    const label: any = document.createElement("label");
    label.setAttribute("text", "Occassionally blocks appear here as you load libraries (e.g. %>%). See VARIABLES for most cases.");
    void (blockList.push(label));
    if (intellisenseLookup.has("dplyr")) {
      const block: any = document.createElement("block");
      block.setAttribute("type", "pipe_R");
      void (blockList.push(block));
    }
    if (intellisenseLookup.has("ggplot2")) {
      const block_1: any = document.createElement("block");
      block_1.setAttribute("type", "ggplot_plus_R");
      void (blockList.push(block_1));
    }
    return blockList;
  });
}

export const toolbox = "<xml xmlns=\"https://developers.google.com/blockly/xml\" id=\"toolbox\" style=\"display: none\">\n    <category name=\"IMPORT\" colour=\"255\">\n      <block type=\"import_R\"></block>\n    </category>\n    <category name=\"FREESTYLE\" colour=\"290\">\n      <block type=\"dummyOutputCodeBlock_R\"></block>\n      <block type=\"dummyNoOutputCodeBlock_R\"></block>\n      <block type=\"valueOutputCodeBlock_R\"></block>\n      <block type=\"valueNoOutputCodeBlock_R\"></block>\n    </category>\n    <category name=\"LOGIC\" colour=\"%{BKY_LOGIC_HUE}\">\n      <block type=\"controls_if\"></block>\n      <block type=\"logic_compare\"></block>\n      <block type=\"logic_operation\"></block>\n      <block type=\"logic_negate\"></block>\n      <block type=\"logic_boolean\"></block>\n      <block type=\"logic_null\"></block>\n      <block type=\"logic_ternary\"></block>\n    </category>\n    <category name=\"LOOPS\" colour=\"%{BKY_LOOPS_HUE}\">\n      <block type=\"controls_repeat_ext\">\n        <value name=\"TIMES\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">10</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"controls_whileUntil\"></block>\n      <block type=\"controls_for\">\n        <value name=\"FROM\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">1</field>\n          </shadow>\n        </value>\n        <value name=\"TO\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">10</field>\n          </shadow>\n        </value>\n        <value name=\"BY\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">1</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"controls_forEach\"></block>\n      <block type=\"controls_flow_statements\"></block>\n    </category>\n    <category name=\"MATH\" colour=\"%{BKY_MATH_HUE}\">\n      <block type=\"math_number\">\n        <field name=\"NUM\">123</field>\n      </block>\n      <block type=\"math_arithmetic\">\n        <value name=\"A\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">1</field>\n          </shadow>\n        </value>\n        <value name=\"B\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">1</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"math_single\">\n        <value name=\"NUM\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">9</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"math_trig\">\n        <value name=\"NUM\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">45</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"math_constant\"></block>\n      <block type=\"math_number_property\">\n        <value name=\"NUMBER_TO_CHECK\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">0</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"math_round\">\n        <value name=\"NUM\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">3.1</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"math_on_list\"></block>\n      <block type=\"math_modulo\">\n        <value name=\"DIVIDEND\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">64</field>\n          </shadow>\n        </value>\n        <value name=\"DIVISOR\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">10</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"math_constrain\">\n        <value name=\"VALUE\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">50</field>\n          </shadow>\n        </value>\n        <value name=\"LOW\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">1</field>\n          </shadow>\n        </value>\n        <value name=\"HIGH\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">100</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"math_random_int\">\n        <value name=\"FROM\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">1</field>\n          </shadow>\n        </value>\n        <value name=\"TO\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">100</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"math_random_float\"></block>\n      <block type=\"math_atan2\">\n        <value name=\"X\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">1</field>\n          </shadow>\n        </value>\n        <value name=\"Y\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">1</field>\n          </shadow>\n        </value>\n      </block>\n    </category>\n    <category name=\"TEXT\" colour=\"%{BKY_TEXTS_HUE}\">\n      <block type=\"text\"></block>\n      <block type=\"text_join\"></block>\n      <block type=\"text_append\">\n        <value name=\"TEXT\">\n          <shadow type=\"text\"></shadow>\n        </value>\n      </block>\n      <block type=\"text_length\">\n        <value name=\"VALUE\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">abc</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"text_isEmpty\">\n        <value name=\"VALUE\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\"></field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"text_indexOf\">\n        <value name=\"VALUE\">\n          <block type=\"variables_get\">\n            <field name=\"VAR\">{textVariable}</field>\n          </block>\n        </value>\n        <value name=\"FIND\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">abc</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"text_charAt\">\n        <value name=\"VALUE\">\n          <block type=\"variables_get\">\n            <field name=\"VAR\">{textVariable}</field>\n          </block>\n        </value>\n      </block>\n      <block type=\"text_getSubstring\">\n        <value name=\"STRING\">\n          <block type=\"variables_get\">\n            <field name=\"VAR\">{textVariable}</field>\n          </block>\n        </value>\n      </block>\n      <block type=\"text_changeCase\">\n        <value name=\"TEXT\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">abc</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"text_trim\">\n        <value name=\"TEXT\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">abc</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"text_print\">\n        <value name=\"TEXT\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">abc</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"text_prompt_ext\">\n        <value name=\"TEXT\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">abc</field>\n          </shadow>\n        </value>\n      </block>\n    </category>\n    <category name=\"LISTS\" colour=\"%{BKY_LISTS_HUE}\">\n      <block type=\"lists_create_with\">\n        <mutation items=\"0\"></mutation>\n      </block>\n      <block type=\"lists_create_with\"></block>\n      <block type=\"lists_repeat\">\n        <value name=\"NUM\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">5</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"lists_length\"></block>\n      <block type=\"lists_isEmpty\"></block>\n      <block type=\"lists_indexOf\">\n        <value name=\"VALUE\">\n          <block type=\"variables_get\">\n            <field name=\"VAR\">{listVariable}</field>\n          </block>\n        </value>\n      </block>\n      <block type=\"lists_getIndex\">\n        <value name=\"VALUE\">\n          <block type=\"variables_get\">\n            <field name=\"VAR\">{listVariable}</field>\n          </block>\n        </value>\n      </block>\n      <block type=\"lists_setIndex\">\n        <value name=\"LIST\">\n          <block type=\"variables_get\">\n            <field name=\"VAR\">{listVariable}</field>\n          </block>\n        </value>\n      </block>\n      <block type=\"lists_getSublist\">\n        <value name=\"LIST\">\n          <block type=\"variables_get\">\n            <field name=\"VAR\">{listVariable}</field>\n          </block>\n        </value>\n      </block>\n      <block type=\"indexer_R\"></block>\n      <block type=\"doubleIndexer_R\"></block>\n      <block type=\"lists_split\">\n        <value name=\"DELIM\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">,</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"lists_sort\"></block>\n      <block type=\"uniqueBlock_R\"></block>\n      <block type=\"reversedBlock_R\"></block>\n      <block type=\"unlistBlock_R\"></block>\n    </category>\n    <category name=\"COLOUR\" colour=\"%{BKY_COLOUR_HUE}\">\n      <block type=\"colour_picker\"></block>\n      <block type=\"colour_random\"></block>\n      <block type=\"colour_rgb\">\n        <value name=\"RED\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">100</field>\n          </shadow>\n        </value>\n        <value name=\"GREEN\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">50</field>\n          </shadow>\n        </value>\n        <value name=\"BLUE\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">0</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"colour_blend\">\n        <value name=\"COLOUR1\">\n          <shadow type=\"colour_picker\">\n            <field name=\"COLOUR\">#ff0000</field>\n          </shadow>\n        </value>\n        <value name=\"COLOUR2\">\n          <shadow type=\"colour_picker\">\n            <field name=\"COLOUR\">#3333ff</field>\n          </shadow>\n        </value>\n        <value name=\"RATIO\">\n          <shadow type=\"math_number\">\n            <field name=\"NUM\">0.5</field>\n          </shadow>\n        </value>\n      </block>\n    </category>\n    <category name=\"CONVERSION\" colour=\"120\">\n      <block type=\"boolConversion_R\">\n      </block>\n      <block type=\"intConversion_R\">\n      </block>\n      <block type=\"floatConversion_R\">\n      </block>\n      <block type=\"strConversion_R\">\n      </block>\n    </category>\n    <category name=\"I/O\" colour=\"190\">\n      <block type=\"textFromFile_R\">\n        <value name=\"FILENAME\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">name of file</field>\n          </shadow>\n        </value>\n      </block>\n      <block type=\"readFile_R\">\n        <value name=\"FILENAME\">\n          <shadow type=\"text\">\n            <field name=\"TEXT\">name of file</field>\n          </shadow>\n        </value>\n      </block>\n    </category>\n    <sep></sep>\n    <category name=\"VARIABLES\" colour=\"%{BKY_VARIABLES_HUE}\" custom=\"VARIABLE\"></category>\n    <!-- TEMPORARILY DISABLED B/C OF PLUS/MINUS INCOMPATIBILITY <category name=\"FUNCTIONS\" colour=\"%{BKY_PROCEDURES_HUE}\" custom=\"PROCEDURE\"></category> -->\n    <category name=\"SPECIAL\" colour=\"270\" custom=\"SPECIAL\"></category>\n  </xml>";