module RToolbox

open Fable.Core
open Fable.Core.JsInterop
open Fable.Core.DynamicExtensions
open Browser.Types
open Blockly
open JupyterlabServices.__kernel_messages.KernelMessage


//=================================================================
// Implement generators/r.js
//=================================================================
// Based on the UMD implementation in Blockly blockly-3.20191014.4,
// it looks like we can define a language generator directly in 
// f#; however, this became quite tedious, so the implementation is
// in js with an import here, matching the loading in Blockly's 
// node.js.

// 2/21/22
//This works in dev but fails in deploy; "RGenerator.js" is in deployed files but does not show in Chrome Sources Page view when deployed
// importSideEffects("./RGenerator.js") 

// A single member import invokes all side effects in dev;
let side_effects_r_generator : string = importMember "./RGenerator.js"

let  CustomFields : obj = importMember "./SearchDropdown.js"

//=================================================================

//TODO: ask fable about using jsOptions to define functions
//trying to define block without explicitly calling constructor as above...
// Attempt 1: use jsOptions
// the below won't compile: The address of a value returned from the expression cannot be used at this point. This is to ensure the address of the local value does not escape its scope.F# Compiler(3228)
// blockly?Blocks.["import"] <- jsOptions<Blockly.Block>(fun o -> o.init <- fun _ -> ()  ) 
// NOTE: it doesn't matter if we define an outside function and pass it in to jsOptions; jsOptions does not like function definitions like this.
// lOOKS LIKE YOU CAN ONLY USE JSOPTIONS FOR SETTING CLASS MEMBERS, NOT FOR CALLING FUNCTIONS AND MAYBE NOT FOR DEFINING THEM
//blockly?Blocks.["import"] <- jsOptions<Blockly.Block>(fun o -> o.setTooltip !^"Import a python package to access functions in that package" )  //THIS COMPLIES BUT THROWS RUNTIME ERROR "TypeError: o.setTooltip is not a function"


//scraps from attempting to use jsOptions  
  // o.init <- fun _ -> 
      // this.appendDummyInput()
      //   .appendField( !^"import"  )
      //   .appendField( !^(blockly.FieldTextInput__Class.Create("some library") :?> Blockly.Field), "libraryName"  )
      //   .appendField( !^"as") 
      //   .appendField( !^(blockly.FieldTextInput__Class.Create("variable name") :?> Blockly.Field), "libraryAlias"  ) |> ignore
      // this.setNextStatement true
      // this.setColour !^230.0
      // this.setTooltip !^"Import a python package to access functions in that package"
      // this.setHelpUrl !^"https://docs.python.org/3/reference/import.html"
  //)

/// Emit "this" typed to Block as an interop workaround
[<Emit("this")>]
let thisBlock : Blockly.Block = jsNative

/// Emit "this" untyped as an interop workaround
[<Emit("this")>]
let thisObj : obj = jsNative

// This is throwing a babel error, so kludging the below
/// Emit "delete"
// [<Emit("delete $0")>]
// let delete (o : obj) : unit = jsNative

[<Emit("delete blockly.R.definitions_")>]
let deleteDefinitions : unit = jsNative

[<Emit("delete blockly.R.functionNames_")>]
let deleteFunctions : unit = jsNative

//Prevent Blockly from prepending variable definitions for us 
// This allows imports and function definitions but not variable definitions; functions are identified using the language keyword
blockly?R?finish <- System.Func<string,string>(fun code ->
  let imports = ResizeArray<string>()
  let functions = ResizeArray<string>()
  for name in JS.Constructors.Object.keys( blockly?R?definitions_ ) do
    let ( definitions : obj ) =  blockly?R?definitions_
    let (def : string) = definitions.[ name ] |> string
    if def.StartsWith("library(") then
      imports.Add(def)
    //auto functions (functions defined for default blocks) begin with "function("; user-defined functions (created via FUNCTIONS category) begin with "#" 
    if def.StartsWith("function(") ||  def.StartsWith("# ") then 
      functions.Add(def)
  deleteDefinitions
  deleteFunctions
  blockly?R?variableDB_?reset()
  (imports |> String.concat "\n")  + (functions |> String.concat "\n")  + "\n\n" + code)

/// Encode the current Blockly workspace as an XML string
let encodeWorkspace() =
  let xml = Blockly.xml.workspaceToDom( blockly.getMainWorkspace() );
  let xmlText = Blockly.xml.domToText( xml )
  xmlText

/// Decode an XML string and load the represented blocks into the Blockly workspace
let decodeWorkspace( xmlText ) =
  let xml = Blockly.xml.textToDom( xmlText )
  Blockly.xml.domToWorkspace( xml, blockly.getMainWorkspace() ) |> ignore

//--------------------------------------------------------------------------------------------------
// DEFINING BLOCKS BELOW: TODO eventually clear out blocks that don't make sense for R
//--------------------------------------------------------------------------------------------------

// AO: list comprehension does not really exist for R
// comprehension block (goes inside list block for list comprehension)
// blockly?Blocks.["comprehensionForEach"] <- createObj [
//   "init" ==> fun () ->
//     Browser.Dom.console.log( "comprehensionForEach" + " init")
//     thisBlock.appendValueInput("LIST")
//       .setCheck(!^None)
//       .appendField( !^"for each item"  )
//       .appendField( !^(blockly.FieldVariable.Create("i") :?> Blockly.Field), "VAR"  )
//       .appendField( !^"in list"  ) |> ignore
//     thisBlock.appendValueInput("YIELD")
//       .setCheck(!^None)
//       .setAlign(blockly.ALIGN_RIGHT)
//       .appendField( !^"yield"  ) |> ignore
//     thisBlock.setOutput(true, !^None)
//     thisBlock.setColour(!^230.0)
//     thisBlock.setTooltip !^("Use this to generate a sequence of elements, also known as a comprehension. Often used for list comprehensions." )
//     thisBlock.setHelpUrl !^"https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions"
//   ]
// blockly?R.["comprehensionForEach"] <- fun (block : Blockly.Block) -> 
//   let var = blockly?R?variableDB_?getName( block.getFieldValue("VAR").Value |> string, blockly?Variables?NAME_TYPE);
//   let list = blockly?R?valueToCode( block, "LIST", blockly?R?ORDER_ATOMIC )
//   let yieldValue = blockly?R?valueToCode( block, "YIELD", blockly?R?ORDER_ATOMIC )
//   let code = yieldValue + " for " + var + " in " + list
//   [| code; blockly?R?ORDER_ATOMIC |] //TODO: COMPREHENSION PRECEDENCE IS ADDING () NESTING; SEE SCREENSHOT; TRY ORDER NONE?

// AO: with/as does not really exist for R
// with as block
// blockly?Blocks.["withAs"] <- createObj [
//   "init" ==> fun () ->
//     Browser.Dom.console.log( "withAs" + " init")
//     thisBlock.appendValueInput("EXPRESSION")
//       .setCheck(!^None)
//       .appendField( !^"with"  ) |> ignore
//     thisBlock.appendDummyInput()
//       .appendField( !^"as"  ) 
//       .appendField( !^(blockly.FieldVariable.Create("item") :?> Blockly.Field), "TARGET"  ) |> ignore
//     thisBlock.appendStatementInput("SUITE")
//       .setCheck(!^None) |> ignore
//     thisBlock.setNextStatement true
//     thisBlock.setPreviousStatement true
//     thisBlock.setInputsInline true |> ignore
//     thisBlock.setColour(!^230.0)
//     thisBlock.setTooltip !^("Use this to open resources (usually file-type) in a way that automatically handles errors and disposes of them when done. May not be supported by all libraries." )
//     thisBlock.setHelpUrl !^"https://docs.python.org/3/reference/compound_stmts.html#with"
//   ]
// blockly?R.["withAs"] <- fun (block : Blockly.Block) -> 
//   let expressionCode = blockly?R?valueToCode( block, "EXPRESSION", blockly?R?ORDER_ATOMIC ) |> string
//   let targetCode = blockly?R?variableDB_?getName( block.getFieldValue("TARGET").Value |> string, blockly?Variables?NAME_TYPE) |> string
//   let suiteCode = blockly?R?statementToCode( block, "SUITE" ) //|| blockly?R?PASS 
//   let code = "with " + expressionCode + " as " + targetCode + ":\n" + suiteCode.ToString()
//   code
  //[| code; blockly?R?ORDER_ATOMIC |] 



// TEXT file read block
blockly?Blocks.["textFromFile_R"] <- createObj [
  "init" ==> fun () ->
    Browser.Dom.console.log( "textFromFile_R" + " init")
    thisBlock.appendValueInput("FILENAME")
      .setCheck(!^"String")
      .appendField( !^"read text from file"  ) |> ignore
      // .appendField( !^(blockly.FieldTextInput.Create("type filename here...") :?> Blockly.Field), "FILENAME"  ) |> ignore
    thisBlock.setOutput(true, !^None)
    thisBlock.setColour(!^230.0)
    thisBlock.setTooltip !^("Use this to read a flat text file. It will output a string." )
    thisBlock.setHelpUrl !^"https://stackoverflow.com/a/9069670"
  ]
// Generate R template code
blockly?R.["textFromFile_R"] <- fun (block : Blockly.Block) -> 
  let fileName = blockly?R?valueToCode( block, "FILENAME", blockly?R?ORDER_ATOMIC )
  let code = "readChar(" + fileName + ", file.info(" + fileName + ")$size)"
  [| code; blockly?R?ORDER_FUNCTION_CALL |]

// GENERAL file read block
blockly?Blocks.["readFile_R"] <- createObj [
  "init" ==> fun () ->
    Browser.Dom.console.log( "readFile_R" + " init")
    thisBlock.appendValueInput("FILENAME")
      .setCheck(!^"String")
      .appendField( !^"read file"  )
      // .appendField( !^(blockly.FieldTextInput.Create("type filename here...") :?> Blockly.Field), "FILENAME"  ) 
      |> ignore
    thisBlock.setOutput(true, !^None)
    thisBlock.setColour(!^230.0)
    thisBlock.setTooltip !^("Use this to read a file. It will output a file, not a string." )
    thisBlock.setHelpUrl !^"https://stat.ethz.ch/R-manual/R-devel/library/base/html/connections.html"
  ]
// Generate R template code
blockly?R.["readFile_R"] <- fun (block : Blockly.Block) -> 
  // let fileName = block.getFieldValue("FILENAME").Value |> string
  let fileName = blockly?R?valueToCode( block, "FILENAME", blockly?R?ORDER_ATOMIC )
  let code = "file(" + fileName + ", 'rt')"
  [| code; blockly?R?ORDER_FUNCTION_CALL |]


/// A template to create arbitrary code blocks (FREESTYLE) in these dimensions: dummy/input; output/nooutput
let makeCodeBlock_R (blockName:string) (hasInput: bool) (hasOutput: bool) =
  blockly?Blocks.[blockName] <- createObj [
    "init" ==> fun () ->
      let input = if hasInput then thisBlock.appendValueInput("INPUT").setCheck(!^None) else thisBlock.appendDummyInput()
      Browser.Dom.console.log( blockName + " init")
      input
        .appendField( !^(blockly.FieldTextInput.Create("type code here...") :?> Blockly.Field), "CODE"  ) |> ignore
      if hasOutput then 
        thisBlock.setOutput(true, !^None)
      else
        thisBlock.setNextStatement true
        thisBlock.setPreviousStatement true
      thisBlock.setColour(!^230.0)
      thisBlock.setTooltip !^("You can put any R code in this block. Use this block if you " + (if hasInput then "do" else "don't") + " need to connect an input block and "+ (if hasOutput then "do" else "don't") + " need to connect an output block." )
      thisBlock.setHelpUrl !^"https://cran.r-project.org/manuals.html"
    ]
  // Generate R template code
  blockly?R.[blockName] <- fun (block : Blockly.Block) -> 
    let userCode = block.getFieldValue("CODE").Value |> string
    let code =
      if hasInput then
        let input = blockly?R?valueToCode( block, "INPUT", blockly?R?ORDER_ATOMIC )
        (userCode + " " + input).Trim()
      else 
        userCode.Trim()
    if hasOutput then
      [| code; blockly?R?ORDER_ATOMIC |] //Assumption is that freestyle should not invoke operator precedence at all
    else
      code + "\n" |> unbox

//Make all varieties of code block
makeCodeBlock_R "dummyOutputCodeBlock_R" false true
makeCodeBlock_R "dummyNoOutputCodeBlock_R" false false
makeCodeBlock_R "valueOutputCodeBlock_R" true true
makeCodeBlock_R "valueNoOutputCodeBlock_R" true false

/// Create a Blockly/R templated import/library block
let makeImportBlock_R (blockName:string) (labelOne:string) = //(labelTwo:string)  =
  blockly?Blocks.[ blockName ] <- createObj [
    "init" ==> fun () -> 
      // Browser.Dom.console.log("did import block init")
      thisBlock.appendDummyInput()
        .appendField( !^labelOne  )
        // .appendField( !^(blockly.FieldTextInput.Create("some library") :?> Blockly.Field), "libraryName"  )
        // .appendField( !^labelTwo)
        // .appendField( !^(blockly.FieldVariable.Create("variable name") :?> Blockly.Field), "libraryAlias"  )
        .appendField( !^(blockly.FieldVariable.Create("some library") :?> Blockly.Field), "libraryName"  ) 
        |> ignore
      thisBlock.setNextStatement true
      thisBlock.setPreviousStatement true
      thisBlock.setColour !^230.0
      thisBlock.setTooltip !^"Load an R package to access functions in that package"
      thisBlock.setHelpUrl !^"https://stat.ethz.ch/R-manual/R-devel/library/base/html/library.html"
    ]
  /// Generate R import code
  blockly?R.[ blockName ] <- fun (block : Blockly.Block) -> 
    // let libraryName = block.getFieldValue("libraryName").Value |> string
    // let libraryAlias = blockly?R?variableDB_?getName( block.getFieldValue("libraryAlias").Value |> string, blockly?Variables?NAME_TYPE);
    // let code =  labelOne + " " + libraryName + " " + labelTwo + " " + libraryAlias + "\n"
    //Create a var here because we will use it to call intellisense later
    let libraryVar = blockly?R?variableDB_?getName( block.getFieldValue("libraryName").Value |> string, blockly?Variables?NAME_TYPE);
    let code = "library(" + libraryVar + ")\n"
    code

//make import block
makeImportBlock_R "import_R" "library" //AO: note we are using R terminology here not Python terminology

//make from import block
// makeImportBlock_R "importFrom" "from" "import"

/// indexer block
blockly?Blocks.[ "indexer_R" ] <- createObj [
  "init" ==> fun () -> 
    thisBlock.appendValueInput("INDEX")
      .appendField( !^(blockly.FieldVariable.Create("{dictVariable}") :?> Blockly.Field), "VAR"  )
      .appendField( !^"["  ) |> ignore          
    thisBlock.appendDummyInput()
      .appendField( !^"]") |> ignore
    thisBlock.setInputsInline true
    thisBlock.setOutput true
    thisBlock.setColour !^230.0
    thisBlock.setTooltip !^"Gets a list from the variable at a given indices. Not supported for all variables."
    thisBlock.setHelpUrl !^"https://cran.r-project.org/doc/manuals/R-lang.html#Indexing"
  ]
/// Generate R import code
blockly?R.[ "indexer_R" ] <- fun (block : Blockly.Block) -> 
  let varName = blockly?R?variableDB_?getName( block.getFieldValue("VAR").Value |> string, blockly?Variables?NAME_TYPE);
  let input = blockly?R?valueToCode( block, "INDEX", blockly?R?ORDER_ATOMIC )
  let code =  varName + "[" + input + "]" //+ "\n"
  [| code; blockly?R?ORDER_ATOMIC |]

/// double indexer block
blockly?Blocks.[ "doubleIndexer_R" ] <- createObj [
  "init" ==> fun () -> 
    thisBlock.appendValueInput("INDEX")
      .appendField( !^(blockly.FieldVariable.Create("{dictVariable}") :?> Blockly.Field), "VAR"  )
      .appendField( !^"[["  ) |> ignore          
    thisBlock.appendDummyInput()
      .appendField( !^"]]") |> ignore
    thisBlock.setInputsInline true
    thisBlock.setOutput true
    thisBlock.setColour !^230.0
    thisBlock.setTooltip !^"Gets an item from the variable at a given index. Not supported for all variables."
    thisBlock.setHelpUrl !^"https://cran.r-project.org/doc/manuals/R-lang.html#Indexing"
  ]
/// Generate R import code
blockly?R.[ "doubleIndexer_R" ] <- fun (block : Blockly.Block) -> 
  let varName = blockly?R?variableDB_?getName( block.getFieldValue("VAR").Value |> string, blockly?Variables?NAME_TYPE);
  let input = blockly?R?valueToCode( block, "INDEX", blockly?R?ORDER_ATOMIC )
  let code =  varName + "[[" + input + "]]" //+ "\n"
  [| code; blockly?R?ORDER_ATOMIC |]

/// A template for variable argument function block creation (where arguments are in a list), including the code generator.
let makeFunctionBlock_R (blockName:string) (label:string) (outputType:string) (tooltip:string) (helpurl:string) (functionStr:string) =
  blockly?Blocks.[blockName] <- createObj [
    "init" ==> fun () -> 
      Browser.Dom.console.log( blockName + " init")
      thisBlock.appendValueInput("x")
        .setCheck(!^None)
        .appendField(!^label) |> ignore
      thisBlock.setInputsInline(true)
      thisBlock.setOutput(true, !^outputType)
      thisBlock.setColour(!^230.0)
      thisBlock.setTooltip !^tooltip
      thisBlock.setHelpUrl !^helpurl
    ]
  /// Generate R template conversion code
  blockly?R.[blockName] <- fun (block : Blockly.Block) -> 
    // let x = blockly?R?valueToCode( block, "x", blockly?R?ORDER_ATOMIC )
    // let code =  functionStr + "(" + x + ")"
    let (args : string) = blockly?R?valueToCode(block, "x", blockly?R?ORDER_MEMBER) 
    let cleanArgs = System.Text.RegularExpressions.Regex.Replace(args,"^\[|\]$" , "")
    let code = functionStr + "(" +  cleanArgs + ")" 
    [| code; blockly?R?ORDER_FUNCTION_CALL |]

// ALREADY EXISTS
// sort: TODO only accept lists, setCheck("Array")
// makeSingleArgFunctionBlock 
//   "sortBlock"
//   "sort"
//   "Array"
//   "Sort a list."
//   "https://python-reference.readthedocs.io/en/latest/docs/list/sort.html"
//   "sort"

// reversed
makeFunctionBlock_R
  "reversedBlock_R"
  "reversed"
  "None"
  "Provides a reversed version of its argument."
  "https://stat.ethz.ch/R-manual/R-devel/library/base/html/rev.html"
  "rev"

// tuple //AO: Python tuple are mixed type, so the only equivalent in R is a 2 item list, making this redundant
// makeFunctionBlock_R 
//   "tupleConstructorBlock"
//   "tuple"
//   "None"
//   "Create a tuple from a list, e.g. ['a','b'] becomes ('a','b')"
//   "https://docs.python.org/3/library/stdtypes.html#tuple"
//   "tuple"

// dict
// makeFunctionBlock //AO: Also doesn't make sense in R, where dicts are implemented by lists
  // "dictBlock"
  // "dict"
  // "None"
  // "Create a dictionary from a list of tuples, e.g. [('a',1),('b',2)...]"
  // "https://docs.python.org/3/tutorial/datastructures.html#dictionaries"
  // "dict"

// zip
// makeFunctionBlock //AO: Also doesn't make sense in R, see above
//   "zipBlock"
//   "zip"
//   "Array"
//   "Zip together two or more lists"
//   "https://docs.python.org/3.3/library/functions.html#zip"
//   "zip"

// sorted //AO: I think this is redundant with basic blocks
// makeFunctionBlock_R
//   "sortedBlock"
//   "as sorted"
//   "Array"
//   "Sort lists of stuff"
//   "https://docs.python.org/3.3/library/functions.html#sorted"
//   "sorted"

// set //AO: base R has no set object, just set operations; converting this concept to unique elements of a list elsewhere
// makeFunctionBlock_R
//   "setBlock"
//   "set"
//   "Array"
//   "Get unique members of a list."
//   "https://docs.python.org/2/library/sets.html"
//   "set"

// Conversion blocks, e.g. str()
makeFunctionBlock_R
  "boolConversion_R"
  "as bool"
  "Boolean"
  "Convert something to Boolean."
  "https://stat.ethz.ch/R-manual/R-devel/library/base/html/logical.html"
  "as.logical"

makeFunctionBlock_R //AO: as.character is also possible here, but toString is more robust/flexible
  "strConversion_R"
  "as str"
  "String"
  "Convert something to String."
  "https://stat.ethz.ch/R-manual/R-patched/library/base/html/toString.html"
  "toString"

makeFunctionBlock_R
  "floatConversion_R"
  "as float"
  "Number"
  "Convert something to Float."
  "https://stat.ethz.ch/R-manual/R-devel/library/base/html/numeric.html"
  "as.numeric"

makeFunctionBlock_R
  "intConversion_R"
  "as int"
  "Number" 
  "Convert something to Int."
  "https://stat.ethz.ch/R-manual/R-devel/library/base/html/integer.html"
  "as.integer"

// Get user input, e.g. input() //AO: basic blocks already have readline; Python input was added because raw_input in basic blocks DNE for 3.x
// makeFunctionBlock
//   "getInput"
//   "input"
//   "String"
//   "Present the given prompt to the user and wait for their typed input response."
//   "https://docs.python.org/3/library/functions.html#input"
//   "input"

//AO: no tuple concept for R; see above
// Tuple block; TODO use mutator to make variable length
// blockly?Blocks.["tupleBlock"] <- createObj [
//   "init" ==> fun () ->
//     thisBlock.appendValueInput("FIRST")
//         .setCheck(!^None)
//         .appendField(!^"(") |> ignore
//     thisBlock.appendValueInput("SECOND")
//         .setCheck(!^None)
//         .appendField(!^",") |> ignore
//     thisBlock.appendDummyInput()
//         .appendField(!^")") |> ignore
//     thisBlock.setInputsInline(true);
//     thisBlock.setOutput(true, !^None);
//     thisBlock.setColour(!^230.0);
//     thisBlock.setTooltip(!^"Use this to create a two-element tuple");
//     thisBlock.setHelpUrl(!^"https://docs.python.org/3/tutorial/datastructures.html#tuples-and-sequences");
// ]

// /// Generate R for tuple
// blockly?R.["tupleBlock"] <- fun (block : Blockly.Block) -> 
//   let firstArg = blockly?R?valueToCode(block, "FIRST", blockly?R?ORDER_ATOMIC) 
//   let secondArg = blockly?R?valueToCode(block, "SECOND", blockly?R?ORDER_ATOMIC) 
//   let code = "(" +  firstArg + "," + secondArg + ")" 
//   [| code; blockly?R?ORDER_NONE |]

//Convert a list to a vector
blockly?Blocks.["unlistBlock_R"] <- createObj [
  "init" ==> fun () ->
    thisBlock.appendValueInput("LIST")
        .setCheck(!^"Array")
        .appendField(!^"vector") |> ignore
    thisBlock.setInputsInline(true);
    thisBlock.setOutput(true, !^"Array");
    thisBlock.setColour(!^230.0);
    thisBlock.setTooltip(!^"Use this to convert a list to a vector");
    thisBlock.setHelpUrl(!^"https://www.rdocumentation.org/packages/base/versions/3.6.2/topics/unlist");
]

/// Generate R for convert list to vector
blockly?R.["unlistBlock_R"] <- fun (block : Blockly.Block) -> 
  let (args : string) = blockly?R?valueToCode(block, "LIST", blockly?R?ORDER_MEMBER) 
  let code = "unlist(" + args + ", use.names = FALSE)" 
  [| code; blockly?R?ORDER_FUNCTION_CALL |]

// Unique elements of a list, conceptually replaces set for Python 
blockly?Blocks.["uniqueBlock_R"] <- createObj [
  "init" ==> fun () ->
    thisBlock.appendValueInput("LIST")
        .setCheck(!^"Array")
        .appendField(!^"unique") |> ignore
    thisBlock.setInputsInline(true);
    thisBlock.setOutput(true, !^"Array");
    thisBlock.setColour(!^230.0);
    thisBlock.setTooltip(!^"Use this to get the unique elements of a list");
    thisBlock.setHelpUrl(!^"https://stackoverflow.com/questions/3879522/finding-unique-values-from-a-list");
]

/// Generate R for unique
blockly?R.["uniqueBlock_R"] <- fun (block : Blockly.Block) -> 
  let (args : string) = blockly?R?valueToCode(block, "LIST", blockly?R?ORDER_MEMBER) 
  let code = "unique(unlist(" + args + ", use.names = FALSE))" 
  [| code; blockly?R?ORDER_FUNCTION_CALL |]

//==== EXPERIMENTAL MUTATOR SECTION ======================================
// Somewhat bizarrely, thes are not exported by @blockly/block-plus-minus, so we reference local copies
[<ImportMember("./field_plus.js")>]
let createPlusField( o: obj): Blockly.FieldImage = jsNative
[<ImportMember("./field_minus.js")>]
let createMinusField( o: obj): Blockly.FieldImage = jsNative
// bugfix so need own copy
[<ImportMember("./procedures.js")>]
let getDefNoReturn : obj = jsNative

/// A mutator for dynamic arguments. A block using this mutator must have a dummy called "EMPTY" and must register this mutator
let createDynamicArgumentMutator ( mutatorName : string) (startCount : int) (emptyLeadSlotLabel:string) (nonEmptyLeadSlotLabel:string) (additionalSlotLabel : string)= 
  let mutator = 
    createObj [
      "itemCount_" ==> 0
      "mutationToDom" ==> fun () ->
        let container = Blockly.utils?xml?createElement("mutation");
        container?setAttribute("items",thisBlock?itemCount_)
        container
      "domToMutation" ==>  fun(xmlElement ) ->
        let targetCount = System.Int32.Parse(xmlElement?getAttribute("items"))
        thisBlock?updateShape_(targetCount);
      "updateShape_" ==>  fun(targetCount) ->
        while unbox<int>(thisBlock?itemCount_) < targetCount do
          thisBlock?addPart_();
        while unbox<int>(thisBlock?itemCount_) > targetCount do
          thisBlock?removePart_();
        thisBlock?updateMinus_();
      "plus" ==>  fun() ->
        thisBlock?addPart_();
        thisBlock?updateMinus_();
      "minus" ==>  fun() ->
        if thisBlock?itemCount_ <> 0 then
          thisBlock?removePart_();
          thisBlock?updateMinus_();
      "addPart_" ==> fun() ->
        if thisBlock?itemCount_ = 0 then
          thisBlock.removeInput("EMPTY");
          thisBlock?topInput_ <- thisBlock.appendValueInput("ADD" + thisBlock?itemCount_)
              .appendField(U2.Case2(!!createPlusField() ), "PLUS")
              //label that goes where "create list with" normally goes
              .appendField(U2.Case1(nonEmptyLeadSlotLabel)) //|> ignore
              .setAlign(blockly.ALIGN_RIGHT) //e.g. gets "using" label closer to slot in question

        else
          thisBlock.appendValueInput("ADD" + thisBlock?itemCount_) //|> ignore
              //the next two lines affect the label that goes with every additional slot
              .appendField(U2.Case1(additionalSlotLabel))
              .setAlign(blockly.ALIGN_RIGHT) |> ignore
        thisBlock?itemCount_ <- thisBlock?itemCount_ + 1
      "removePart_" ==> fun() -> 
        thisBlock?itemCount_ <- thisBlock?itemCount_ - 1
        thisBlock?removeInput("ADD" + thisBlock?itemCount_);
        if thisBlock?itemCount_ = 0 then
          thisBlock?topInput_ <- thisBlock.appendDummyInput("EMPTY")
              .appendField(U2.Case2(!!createPlusField()), "PLUS")
              //label that goes where "create empty list" normally goes
              .appendField(U2.Case1(emptyLeadSlotLabel)) //|> ignore
      "updateMinus_" ==> fun() ->
        let minusField = thisBlock.getField("MINUS");
        if minusField = null && thisBlock?itemCount_ > 0 then
          thisBlock?topInput_?insertFieldAt(1, createMinusField(), "MINUS");
        elif minusField <> null && thisBlock?itemCount_ < 1 then
          thisBlock?topInput_?removeField("MINUS");
    ]
  let helper() = 
    thisBlock.getInput("EMPTY").insertFieldAt(0.0, U2.Case2(!!createPlusField()), "PLUS") |> ignore
    thisBlock?updateShape_(startCount) //|> ignore

  //register the mutator
  // let test = createPlusField()
  // test <> test |> ignore
  Blockly.extensions.registerMutator( mutatorName, !!mutator, !!helper)

// Create mutator-extended blocks
/// ORIGINAL APPROACH
/// Use list mutator like a mixin
/// Works but not compatible with plus/minus extension
/// Mixin approach doesn't work with plus/minus extension because that has too much list UI embedded in it
/// deep clone
[<Emit("Object.assign({}, $0)")>]
let clone (x: obj) : obj = jsNative

//TODO: REFACTOR PIPE AND GGPLOT WHEN HAND USABLE
// pipe ------------------------------------------------------------
/// deep clone list as a base, then modify init and updateShape
blockly?Blocks.["pipe_R"] <- clone( blockly?Blocks.["lists_create_with"] )

//check if we are using the plus/minus extension; if not, use non-mixin approach
if blockly?Extensions?ALL_?new_list_create_with_mutator = null then
  blockly?Blocks.["pipe_R"]?init <- fun () -> 
        // Browser.Dom.console.log( "pipe_R" + " init")
        let input = thisBlock.appendValueInput("INPUT") //else thisBlock.appendDummyInput("INPUT")
        input.appendField(!^"pipe") |> ignore
        // thisBlock.setInputsInline(true)
        thisBlock?itemCount_ <- 1;
        thisBlock?updateShape_()
        thisBlock.setOutput(true) //U3.Case1("Array"))
        
        thisBlock.setMutator( blockly.Mutator.Create( [|"lists_create_with_item"|] ) )
        thisBlock.setColour !^230.0
        thisBlock.setTooltip !^"A dplyr pipe, i.e. %>%"
        thisBlock.setHelpUrl !^""
  blockly?Blocks.["pipe_R"]?updateShape_ <- fun () -> 
        //remove empty label if list nonempty
        if thisBlock?itemCount_ > 0 && thisBlock.getInput("EMPTY") <> null then
          thisBlock.removeInput("EMPTY")
        //add empty label if list empty
        elif thisBlock?itemCount_ = 0 && thisBlock.getInput("EMPTY") = null then
          thisBlock.appendDummyInput("EMPTY")
            .appendField(U2.Case1("add a destination")) |> ignore

        //add inputs for each item in list
        let mutable index = 0
        for i = 0 to thisBlock?itemCount_ - 1 do 
          index <- i
          if thisBlock.getInput("ADD" + string(i)) = null then
            thisBlock.appendValueInput("ADD" + string(i))
              .appendField(U2.Case1("to"))
              .setAlign(blockly.ALIGN_RIGHT) |> ignore
        index <- index + 1

        //remove deleted inputs
        while thisBlock.getInput("ADD" + string(index)) <> null do
          thisBlock.removeInput("ADD" + string(index))
          index <- index + 1
else
  //NEW APPROACH - uses the plus/minus based mutator
  //Use a mixin-compatible init
  createDynamicArgumentMutator "pipeMutator" 1 "add pipe output" "to" "then to"
  blockly?Blocks.["pipe_R"]?init <- fun () -> 
      // Browser.Dom.console.log( "pipe_R" + " init")
      let input = thisBlock.appendValueInput("INPUT") 
      input.appendField(!^"pipe") |> ignore
      let empty = thisBlock.appendDummyInput("EMPTY")

      thisBlock.setOutput(true) //U3.Case1("Array"))
      blockly?Extensions?apply("pipeMutator",thisBlock,true)

      thisBlock.setColour !^230.0
      thisBlock.setTooltip !^"A dplyr pipe, i.e. %>%"
      thisBlock.setHelpUrl !^""



/// Generate R template conversion code
blockly?R.["pipe_R"] <- fun (block : Blockly.Block) -> 
  let elements : string[] = 
    [|
      for i = 0 to block?itemCount_ - 1 do
        yield  blockly?R?valueToCode(block, "ADD" + string(i), blockly?R?ORDER_COMMA)
    |]
  let input =  blockly?R?valueToCode(block, "INPUT", blockly?R?ORDER_MEMBER)
  let code = input + " %>%\n    " + (String.concat " %>%\n    " elements)
  [| code; blockly?R?ORDER_FUNCTION_CALL |]

// ggplot plus  ------------------------------------------------------------
/// deep clone list as a base, then modify init and updateShape
blockly?Blocks.["ggplot_plus_R"] <- clone( blockly?Blocks.["lists_create_with"] )

//check if we are using the plus/minus extension; if not, use non-mixin approach
if blockly?Extensions?ALL_?new_list_create_with_mutator = null then
  blockly?Blocks.["ggplot_plus_R"]?init <- fun () -> 
        // Browser.Dom.console.log( "ggplot_plus_R" + " init")
        let input = thisBlock.appendValueInput("INPUT") //else thisBlock.appendDummyInput("INPUT")
        input.appendField(!^"make plot") |> ignore
        // thisBlock.setInputsInline(true)
        thisBlock?itemCount_ <- 1;
        thisBlock?updateShape_()
        thisBlock.setOutput(true) //U3.Case1("Array"))
        
        thisBlock.setMutator( blockly.Mutator.Create( [|"lists_create_with_item"|] ) )
        thisBlock.setColour !^230.0
        thisBlock.setTooltip !^"A ggplot"
        thisBlock.setHelpUrl !^""
  blockly?Blocks.["ggplot_plus_R"]?updateShape_ <- fun () -> 
        //remove empty label if list nonempty
        if thisBlock?itemCount_ > 0 && thisBlock.getInput("EMPTY") <> null then
          thisBlock.removeInput("EMPTY")
        //add empty label if list empty
        elif thisBlock?itemCount_ = 0 && thisBlock.getInput("EMPTY") = null then
          thisBlock.appendDummyInput("EMPTY")
            .appendField(U2.Case1("add plot element")) |> ignore

        //add inputs for each item in list
        let mutable index = 0
        for i = 0 to thisBlock?itemCount_ - 1 do 
          index <- i
          if thisBlock.getInput("ADD" + string(i)) = null then
            thisBlock.appendValueInput("ADD" + string(i))
              .appendField(U2.Case1("with"))
              .setAlign(blockly.ALIGN_RIGHT) |> ignore
        index <- index + 1

        //remove deleted inputs
        while thisBlock.getInput("ADD" + string(index)) <> null do
          thisBlock.removeInput("ADD" + string(index))
          index <- index + 1
else
  //NEW APPROACH - uses the plus/minus based mutator
  //Use a mixin-compatible init
  createDynamicArgumentMutator "plusMutator" 1 "add plot element" "with" "and with"
  blockly?Blocks.["ggplot_plus_R"]?init <- fun () -> 
      // Browser.Dom.console.log( "ggplot_plus_R" + " init")
      let input = thisBlock.appendValueInput("INPUT") 
      input.appendField(!^"make plot") |> ignore
      let empty = thisBlock.appendDummyInput("EMPTY")

      thisBlock.setOutput(true) //U3.Case1("Array"))
      blockly?Extensions?apply("plusMutator",thisBlock,true)

      thisBlock.setColour !^230.0
      thisBlock.setTooltip !^"A ggplot"
      thisBlock.setHelpUrl !^""



/// Generate R template conversion code
blockly?R.["ggplot_plus_R"] <- fun (block : Blockly.Block) -> 
  let elements : string[] = 
    [|
      for i = 0 to block?itemCount_ - 1 do
        yield  blockly?R?valueToCode(block, "ADD" + string(i), blockly?R?ORDER_COMMA)
    |]
  let input =  blockly?R?valueToCode(block, "INPUT", blockly?R?ORDER_MEMBER)
  let code = input + " +\n    " + (String.concat " +\n    " elements)
  [| code; blockly?R?ORDER_FUNCTION_CALL |]

//TODO: 
// ? OPTION FOR BOTH POSITION ONLY (PASS IN LIST OF ARGS) AND KEYWORD ARGUMENTS (PASS IN DICTIONARY)
// generalized incr
// Dictionary
// list append, list range

open Thoth.Json 

//Fable 2 transition 
let inline toJson x = Encode.Auto.toString(4, x)
let inline ofJson<'T> json = Decode.Auto.unsafeFromString<'T>(json)

/// An entry for a single name (var/function/whatever)
type IntellisenseEntry =
  {
    Name : string //from user if parent and completion if child
    Info : string //from inspection
    isFunction : bool //from inspection
    isClass : bool //from inspection
  }
// An entry for a complex name, e.g. object, that has associated properties and/or methods
type IntellisenseVariable =
  {
    VariableEntry : IntellisenseEntry
    ChildEntries : IntellisenseEntry[]
  }

module IntellisenseEntry =

    let encoder (i : IntellisenseEntry) =
        Encode.object [
            "Name", Encode.string i.Name
            "Info", Encode.string i.Info
            "isFunction", Encode.bool i.isFunction
            "isClass", Encode.bool i.isClass
        ]

    let decoder : Decoder<IntellisenseEntry> =
        Decode.object (fun get ->
            {
                Name = get.Required.Field "Name" Decode.string
                Info = get.Required.Field "Info" Decode.string
                isFunction = get.Required.Field "isFunction" Decode.bool
                isClass = get.Required.Field "isClass" Decode.bool
            }
        )

module IntellisenseVariable =

    let encoder (i : IntellisenseVariable) =
        Encode.object [
            "VariableEntry", i.VariableEntry |> IntellisenseEntry.encoder
            "ChildEntries", i.ChildEntries |> Array.map IntellisenseEntry.encoder |> Encode.array
        ]

    let decoder : Decoder<IntellisenseVariable> =
        Decode.object (fun get ->
            {
                VariableEntry = get.Required.Field "VariableEntry" IntellisenseEntry.decoder
                ChildEntries = get.Required.Field "ChildEntries" (Decode.array IntellisenseEntry.decoder) 
            }
        )


/// Dependencies injected from JupyterLab. 
/// Needed to send intellisense requests to the kernel
let mutable ( notebooks : JupyterlabNotebook.Tokens.INotebookTracker ) = null

let GetKernel() =
  if notebooks <> null then
    match notebooks.currentWidget with
    | Some(widget) -> 
      match widget.session.kernel with
      | Some(kernel) -> Some(widget,kernel)
      | None -> None
    | None -> None
  else
    None

/// Get a completion (tab+tab) using the kernel. Typically this will be following a "." but it could also be to match a known identifier against a few initial letters.
let GetKernelCompletion( queryString : string ) =
  // Browser.Dom.console.log("Requesting completion for: " + queryString)
  match GetKernel() with
  | Some(_, kernel) -> 
    promise {
      try
        let! reply = kernel.requestComplete( !!{| code = queryString; cursor_pos = queryString.Length |} )
        let content: ICompleteReply = unbox reply.content
        return content.matches.ToArray()
      with _ -> return [| queryString + " is unavailable" |]
    }
  | None -> Promise.reject "no kernel" // () //Promise.lift( [||])


///Timeout mojo for kernel inspections
[<Emit("Promise.race($0)")>]
let race (pr: seq<JS.Promise<'T>>): JS.Promise<'T> = jsNative
//perhaps b/c of promise.all, this doesn't work; just waits until timeout triggers and then fails
let requestInspectTimeout( queryString : string) = Promise.create(fun ok er ->
            JS.setTimeout (fun () -> er( failwith ("timeout:" + queryString ) )) 100 (* ms *) |> ignore
        )
/// Get an inspection (shift+tab) using the kernel. AFAIK this only works after a complete known identifier.
/// In R, this *does not* work for package names - they show as not existing
let GetKernalInspection( queryString : string ) =
  // Browser.Dom.console.log("Requesting inspection for: " + queryString)
  // if queryString = "dataframe.style" then
  //   Browser.Dom.console.log("stop")
  match GetKernel() with 
  | Some( widget, kernel ) ->
    promise {
      try 
        let! reply =
          //timeouts work but are problematic b/c we never know how long to make them
          // race([
          //   kernel.requestInspect( !!{| code = queryString; cursor_pos = queryString.Length; detail_level = 0 |} ); 
          //   Promise.sleep(10000) |> Promise.bind( fun () -> //was 5000 but numpy was possibly timing out, so extended to 10000; that still timed out when there were many blocks in a single cell
          //     promise{ 
          //       let msg : IInspectReplyMsg = 
          //         createObj [
          //           "content" ==> createObj [
          //                 "status" ==> "error"
          //                 "metadata" ==> null
          //                 "found" ==> false
          //                 "data" ==> null //TODO put exception payload here?
          //             ]           
          //         ] |> unbox
          //       return msg 
          //     } 
          //   )
          //   // doesn't currently work, but might be made to work as alternative to the above
          //   // requestInspectTimeout( queryString )
          // ])
          //This doesn't work becasue "style" doesn't fail - it just never resolves; https://github.com/fable-compiler/fable-promise/blob/master/tests/PromiseTests.fs
          kernel.requestInspect( !!{| code = queryString; cursor_pos = queryString.Length; detail_level = 0 |} ) 
          // |> Promise.catchBind( fun ex -> 
          //   promise{ 
          //     let msg : IInspectReplyMsg = 
          //       createObj [
          //         "content" ==> createObj [
          //               "status" ==> "error"
          //               "metadata" ==> null
          //               "found" ==> false
          //               "data" ==> null //TODO put exception payload here?
          //           ]
          //         // "channel" ==> "shell"
          //         // "header" ==> createObj [
          //         //       "date" ==> "foo"
          //         //       "version" ==> "1"
          //         //       "session" ==> "1"
          //         //       "msg_id" ==> "1"
          //         //       "msg_type" ==> "inspect_reply"
          //         //       "username" ==> "foo"
          //         //   ]
          //         // "parent_header" ==> createObj [
          //         //       "date" ==> "foo"
          //         //       "version" ==> "1"
          //         //       "session" ==> "1"
          //         //       "msg_id" ==> "1"
          //         //       "msg_type" ==> "inspect_request"
          //         //       "username" ==> "foo"
          //         //   ]
          //         // "metadata" ==> null
          //       ] |> unbox
          //     return msg 
          //     } 
          //   ) 

        //formatting the reply is involved because it has some kind of funky ascii encoding
        let content: IInspectReply = unbox reply.content
        // if queryString = "dataframe.style" then
        //   Browser.Dom.console.log("stop")
        if content.found then
          let mimeType = widget.content.rendermime.preferredMimeType( unbox content.data);
          let renderer = widget.content.rendermime.createRenderer( mimeType.Value )
          let payload : PhosphorCoreutils.ReadonlyJSONObject = !!content.data
          let model= JupyterlabRendermime.Mimemodel.Types.MimeModel.Create( !!{| data = Some(payload)  |} )
          let! _ = renderer.renderModel(model) 
          // Browser.Dom.console.log(queryString + ":found" )
          return renderer.node.innerText
        else
          Browser.Dom.console.log(queryString + ":UNDEFINED" )
          return "UNDEFINED" //we check for this case below
      with _ ->  
        Browser.Dom.console.log(queryString + ":UNAVAILABLE" )
        return queryString + " is unavailable" //better way to handle exceptions?
    }
  | None -> 
    Browser.Dom.console.log("NOKERNEL" )
    Promise.reject "no kernel"  //()

/// Store results of resolved promises so that future synchronous calls can access. Keyed on variable name
let mutable intellisenseLookup = new System.Collections.Generic.Dictionary<string,IntellisenseVariable>()

/// Get object from Jupyter statedb and use to populate runtime intellisense cache
/// Since the statedb can store a pojo, we store that to make storage as cheap as possible
/// On load, we convert the pojo back to json to use the Thoth deserializer and get an F# object
let RestoreIntellisenseCacheFromStateDB ( pojo : obj ) = 
  let result = 
    pojo
    |> Encode.toString 0 //bounce the pojo through json so we can use Thoth to deserialize to F# object
    |> Decode.fromString (Decode.keyValuePairs IntellisenseVariable.decoder) 
    |> Result.map (fun namePersonList ->
          namePersonList
          |> dict
          |> System.Collections.Generic.Dictionary)
  match result with
  | Ok(cache) -> intellisenseLookup <- cache
  | Error(e) -> Browser.Dom.console.log("Failed to restore intellisense cache from json state. Specific error is " + e )

/// Get json from runtime intellisense cache. 
let IntellisenseCacheToJson() = 
  intellisenseLookup
  |> Seq.map( fun (KeyValue(k,v)) -> k, v |> IntellisenseVariable.encoder )
  |> Map.ofSeq
  |> Encode.dict
  // |> Encode.toString 0 //we can leave this line off and just create a POJO that JupyterLab can store in statedb


// V2 of the intellisenseLookup with 2 stores: one that maps var names to docstrings, and one that maps docstrings to results of promise. Idea is that the docstring/result mapping is fairly static and will not change with var's type or renaming
//(NOTE: V2 MAY NOT BE FLAKEY, MAY HAVE FORGOTTEN TO CALL nltk.data.path.append("/y/nltk_data"))
// let docIntellisenseMap = new System.Collections.Generic.Dictionary<string,IntellisenseVariable>()
// let nameDocMap = new System.Collections.Generic.Dictionary<string,string>()

/// Determine if an entry is a function. We have separate blocks for properties and functions because only function blocks need parameters
/// This is a bit weird for R; not sure about standardization of this information
/// We need some special handling for cases like dplyr %>%, which is surrounded in backticks
let isFunction_R (query : string) ( info : string )  = 
  // Using UNDEFINED doesn't work because the package/parent is itself undefined and causes the blocks to fail if we call the parent a function
  // if info = "UNDEFINED" || info = "" then 
  // %>% is enclosed in backticks
  if query.StartsWith("`") then
    true
  else
    info.Contains("Class attribute:\n'function'") || (info.Contains("Usage") && info.Contains("Arguments"))

// BELOW IS WORKING
// let isFunction_R( info : string ) = info.Contains("Class attribute:\n'function'") || (info.Contains("Usage") && info.Contains("Arguments"))

/// Determine if an entry is a class. 
/// Again weird for R; making it the inverse of function
let isClass_R( info : string ) =  info |> isFunction_R "" |> not

/// Request an IntellisenseVariable. If the type does not descend from object, the children will be empty.
/// Sometimes we will create a variable but it will have no type until we make an assignment. 
/// We might also create a variable and then change its type.
/// So we need to check for introspections/completions repeatedly (no caching right now).
let RequestIntellisenseVariable_R(block : Blockly.Block) ( parentName : string ) =
  // if not <| intellisenseLookup.ContainsKey( name ) then //No caching; see above
  // Update the intellisenseLookup asynchronously. First do an info lookup. If var is not an instance type, continue to doing tooltip lookup
  promise {
    try
      //This does not work for R package names, only variables
      let! parentInspection = GetKernalInspection( parentName )
      let parent = { Name=parentName;  Info=parentInspection; isFunction=isFunction_R parentName parentInspection; isClass=isClass_R(parentInspection) }
      // V2 store the name/docstring pair. This is always overwritten(*Updating*).
      // if not <| nameDocMap.ContainsKey( parentName ) then nameDocMap.Add(parentName,parentInspection) else nameDocMap.[parentName] <- parentInspection

      // V2 only search for completions if the docstring has not previously been stored
      // if not <| docIntellisenseMap.ContainsKey( parentInspection ) then
        // promise {  //if promise ce absent here, then preceding conditional is not transpiled   

      // V3 only update completions if cached parent type has changed or has no children OR if there is nothing in the cache.
      let shouldGetChildren =
        match intellisenseLookup.TryGetValue(parent.Name) with
        // 12/22/22:  if no children, ChildEntries.Length = 1 and the child is "UNDEFINED"
        | true, cached -> if cached.VariableEntry.Info <> parent.Info || cached.ChildEntries.Length <= 1 then true else false
        | false, _ -> true
          
      // Use $ and :: for completions and otherwise adjust Python specific concepts to R
      // Code below is basically the same as Python except for small changes:
      // - remove special case for dataframe
      // - support multiple symbols for intellisense completion (Python is only dot)
      // - child inspection ?no longer? requires inserting the symbol between the parent and completion; the completion includes the parent/symbol prefix
      if shouldGetChildren then
        // let! completions = GetKernelCompletion( parentName + "." )  //all completions that follow "name."
        let! packageCompletions = GetKernelCompletion( parentName + "::" )  //all completions that follow "name."
        // NOTE: removing $ completions because we currently don't handle dynamic updates, and that is the primary use case for $
        // let! nameCompletions = GetKernelCompletion( parentName + "$" )  //all completions that follow "name."

        // let safeCompletions = Array.append packageCompletions  nameCompletions
        let safeCompletions = packageCompletions

        // below seems unnecessary b/c symbol is stored in completion
        // let completionSymbols = Array.append (Array.create (packageCompletions.Length) "::") (Array.create (nameCompletions.Length) "$")
        // let safeCompletions = Array.zip completions completionSymbols

        //dataframe kludge; TODO not sure why this is necessary
        //if dataframe, filter members leading with _ ; else filter nothing
        // let safeCompletions =
        //   completions
        //   //|> Array.truncate 169 //100 works, 150 works, 168 (std) works, 169 (style) fails --> no GUI intellisense either, 170 fails, 172 fails, 174 fails, 175 (T) fails, 200 fails
        //   |> Array.filter( fun s -> 
        //     if parent.Info.StartsWith("Signature: DataFrame") then
        //       not <| s.StartsWith("_") &&  not <| s.StartsWith("style") //TODO: kludge for dataframe.style since race above doesn't always work
        //     else
        //       true
        //       )      
        
        //Fails the same way 6/11/20
        // let completionPromises = new ResizeArray<JS.Promise<string>>()
        // for completion in safeCompletions do 
        //   completionPromises.Add( GetKernalInspection(parentName + "." + completion) )

        let! inspections = 
          // if not <| parent.isInstance then //No caching; see above
          //Fails the same way 6/11/20
          // completionPromises |> Promise.Parallel

          //Suddenly started failing 6/11/20
          safeCompletions
          //For R, completion includes parent and following symbolc
          //for Python was (parentName + "." + completion)
          |> Array.map( fun completion ->  GetKernalInspection(completion) ) 
          |> Promise.Parallel

          //Fails the same way 6/11/20
          // [| 
          //   for completion in safeCompletions do 
          //     yield GetKernalInspection(parentName + "." + completion)  
          // |] |> Promise.all
          
          // else
          //   Promise.lift [||] //No caching; see above
        let children = 
            Array.zip safeCompletions inspections 
            |> Array.map( fun (completion,inspection) -> 
              //R only: remove parent name and symbol from completion (so it doesn't show in intelliblock dropdown)
              let childName = completion.Replace(parentName + "::","")
              //We can't remove backticks if we prefix calls with the package name
              // let safeName = childName.Replace("`","")
              {Name=childName; Info=inspection; isFunction=isFunction_R childName inspection; isClass=isClass_R(inspection) }
            ) 
            |> Array.sortBy( fun c -> c.Name )
        let intellisenseVariable = { VariableEntry=parent; ChildEntries=children}
        // Store so we can synchronously find results later; if we have seen this var before, overwrite.
        if intellisenseLookup.ContainsKey( parentName ) then
          intellisenseLookup.[parentName] <- intellisenseVariable
        else
          intellisenseLookup.Add( parentName, intellisenseVariable)

        // V2 - never overwritten
        // if not <| docIntellisenseMap.ContainsKey( parentInspection ) then
        // docIntellisenseMap.Add( parentInspection, intellisenseVariable)
          // } |> Promise.start
      else
        Browser.Dom.console.log("Not refreshing intellisense for " + parent.Name)

    //Call update event (sometimes fails for unknown reasons)
    // try 
      let intellisenseUpdateEvent = Blockly.events.Change.Create(block, "field", "VAR", 0, 1) 
      intellisenseUpdateEvent.group <- "INTELLISENSE"
      Browser.Dom.console.log( "event status is " + Blockly.events?disabled_ )
      Blockly.events?disabled_ <- 0 //not sure if this is needed, but sometimes events are not firing?
      Blockly.events.fire( intellisenseUpdateEvent :?> Blockly.Events.Abstract )
    with
    | e ->  Browser.Dom.console.log( "Intellisense event failed to fire; " + e.Message )
    } |> Promise.start

// let GetIntellisenseVariable( name : string ) = 
//   // Now do the lookups here. We expect to fail on first call because the promise has not resolved. We may also lag "truth" if variable type changes.
//   match intellisenseLookup.TryGetValue(name) with
//   | true, ie -> Some(ie)
//   | false,_ -> None
  //FLAKEY CACHING METHOD FOLLOWS (NOTE: MAY NOT BE FLAKEY, MAY HAVE FORGOTTEN TO CALL nltk.data.path.append("/y/nltk_data"))
  // match nameDocMap.TryGetValue(parentName) with
  // | true, doc -> 
  //   match docIntellisenseMap.TryGetValue(doc) with
  //   | true, intellisenseVariable -> Some(intellisenseVariable)
  //   | false, _ -> None
  // | false,_ -> None

//We need to get the var name in order to call the kernel to generate the list. Every time the variable changes, we should update the list
// For now, ignore performance. NOTE can we use an event to retrigger init once the promise completes?
// NOTE: this works but only on the last var created. It does not fire when the var dropdown changes
// let optionsGenerator( block : Blockly.Block ) =
//   // At this stage the VAR field is not associated with the variable name presented to the user, e.g. "x"
//   //We can get a list of variables by accessing the workspace. The last variable created is the last element in the list returned.
//   let lastVar = block.workspace.getAllVariables() |> Seq.last
let requestAndStubOptions_R (block : Blockly.Block) ( varName : string ) =
  if varName <> "" && not <| block.isInFlyout then //flyout restriction prevents triple requests for intellisense blocks in flyout
    //initiate an intellisense request asynchronously
    varName |> RequestIntellisenseVariable_R block
  //return an option stub while we wait
  if block.isInFlyout then
    [| [| " "; " " |] |]
  elif varName <> "" && varName |> intellisenseLookup.ContainsKey then
      [| [| "!Waiting for kernel to respond with options."; "!Waiting for kernel to respond with options." |] |]
  else
    [| [| "!Not defined until you execute code."; "!Not defined until you execute code." |] |]

let getIntellisenseMemberOptions(memberSelectionFunction : IntellisenseEntry -> bool) ( varName : string ) =
  match  varName |> intellisenseLookup.TryGetValue with
  //12/22/22: having a problem with the `tune` package which contains function `tune`, so no children of package tune are being listed.
  //Trying to solve by removing the not is function restriction
  //We could possibly tweak intellisense for R by using help(package="tune") to query
  // | true, iv when not(iv.VariableEntry.isFunction) && iv.ChildEntries.Length > 0  -> 
  | true, iv when iv.ChildEntries.Length > 0  -> 
      //NOTE: for dropdowns, blockly returns the label, e.g. "VAR", not the value displayed to the user. Making them identical allows us to get the value displayed to user
      iv.ChildEntries |> Array.filter memberSelectionFunction |> Array.map( fun ie -> [| ie.Name; ie.Name |] )
  | false, _ ->  [| [| "!Not defined until you execute code."; "!Not defined until you execute code." |] |]
  | true, iv when iv.VariableEntry.Info = "UNDEFINED" ->  [| [| "!Not defined until you execute code."; "!Not defined until you execute code." |] |]
  | _ -> [| [| "!No properties available."; "!No properties available." |] |]

let getIntellisenseVarTooltip( varName : string ) =
  match  varName |> intellisenseLookup.TryGetValue with
  | true, iv -> 
    iv.VariableEntry.Info
  | false, _ -> "!Not defined until you execute code."

let getIntellisenseMemberTooltip( varName : string ) (memberName : string )=
  match  varName |> intellisenseLookup.TryGetValue with
  | true, iv -> 
    match iv.ChildEntries |> Array.tryFind( fun c -> c.Name = memberName ) with
    | Some(child) -> child.Info
    | None -> "!Not defined until you execute code."
  | false, _ -> "!Not defined until you execute code."

/// Update all the blocks that use intellisense. Called after the kernel executes a cell so our intellisense in Blockly is updated.
let UpdateAllIntellisense_R() =
  let workspace = blockly.getMainWorkspace()
  let blocks = workspace.getBlocksByType("varGetProperty_R", false)
  blocks.AddRange( workspace.getBlocksByType("varDoMethod_R", false) )
  for b in blocks do
    b?updateIntellisense(b,None, requestAndStubOptions_R b) 

/// Remove a field from an input safely, even if it doesn't exist
let SafeRemoveField( block:Blockly.Block ) ( fieldName : string ) ( inputName : string )=
  match block.getField(fieldName), block.getInput(inputName) with
  | null, _ -> ()  //field doesnt exist, no op
  | _, null ->  Browser.Dom.console.log( "error removing (" + fieldName + ") from block; input (" + inputName + ") does not exist" )
  | _,input -> input.removeField( fieldName )

/// Remove an input safely, even if it doesn't exist
let SafeRemoveInput( block:Blockly.Block ) ( inputName : string )=
  match block.getInput(inputName) with
  | null -> ()  //input doesnt exist, no op
  | input -> block.removeInput(inputName)


// Dynamic argument mutator for intelliblocks
createDynamicArgumentMutator "intelliblockMutator" 1 "add argument" "using" "and"

// Search dropdown constructor
[<Emit("new CustomFields.FieldFilter($0, $1, $2)")>] //CustomFields.FieldFilter('', options, this.validate);
let createSearchDropdown( initialString : string, options : string[], validateFun : System.Func<string,obj> ): Blockly.Field = jsNative

// TODO: MAKE BLOCK THAT ALLOWS USER TO MAKE AN ASSIGNMENT TO A PROPERTY (SETTER)
// TODO: CHANGE OUTPUT CONNECTOR DEPENDING ON INTELLISENSE: IF FUNCTION DOESN'T HAVE AN OUTPUT, REMOVE CONNECTOR
/// Make a block that has an intellisense-populated member dropdown. The member type is property or method, defined by the filter function
/// Note the "blockName" given to these is hardcoded elsewhere, e.g. the toolbox and intellisense update functions
let makeMemberIntellisenseBlock_R (blockName:string) (preposition:string) (verb:string) (memberSelectionFunction: IntellisenseEntry -> bool ) ( hasArgs : bool ) ( hasDot : bool )= 
  blockly?Blocks.[blockName] <- createObj [

    //Get the user-facing name of the selected variable; on creation, defaults to created name
    "varSelectionUserName" ==> fun (thisBlockClosure : Blockly.Block) (selectedOption : string option)  ->
      let fieldVariable = thisBlockClosure.getField("VAR") :?> Blockly.FieldVariable
      // let variableModel = fieldVariable.getVariable() //for test purposes -- null when not defined, similar to getText()
      // let b = Blockly.variables.getVariable(thisBlockClosure.workspace, fieldVariable.getValue() ) //for test purposes -- null when not defined, similar to getText()
      // let v = thisBlockClosure.workspace.getAllVariables() //returns all variables, but we don't know which is ours
      // fieldVariable.initModel() // kind of accesses user-selected variable name but also creates a variable with the default name
      
      //Get the last var created. Insane but works because by default, the flyout specifically lists this var in the block. User then expects to change if needed
      let lastVar = thisBlockClosure.workspace.getAllVariables() |> Seq.last 

      //Attempt to get XML serialized data
      let dataString = (thisBlockClosure?data |> string)
      let data = if dataString.Contains(":") then dataString.Split(':') else [| "" |] //var:member data

      let selectionUserName =
        match selectedOption with 
        | Some( option ) -> fieldVariable.getOptions() |> Seq.find( fun o -> o.[1] = option ) |> Seq.head
        // | None -> fieldVariable.getText() //on creation is empty string 
        | None ->
          match fieldVariable.getText(), data.[0], lastVar.name with
          | "","", l ->  l  //Previously we returned empty ""; now as a last resort we return the last var created
          | "",v,_-> v      //prefer XML data over last var when XML data exists
          | t, _,_ -> t     //prefer current var name over all others when it exists
      selectionUserName

    //back up the current member selection so it is not lost every time a cell is run
    "selectedMember" ==> ""

    //Use 'data' string to back up custom data; it is serialized to XML
    // "data" ==> ":" //We can't define this or it overwrites what is deserialized

    //Using currently selected var, update intellisense
    "updateIntellisense" ==> fun (thisBlockClosure : Blockly.Block) (selectedVarOption : string option) (optionsFunction : string -> string[][]) ->
      let input = thisBlockClosure.getInput("INPUT")
      SafeRemoveField thisBlockClosure "MEMBER" "INPUT"
      SafeRemoveField thisBlockClosure "USING" "INPUT"
      let varUserName = thisBlockClosure?varSelectionUserName(thisBlockClosure,selectedVarOption)
      let options = varUserName |> optionsFunction 

      // --------------------------------------------------------------------
      // // Pre-search approach: newMemberSelection is text, e.g. "read.csv"
      // //use intellisense to populate the member options, also use validator so that when we select a new member from the dropdown, tooltip is updated
      // input.appendField( !^(blockly.FieldDropdown.Create( options, System.Func<string,obj>( fun newMemberSelection ->
      //   // Within validator, "this" refers to FieldVariable not block.
      //   let (thisFieldDropdown : Blockly.FieldDropdown) = !!thisObj
      //   thisFieldDropdown.setTooltip( !^( getIntellisenseMemberTooltip varUserName newMemberSelection ) )
      //   //back up the current member selection so it is not lost every time a cell is run; ignore status selections that start with !
      //   thisBlockClosure?selectedMember <- 
      //     match newMemberSelection.StartsWith("!"),thisBlock?selectedMember with
      //     | _, "" -> newMemberSelection 
      //     | true, _ -> thisBlock?selectedMember
      //     | false,_ -> newMemberSelection

      //   //back up to XML data if valid
      //   if varUserName <> "" then
      //     thisBlockClosure?data <- varUserName + ":" + thisBlockClosure?selectedMember //only set data when at least var name is known

      //   //Since we are leveraging the validator, we return the selected value without modification
      //   newMemberSelection |> unbox)
      // ) :> Blockly.Field), "MEMBER"  ) |> ignore 

      // ---------------------------------------------------------------------------
      // Search approach : newMemberSelection is number/index into list of options
      // ---------------------------------------------------------------------------
      // Remove extra data from options
      let flatOptions = options |> Array.map( fun arr -> arr.[0])
      //use intellisense to populate the member options, also use validator so that when we select a new member from the dropdown, tooltip is updated
      // Restore stored value from XML if it exists
      let defaultSelection = 
        let dataString = (thisBlockClosure?data |> string)
        if dataString.Contains(":") then dataString.Split(':').[1] else ""

      input.appendField( !^createSearchDropdown(defaultSelection, flatOptions,System.Func<string,obj>( fun newMemberSelectionIndex ->
        // Within validator, "this" refers to FieldVariable not block.
        let (thisSearchDropdown : Blockly.FieldTextInput) = !!thisObj
        // NOTE: newMemberSelectionIndex is an index into WORDS not INITWORDS
        // this is weird: the type of newMemberSelectionIndex seems to switch from string to int...
        let newMemberSelection = 
          if newMemberSelectionIndex = "" then 
            defaultSelection
          else
            unbox<string[]>(thisSearchDropdown?WORDS).[!!newMemberSelectionIndex] 
        thisSearchDropdown.setTooltip( !^( getIntellisenseMemberTooltip varUserName newMemberSelection ) )
        //back up the current member selection so it is not lost every time a cell is run; ignore status selections that start with !
        thisBlockClosure?selectedMember <- 
          match newMemberSelection.StartsWith("!"),thisBlock?selectedMember with
          | _, "" -> newMemberSelection 
          | true, _ -> thisBlock?selectedMember
          | false,_ -> newMemberSelection

        //back up to XML data if valid
        if varUserName <> "" then
          thisBlockClosure?data <- varUserName + ":" + thisBlockClosure?selectedMember //only set data when at least var name is known

        //Since we are leveraging the validator, we return the selected value without modification
        newMemberSelection |> unbox)
      ), "MEMBER"  ) |> ignore 
      // end search approach

      //back up to XML data if valide; when the deserialized XML contains data, we should never overwrite it here
      if thisBlockClosure?data = null then
        thisBlockClosure?data <- varUserName + ":" + thisBlockClosure?selectedMember 

      //set up the initial member tooltip
      let memberField = thisBlockClosure.getField("MEMBER")
      memberField.setTooltip( !^( getIntellisenseMemberTooltip varUserName (memberField.getText()) ) )

      //add more fields if arguments are needed. Current strategy is to make those their own block rather than adding mutators to this block
      // if hasArgs then
      //     input.appendField(!^"using", "USING") |> ignore
      //     thisBlockClosure.setInputsInline(true);


    "init" ==> fun () -> 
      Browser.Dom.console.log( blockName + " init")

      //If we need to pass "this" into a closure, we rename to work around shadowing
      let thisBlockClosure = thisBlock

      // original (non-mutator) approach
      // let input = if hasArgs then thisBlock.appendValueInput("INPUT") else thisBlock.appendDummyInput("INPUT")
      // mutator approach
      let input = thisBlock.appendDummyInput("INPUT")
      input
        .appendField(!^preposition)

        //Use the validator called on variable selection to change the member dropdown so that we get correct members when variable changes
        .appendField( !^(blockly.FieldVariable.Create("variable name", System.Func<string,obj>( fun newSelection ->
          // Within validator, "this" refers to FieldVariable not block.
          let (thisFieldVariable : Blockly.FieldVariable) = !!thisObj
          // update the options FieldDropdown by recreating it with the newly selected variable name
          thisBlockClosure?updateIntellisense( thisBlockClosure, Some(newSelection), requestAndStubOptions_R thisBlockClosure  )
          //Since we are leveraging the validator, we return the selected value without modification
          newSelection |> unbox)
        ) :?> Blockly.Field), "VAR"  )

        .appendField( !^verb) |> ignore
        
        // Create the options FieldDropdown using "optionsGenerator" with the selected name, currently None
        // .appendField( !^(blockly.FieldDropdown.Create( thisBlock?varSelectionUserName(thisBlockClosure, None) |> requestAndStubOptions thisBlock ) :> Blockly.Field), "MEMBER"  ) |> ignore 
      thisBlockClosure?updateIntellisense( thisBlockClosure, None, requestAndStubOptions_R thisBlockClosure) //adds the member fields, triggering intellisense

      // original (non mutator) approach
      // if hasArgs then thisBlock.setInputsInline(true)
      thisBlock.setOutput(true)
      thisBlock.setColour !^230.0
      thisBlock.setTooltip !^"!Not defined until you execute code."
      thisBlock.setHelpUrl !^""

      //New mutator approach: must apply mutator on init
      //SafeRemoveInput thisBlockClosure "EMPTY"
      if hasArgs then
        thisBlock.appendDummyInput("EMPTY") |> ignore
        blockly?Extensions?apply("intelliblockMutator",thisBlock,true)

    //Listen for intellisense ready events
    "onchange" ==> fun (e:Blockly.Events.Change) ->
      if thisBlock.workspace <> null && not <| thisBlock.isInFlyout && e.group = "INTELLISENSE" then 
        // let thisBlockClosure = thisBlock
        // update the options FieldDropdown by recreating it with the newly selected variable name
        // let input = thisBlock.getInput("INPUT")
        // SafeRemoveField thisBlock "MEMBER" "INPUT"
        // SafeRemoveField thisBlock "USING" "INPUT"
        // let varName = thisBlock?varSelectionUserName(thisBlock, None)
        // input.appendField( !^(blockly.FieldDropdown.Create( varName |> getIntellisenseMemberOptions memberSelectionFunction ) :> Blockly.Field), "MEMBER"  ) |> ignore 
        
        //deserialize data from xml, var:member
        let data = (thisBlock?data |> string).Split(':')

        // update the options FieldDropdown by recreating it with fresh intellisense
        thisBlock?updateIntellisense( thisBlock, None, getIntellisenseMemberOptions memberSelectionFunction ) //adds the member fields, triggering intellisense

        //restore previous member selection if possible
        let memberField = thisBlock.getField("MEMBER")
        // memberField.setValue( thisBlock?selectedMember) //OLD way; does not work with XML serialization 
        // memberField.setValue( data.[1] ) //NEW way; is deserialized from XML
        //prevent setting to ""
        if data.[1] <> "" then
          memberField.setValue( data.[1] ) //NEW way; is deserialized from XML

        // update tooltip
        let varName = thisBlock?varSelectionUserName(thisBlock, None) //Blockly is pretty good at recovering the variable, so we don't need to get from data
        thisBlock.setTooltip !^( varName |> getIntellisenseVarTooltip )

        //3/21/22: TRY THIS NEXT https://groups.google.com/g/blockly/c/C8yx3aVsHbU/m/MeoN1SEnAgAJ
        //TODO NOT SOLVING PROBLEM
        //force a block rerender (blocks sometimes "click" but are offset from what they are supposed to be connected to)
        // if thisBlock.outputConnection.targetBlock() <> null then
        //   let (blockSvg : Blockly.BlockSvg ) = !!thisBlock.outputConnection.targetBlock()
        //   blockSvg.render()
        // thisBlock.workspace.sv
        // Blockly.blockSvg.
        ()
    ]
  /// Generate R intellisense member block conversion code
  // original (non-mutator) approach
  // blockly?R.[blockName] <- fun (block : Blockly.Block) -> 
  //   let varName = blockly?R?variableDB_?getName( block.getFieldValue("VAR").Value |> string, blockly?Variables?NAME_TYPE);
  //   let memberName = block.getFieldValue("MEMBER").Value |> string
  //   // let x = blockly?R?valueToCode( block, "VAR", blockly?R?ORDER_ATOMIC )
  //   let code =  
  //     //All of the "not defined" option messages start with "!"
  //     if memberName.StartsWith("!") then
  //       ""
  //     else if hasArgs then
  //       let (args : string) = blockly?R?valueToCode(block, "INPUT", blockly?R?ORDER_MEMBER) 
  //       let cleanArgs = System.Text.RegularExpressions.Regex.Replace(args,"^\[|\]$" , "")
  //       // For R, 'hasDot' means ::
  //       // special case for `%>%`
  //       if cleanArgs = "" && memberName.StartsWith("`") then
  //         varName + (if hasDot then "::" else "" ) + memberName
  //       // normal case
  //       else
  //         varName + (if hasDot then "::" else "" ) + memberName + "(" +  cleanArgs + ")" 
  //       // varName + (if hasDot then "." else "" ) + memberName + "(" +  args.Trim([| '['; ']' |]) + ")" //looks like a bug in Fable, brackets not getting trimmed?
  //     else
  //       varName + (if hasDot then "::" else "" ) + memberName
  //   [| code; blockly?R?ORDER_FUNCTION_CALL |]

  //mutator approach
  blockly?R.[blockName] <- fun (block : Blockly.Block) -> 
  let varName = blockly?R?variableDB_?getName( block.getFieldValue("VAR").Value |> string, blockly?Variables?NAME_TYPE);
  let memberName = block.getFieldValue("MEMBER").Value |> string
  // let x = blockly?R?valueToCode( block, "VAR", blockly?R?ORDER_ATOMIC )
  let code =  
    //All of the "not defined" option messages start with "!"
    if memberName.StartsWith("!") then
      ""
    else if hasArgs then
      let args : string[] = 
        [|
          for i = 0 to block?itemCount_ - 1 do
            yield  blockly?R?valueToCode(block, "ADD" + string(i), blockly?R?ORDER_COMMA)
        |]
      let cleanArgs = String.concat "," args
      // For R, 'hasDot' means ::
      // TODO: special case for pipe no longer meaningful here since we've created a proper pipe block
      // special case for `%>%`
      if cleanArgs = "" && memberName.StartsWith("`") then
        varName + (if hasDot then "::" else "" ) + memberName
      // normal case
      else
        varName + (if hasDot then "::" else "" ) + memberName + "(" +  cleanArgs + ")" 
      // varName + (if hasDot then "." else "" ) + memberName + "(" +  args.Trim([| '['; ']' |]) + ")" //looks like a bug in Fable, brackets not getting trimmed?
    else
      varName + (if hasDot then "::" else "" ) + memberName
  [| code; blockly?R?ORDER_FUNCTION_CALL |]

//Intellisense variable get property block
makeMemberIntellisenseBlock_R
  "varGetProperty_R"
  "from"
  "get"
  (fun (ie : IntellisenseEntry) -> not( ie.isFunction ))
  false //no arguments
  true //has dot

//Intellisense method block
makeMemberIntellisenseBlock_R
  "varDoMethod_R"
  "with"
  "do"
  (fun (ie : IntellisenseEntry) -> ie.isFunction )
  true //has arguments
  true //has dot


//Intellisense class constructor block
makeMemberIntellisenseBlock_R 
  "varCreateObject_R"
  "with"
  "create"
  (fun (ie : IntellisenseEntry) -> ie.isClass )
  true //has arguments
  true //no dot

  // Override the dynamic 'Variables' toolbox category initialized in blockly_compressed.js
// The basic idea here is that as we add vars, we extend the list of vars in the dropdowns in this category
// NOTE: this gets a little awkward for side by side blockly extensions for different languages, since they both
// want to overwrite a global function. Instead we let each plugin register a function called when the kernel matches some value
///This type is shared across extentions so must match everywhere
type FlyoutRegistryEntry =
  {
    ///The name of the language, e.g. Python
    LanguageName : string
    ///A function that verifies whether the active kernel matches our language
    KernelCheckFunction : string -> bool
    ///A function the implements the flyout categories
    FlyoutFunction : Blockly.Workspace -> ResizeArray<Element>
  }
///This function is shared across extentions so must match everywhere
blockly?Variables?flyoutCategoryBlocks <- fun (workspace : Blockly.Workspace) ->
  //check that we have registered a function
  if blockly?Variables?flyoutRegistry <> null then
    //get the registry
    let registry : ResizeArray<FlyoutRegistryEntry> = unbox <| blockly?Variables?flyoutRegistry
    //get the active kernel
    match GetKernel() with
    //If we have an active kernel, find the first match in our KernelCheckFunctions
    | Some(_,k) -> 
      let entryOption = registry |> Seq.tryFind( fun e -> e.KernelCheckFunction k.name)
      match entryOption with
      //we have a match, route the workspace to the flyout function for this entry
      | Some(e) -> e.FlyoutFunction(workspace)
      //no matching entry, return empty
      | _ -> ResizeArray<Element>()
    //no kernel, return empty
    | _ -> ResizeArray<Element>()
  //no registry, return empty
  else
    ResizeArray<Element>()


let flyoutCategoryBlocks_R = fun (workspace : Blockly.Workspace) ->
  let variableModelList = workspace.getVariablesOfType("")
  let xmlList = ResizeArray<Element>()
  //Only create variable blocks if a variable has been defined
  if 0 < variableModelList.Count then
    let lastVarFieldXml = variableModelList.[variableModelList.Count - 1]
    if blockly?Blocks?variables_set then
      //variable set block
      let xml = Blockly.Utils.xml.createElement("block") 
      xml.setAttribute("type", "variables_set")
      xml.setAttribute("gap", if blockly?Blocks?math_change then "8" else "24")
      xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
      xmlList.Add(xml)
    //variable incr block : TODO REPLACE WITH GENERALIZED INCR
    if blockly?Blocks?math_change then
      let xml = Blockly.Utils.xml.createElement("block") 
      xml.setAttribute("type", "math_change")
      xml.setAttribute("gap", if blockly?Blocks?math_change then "20" else "8")
      xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
      let shadowBlockDom = Blockly.xml.textToDom("<value name='DELTA'><shadow type='math_number'><field name='NUM'>1</field></shadow></value>")
      xml.appendChild(shadowBlockDom) |> ignore
      xmlList.Add(xml)

    // //switch intellisense blocks in category depending on current kernel
    // let isR= 
    //   match GetKernel() with
    //   | Some(_,k) -> k.name = "ir"
    //   | _ -> false
    //variable property block
    if blockly?Blocks?varGetProperty_R then //&& isR then
      let xml = Blockly.Utils.xml.createElement("block") 
      xml.setAttribute("type", "varGetProperty_R")
      xml.setAttribute("gap", if blockly?Blocks?varGetProperty then "20" else "8")
      xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
      xmlList.Add(xml)
    //variable method block
    if blockly?Blocks?varDoMethod_R then //&& isR then
      let xml = Blockly.Utils.xml.createElement("block") 
      xml.setAttribute("type", "varDoMethod_R")
      xml.setAttribute("gap", if blockly?Blocks?varDoMethod then "20" else "8")
      xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
      xmlList.Add(xml)
    //R basically doesn't have constructors, so this block is not useful;
    // as of 11/26/21, it basically duplicates the property block
    //variable create object block
    // if blockly?Blocks?varCreateObject_R then //&& isR then
    //   let xml = Blockly.Utils.xml.createElement("block") 
    //   xml.setAttribute("type", "varCreateObject_R")
    //   xml.setAttribute("gap", if blockly?Blocks?varCreateObject then "20" else "8")
    //   xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
    //   xmlList.Add(xml)

    //variable indexer block
    // if blockly?Blocks?indexer then
    //   let xml = Blockly.Utils.xml.createElement("block") 
    //   xml.setAttribute("type", "indexer")
    //   xml.setAttribute("gap", if blockly?Blocks?varCreateObject then "20" else "8")
    //   xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
    //   xmlList.Add(xml)
    //variable get block, one per variable: TODO - WHY DO WE NEED ONE PER VAR? LESS CLUTTER TO HAVE ONE WITH DROPDOWN
    if blockly?Blocks?variables_get then
      //for some reason the original "directly translated" code is passing the workspace into sort instead of the variables
      // variableModelList?sort( Blockly.variableModel.compareByName ) 
      let sortedVars = variableModelList |> Seq.sortBy( fun v -> v.name)
      for variable in sortedVars do
        let xml = Blockly.Utils.xml.createElement("block") 
        xml.setAttribute("type", "variables_get")
        xml.setAttribute("gap", "8")
        xml.appendChild( Blockly.variables.generateVariableFieldDom(variable)) |> ignore
        xmlList.Add(xml)
  xmlList

//create or get the flyout registry
let registry : ResizeArray<FlyoutRegistryEntry> = 
  if blockly?Variables?flyoutRegistry = null then
    ResizeArray<FlyoutRegistryEntry>()
  else
    unbox <| blockly?Variables?flyoutRegistry

// register the flyout function
registry.Add(
    {
      LanguageName = "R"
      KernelCheckFunction = fun (name:string)-> name = "ir"
      FlyoutFunction = flyoutCategoryBlocks_R
    }
  )

//update the registry
blockly?Variables?flyoutRegistry <- registry

// Defered initialization: final setup is done by the widget once it is ready
let DoFinalInitialization( workspace : Blockly.WorkspaceSvg ) = 
  /// SPECIAL category: blocks that only exist when a certain library is loaded, but which don't match intelliblocks well (e.g. %>% in R)
  let specialFlyoutCallback_R =  System.Func<Blockly.Workspace,ResizeArray<Element>>(fun workspace  ->
    let blockList = ResizeArray<Element>()
    //add label explaining this category
    // <label text="A label" ></label>
    let label = Browser.Dom.document.createElement("label");
    label.setAttribute("text", "Occassionally blocks appear here as you load libraries (e.g. %>%). See VARIABLES for most cases.");
    blockList.Add(label)
    //check the intellisense cache to see if functions have been loaded
    if intellisenseLookup.ContainsKey("dplyr") then
      let block = Browser.Dom.document.createElement("block");
      block.setAttribute("type", "pipe_R");
      blockList.Add(block)
    if intellisenseLookup.ContainsKey("ggplot2") then
      let block = Browser.Dom.document.createElement("block");
      block.setAttribute("type", "ggplot_plus_R");
      blockList.Add(block)

    blockList
  )
    
  //register the callback
  workspace.registerToolboxCategoryCallback("SPECIAL",specialFlyoutCallback_R)

// let coloursFlyoutCallback = function(workspace) {
//   // Returns an array of hex colours, e.g. ['#4286f4', '#ef0447']
//   var colourList = getPalette();
//   var blockList = [];
//   for (var i = 0; i < colourList.length; i++) {
//     var block = document.createElement('block');
//     block.setAttribute('type', 'colour_picker');
//     var field = document.createElement('field');
//     field.setAttribute('name', 'COLOUR');
//     field.innerText = colourList[i];
//     block.appendChild(field);
//     blockList.push(block);
//   }
//   return blockList;
// };

// Associates the function with the string 'COLOUR_PALLET'
// myWorkspace.registerToolboxCategoryCallback(
//     'COLOUR_PALETTE', coloursFlyoutCallback);

//update the registry
// blockly?Variables?flyoutRegistry <- registry

// Override the dynamic 'Variables' toolbox category initialized in blockly_compressed.js
// The basic idea here is that as we add vars, we extend the list of vars in the dropdowns in this category
// blockly?Variables?flyoutCategoryBlocks <- fun (workspace : Blockly.Workspace) ->
//   let variableModelList = workspace.getVariablesOfType("")
//   let xmlList = ResizeArray<Element>()
//   //Only create variable blocks if a variable has been defined
//   if 0 < variableModelList.Count then
//     let lastVarFieldXml = variableModelList.[variableModelList.Count - 1]
//     if blockly?Blocks?variables_set then
//       //variable set block
//       let xml = Blockly.Utils.xml.createElement("block") 
//       xml.setAttribute("type", "variables_set")
//       xml.setAttribute("gap", if blockly?Blocks?math_change then "8" else "24")
//       xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
//       xmlList.Add(xml)
//     //variable incr block : TODO REPLACE WITH GENERALIZED INCR
//     if blockly?Blocks?math_change then
//       let xml = Blockly.Utils.xml.createElement("block") 
//       xml.setAttribute("type", "math_change")
//       xml.setAttribute("gap", if blockly?Blocks?math_change then "20" else "8")
//       xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
//       let shadowBlockDom = Blockly.xml.textToDom("<value name='DELTA'><shadow type='math_number'><field name='NUM'>1</field></shadow></value>")
//       xml.appendChild(shadowBlockDom) |> ignore
//       xmlList.Add(xml)

//     //switch intellisense blocks in category depending on current kernel
//     let isR= 
//       match GetKernel() with
//       | Some(_,k) -> k.name = "ir"
//       | _ -> false
//     //variable property block
//     if blockly?Blocks?varGetProperty_R && isR then
//       let xml = Blockly.Utils.xml.createElement("block") 
//       xml.setAttribute("type", "varGetProperty_R")
//       xml.setAttribute("gap", if blockly?Blocks?varGetProperty then "20" else "8")
//       xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
//       xmlList.Add(xml)
//     //variable method block
//     if blockly?Blocks?varDoMethod_R && isR then
//       let xml = Blockly.Utils.xml.createElement("block") 
//       xml.setAttribute("type", "varDoMethod_R")
//       xml.setAttribute("gap", if blockly?Blocks?varDoMethod then "20" else "8")
//       xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
//       xmlList.Add(xml)
//     //variable create object block
//     if blockly?Blocks?varCreateObject_R && isR then
//       let xml = Blockly.Utils.xml.createElement("block") 
//       xml.setAttribute("type", "varCreateObject_R")
//       xml.setAttribute("gap", if blockly?Blocks?varCreateObject then "20" else "8")
//       xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
//       xmlList.Add(xml)
//     //variable indexer block
//     // if blockly?Blocks?indexer then
//     //   let xml = Blockly.Utils.xml.createElement("block") 
//     //   xml.setAttribute("type", "indexer")
//     //   xml.setAttribute("gap", if blockly?Blocks?varCreateObject then "20" else "8")
//     //   xml.appendChild( Blockly.variables.generateVariableFieldDom(lastVarFieldXml)) |> ignore
//     //   xmlList.Add(xml)
//     //variable get block, one per variable: TODO - WHY DO WE NEED ONE PER VAR? LESS CLUTTER TO HAVE ONE WITH DROPDOWN
//     if blockly?Blocks?variables_get then
//       //for some reason the original "directly translated" code is passing the workspace into sort instead of the variables
//       // variableModelList?sort( Blockly.variableModel.compareByName ) 
//       let sortedVars = variableModelList |> Seq.sortBy( fun v -> v.name)
//       for variable in sortedVars do
//         let xml = Blockly.Utils.xml.createElement("block") 
//         xml.setAttribute("type", "variables_get")
//         xml.setAttribute("gap", "8")
//         xml.appendChild( Blockly.variables.generateVariableFieldDom(variable)) |> ignore
//         xmlList.Add(xml)
//   xmlList


/// A static toolbox copied from one of Google's online demos at https://blockly-demo.appspot.com/static/demos/index.html
/// Curiously category names like "%{BKY_CATLOGIC}" not resolved by Blockly, even though the colors are, so names 
/// are replaced with English strings below
let toolbox =
    """<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
    <category name="IMPORT" colour="255">
      <block type="import_R"></block>
    </category>
    <category name="FREESTYLE" colour="290">
      <block type="dummyOutputCodeBlock_R"></block>
      <block type="dummyNoOutputCodeBlock_R"></block>
      <block type="valueOutputCodeBlock_R"></block>
      <block type="valueNoOutputCodeBlock_R"></block>
    </category>
    <category name="LOGIC" colour="%{BKY_LOGIC_HUE}">
      <block type="controls_if"></block>
      <block type="logic_compare"></block>
      <block type="logic_operation"></block>
      <block type="logic_negate"></block>
      <block type="logic_boolean"></block>
      <block type="logic_null"></block>
      <block type="logic_ternary"></block>
    </category>
    <category name="LOOPS" colour="%{BKY_LOOPS_HUE}">
      <block type="controls_repeat_ext">
        <value name="TIMES">
          <shadow type="math_number">
            <field name="NUM">10</field>
          </shadow>
        </value>
      </block>
      <block type="controls_whileUntil"></block>
      <block type="controls_for">
        <value name="FROM">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="TO">
          <shadow type="math_number">
            <field name="NUM">10</field>
          </shadow>
        </value>
        <value name="BY">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
      </block>
      <block type="controls_forEach"></block>
      <block type="controls_flow_statements"></block>
    </category>
    <category name="MATH" colour="%{BKY_MATH_HUE}">
      <block type="math_number">
        <field name="NUM">123</field>
      </block>
      <block type="math_arithmetic">
        <value name="A">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="B">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
      </block>
      <block type="math_single">
        <value name="NUM">
          <shadow type="math_number">
            <field name="NUM">9</field>
          </shadow>
        </value>
      </block>
      <block type="math_trig">
        <value name="NUM">
          <shadow type="math_number">
            <field name="NUM">45</field>
          </shadow>
        </value>
      </block>
      <block type="math_constant"></block>
      <block type="math_number_property">
        <value name="NUMBER_TO_CHECK">
          <shadow type="math_number">
            <field name="NUM">0</field>
          </shadow>
        </value>
      </block>
      <block type="math_round">
        <value name="NUM">
          <shadow type="math_number">
            <field name="NUM">3.1</field>
          </shadow>
        </value>
      </block>
      <block type="math_on_list"></block>
      <block type="math_modulo">
        <value name="DIVIDEND">
          <shadow type="math_number">
            <field name="NUM">64</field>
          </shadow>
        </value>
        <value name="DIVISOR">
          <shadow type="math_number">
            <field name="NUM">10</field>
          </shadow>
        </value>
      </block>
      <block type="math_constrain">
        <value name="VALUE">
          <shadow type="math_number">
            <field name="NUM">50</field>
          </shadow>
        </value>
        <value name="LOW">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="HIGH">
          <shadow type="math_number">
            <field name="NUM">100</field>
          </shadow>
        </value>
      </block>
      <block type="math_random_int">
        <value name="FROM">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="TO">
          <shadow type="math_number">
            <field name="NUM">100</field>
          </shadow>
        </value>
      </block>
      <block type="math_random_float"></block>
      <block type="math_atan2">
        <value name="X">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="Y">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
      </block>
    </category>
    <category name="TEXT" colour="%{BKY_TEXTS_HUE}">
      <block type="text"></block>
      <block type="text_join"></block>
      <block type="text_append">
        <value name="TEXT">
          <shadow type="text"></shadow>
        </value>
      </block>
      <block type="text_length">
        <value name="VALUE">
          <shadow type="text">
            <field name="TEXT">abc</field>
          </shadow>
        </value>
      </block>
      <block type="text_isEmpty">
        <value name="VALUE">
          <shadow type="text">
            <field name="TEXT"></field>
          </shadow>
        </value>
      </block>
      <block type="text_indexOf">
        <value name="VALUE">
          <block type="variables_get">
            <field name="VAR">{textVariable}</field>
          </block>
        </value>
        <value name="FIND">
          <shadow type="text">
            <field name="TEXT">abc</field>
          </shadow>
        </value>
      </block>
      <block type="text_charAt">
        <value name="VALUE">
          <block type="variables_get">
            <field name="VAR">{textVariable}</field>
          </block>
        </value>
      </block>
      <block type="text_getSubstring">
        <value name="STRING">
          <block type="variables_get">
            <field name="VAR">{textVariable}</field>
          </block>
        </value>
      </block>
      <block type="text_changeCase">
        <value name="TEXT">
          <shadow type="text">
            <field name="TEXT">abc</field>
          </shadow>
        </value>
      </block>
      <block type="text_trim">
        <value name="TEXT">
          <shadow type="text">
            <field name="TEXT">abc</field>
          </shadow>
        </value>
      </block>
      <block type="text_print">
        <value name="TEXT">
          <shadow type="text">
            <field name="TEXT">abc</field>
          </shadow>
        </value>
      </block>
      <block type="text_prompt_ext">
        <value name="TEXT">
          <shadow type="text">
            <field name="TEXT">abc</field>
          </shadow>
        </value>
      </block>
    </category>
    <category name="LISTS" colour="%{BKY_LISTS_HUE}">
      <block type="lists_create_with">
        <mutation items="0"></mutation>
      </block>
      <block type="lists_create_with"></block>
      <block type="lists_repeat">
        <value name="NUM">
          <shadow type="math_number">
            <field name="NUM">5</field>
          </shadow>
        </value>
      </block>
      <block type="lists_length"></block>
      <block type="lists_isEmpty"></block>
      <block type="lists_indexOf">
        <value name="VALUE">
          <block type="variables_get">
            <field name="VAR">{listVariable}</field>
          </block>
        </value>
      </block>
      <block type="lists_getIndex">
        <value name="VALUE">
          <block type="variables_get">
            <field name="VAR">{listVariable}</field>
          </block>
        </value>
      </block>
      <block type="lists_setIndex">
        <value name="LIST">
          <block type="variables_get">
            <field name="VAR">{listVariable}</field>
          </block>
        </value>
      </block>
      <block type="lists_getSublist">
        <value name="LIST">
          <block type="variables_get">
            <field name="VAR">{listVariable}</field>
          </block>
        </value>
      </block>
      <block type="indexer_R"></block>
      <block type="doubleIndexer_R"></block>
      <block type="lists_split">
        <value name="DELIM">
          <shadow type="text">
            <field name="TEXT">,</field>
          </shadow>
        </value>
      </block>
      <block type="lists_sort"></block>
      <block type="uniqueBlock_R"></block>
      <block type="reversedBlock_R"></block>
      <block type="unlistBlock_R"></block>
    </category>
    <category name="COLOUR" colour="%{BKY_COLOUR_HUE}">
      <block type="colour_picker"></block>
      <block type="colour_random"></block>
      <block type="colour_rgb">
        <value name="RED">
          <shadow type="math_number">
            <field name="NUM">100</field>
          </shadow>
        </value>
        <value name="GREEN">
          <shadow type="math_number">
            <field name="NUM">50</field>
          </shadow>
        </value>
        <value name="BLUE">
          <shadow type="math_number">
            <field name="NUM">0</field>
          </shadow>
        </value>
      </block>
      <block type="colour_blend">
        <value name="COLOUR1">
          <shadow type="colour_picker">
            <field name="COLOUR">#ff0000</field>
          </shadow>
        </value>
        <value name="COLOUR2">
          <shadow type="colour_picker">
            <field name="COLOUR">#3333ff</field>
          </shadow>
        </value>
        <value name="RATIO">
          <shadow type="math_number">
            <field name="NUM">0.5</field>
          </shadow>
        </value>
      </block>
    </category>
    <category name="CONVERSION" colour="120">
      <block type="boolConversion_R">
      </block>
      <block type="intConversion_R">
      </block>
      <block type="floatConversion_R">
      </block>
      <block type="strConversion_R">
      </block>
    </category>
    <category name="I/O" colour="190">
      <block type="textFromFile_R">
        <value name="FILENAME">
          <shadow type="text">
            <field name="TEXT">name of file</field>
          </shadow>
        </value>
      </block>
      <block type="readFile_R">
        <value name="FILENAME">
          <shadow type="text">
            <field name="TEXT">name of file</field>
          </shadow>
        </value>
      </block>
    </category>
    <sep></sep>
    <category name="VARIABLES" colour="%{BKY_VARIABLES_HUE}" custom="VARIABLE"></category>
    <!-- TEMPORARILY DISABLED B/C OF PLUS/MINUS INCOMPATIBILITY <category name="FUNCTIONS" colour="%{BKY_PROCEDURES_HUE}" custom="PROCEDURE"></category> -->
    <category name="SPECIAL" colour="270" custom="SPECIAL"></category>
  </xml>"""


  // <!-- From BlockPY 
  //           </category>
  //       <category name="Dictionaries" colour="${BlockMirrorTextToBlocks.COLOR.DICTIONARY}">
  //           <block type="ast_Dict">
  //               <mutation items="3"></mutation>
  //               <value name="ADD0"><block type="ast_DictItem" deletable="false" movable="false">
  //                 <value name="KEY">
  //                   <shadow type="text">
  //                     <field name="TEXT">key1</field>
  //                   </shadow>
  //                 </value>
  //               </block></value>
  //               <value name="ADD1"><block type="ast_DictItem" deletable="false" movable="false">
  //                 <value name="KEY">
  //                   <shadow type="text">
  //                     <field name="TEXT">key2</field>
  //                   </shadow>
  //                 </value>
  //               </block></value>
  //               <value name="ADD2"><block type="ast_DictItem" deletable="false" movable="false">
  //                   <!-- <value name="KEY"><block type="ast_Str"><field name="TEXT">3rd key</field></block></value> -->
  //                 <value name="KEY">
  //                   <shadow type="text">
  //                     <field name="TEXT">key3</field>
  //                   </shadow>
  //                 </value>
  //               </block></value>
  //           </block>
  //           <block type="ast_Subscript">
  //               <mutation><arg name="I"></arg></mutation>
  //               <value name="INDEX0"><block type="ast_Str"><field name="TEXT">key</field></block></value>
  //           </block>
  //       </category>
  //    End from BlockPY -->


  //          <!-- From BlockPY 
  //     <block xmlns="http://www.w3.org/1999/xhtml" type="ast_Call" line_number="null" inline="true">
  //       <mutation arguments="1" returns="false" parameters="true" method="true" name=".append" message="append" premessage="to list" colour="30" module="">
  //         <arg name="UNKNOWN_ARG:0"></arg>
  //       </mutation>
  //     </block>
  //     <block xmlns="http://www.w3.org/1999/xhtml" type="ast_Call" line_number="null" inline="true">
  //       <mutation arguments="1" returns="true" parameters="true" method="false" name="range" message="range" premessage="" colour="15" module="">
  //         <arg name="UNKNOWN_ARG:0"></arg>
  //       </mutation>
  //       <value name="NUM">
  //         <shadow type="math_number">
  //           <field name="NUM">0</field>
  //         </shadow>
  //       </value>
  //       </block>
  //     End from BlockPY -->

  //11/17/21 debug version
  //     """<xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
  //   <category name="LISTS" colour="%{BKY_LISTS_HUE}">
  //     <block type="lists_create_with">
  //       <mutation items="0"></mutation>
  //     </block>
  //     <block type="lists_create_with"></block>
  //     <block type="lists_repeat">
  //       <value name="NUM">
  //         <shadow type="math_number">
  //           <field name="NUM">5</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="lists_length"></block>
  //     <block type="lists_isEmpty"></block>
  //     <block type="lists_indexOf">
  //       <value name="VALUE">
  //         <block type="variables_get">
  //           <field name="VAR">{listVariable}</field>
  //         </block>
  //       </value>
  //     </block>
  //     <block type="lists_getIndex">
  //       <value name="VALUE">
  //         <block type="variables_get">
  //           <field name="VAR">{listVariable}</field>
  //         </block>
  //       </value>
  //     </block>
  //     <block type="lists_setIndex">
  //       <value name="LIST">
  //         <block type="variables_get">
  //           <field name="VAR">{listVariable}</field>
  //         </block>
  //       </value>
  //     </block>
  //     <block type="lists_getSublist">
  //       <value name="LIST">
  //         <block type="variables_get">
  //           <field name="VAR">{listVariable}</field>
  //         </block>
  //       </value>
  //     </block>
  //     <!-- <block type="indexer"></block> -->
  //     <block type="lists_split">
  //       <value name="DELIM">
  //         <shadow type="text">
  //           <field name="TEXT">,</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="lists_sort"></block>
  //   </category>
  //   <category name="TEXT" colour="%{BKY_TEXTS_HUE}">
  //   <block type="text"></block>
  //   <block type="text_join"></block>
  //   <block type="text_append">
  //     <value name="TEXT">
  //       <shadow type="text"></shadow>
  //     </value>
  //   </block>
  //   <block type="text_length">
  //     <value name="VALUE">
  //       <shadow type="text">
  //         <field name="TEXT">abc</field>
  //       </shadow>
  //     </value>
  //   </block>
  //   <block type="text_isEmpty">
  //     <value name="VALUE">
  //       <shadow type="text">
  //         <field name="TEXT"></field>
  //       </shadow>
  //     </value>
  //   </block>
  //   <block type="text_indexOf">
  //     <value name="VALUE">
  //       <block type="variables_get">
  //         <field name="VAR">{textVariable}</field>
  //       </block>
  //     </value>
  //     <value name="FIND">
  //       <shadow type="text">
  //         <field name="TEXT">abc</field>
  //       </shadow>
  //     </value>
  //   </block>
  //   <block type="text_charAt">
  //     <value name="VALUE">
  //       <block type="variables_get">
  //         <field name="VAR">{textVariable}</field>
  //       </block>
  //     </value>
  //   </block>
  //   <block type="text_getSubstring">
  //     <value name="STRING">
  //       <block type="variables_get">
  //         <field name="VAR">{textVariable}</field>
  //       </block>
  //     </value>
  //   </block>
  //   <block type="text_changeCase">
  //     <value name="TEXT">
  //       <shadow type="text">
  //         <field name="TEXT">abc</field>
  //       </shadow>
  //     </value>
  //   </block>
  //   <block type="text_trim">
  //     <value name="TEXT">
  //       <shadow type="text">
  //         <field name="TEXT">abc</field>
  //       </shadow>
  //     </value>
  //   </block>
  //   <block type="text_print">
  //     <value name="TEXT">
  //       <shadow type="text">
  //         <field name="TEXT">abc</field>
  //       </shadow>
  //     </value>
  //   </block>
  //   <block type="text_prompt_ext">
  //     <value name="TEXT">
  //       <shadow type="text">
  //         <field name="TEXT">abc</field>
  //       </shadow>
  //     </value>
  //   </block>
  // </category>
  //    <category name="MATH" colour="%{BKY_MATH_HUE}">
  //     <block type="math_number">
  //       <field name="NUM">123</field>
  //     </block>
  //     <block type="math_arithmetic">
  //       <value name="A">
  //         <shadow type="math_number">
  //           <field name="NUM">1</field>
  //         </shadow>
  //       </value>
  //       <value name="B">
  //         <shadow type="math_number">
  //           <field name="NUM">1</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="math_single">
  //       <value name="NUM">
  //         <shadow type="math_number">
  //           <field name="NUM">9</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="math_trig">
  //       <value name="NUM">
  //         <shadow type="math_number">
  //           <field name="NUM">45</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="math_constant"></block>
  //     <block type="math_number_property">
  //       <value name="NUMBER_TO_CHECK">
  //         <shadow type="math_number">
  //           <field name="NUM">0</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="math_round">
  //       <value name="NUM">
  //         <shadow type="math_number">
  //           <field name="NUM">3.1</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="math_on_list"></block>
  //     <block type="math_modulo">
  //       <value name="DIVIDEND">
  //         <shadow type="math_number">
  //           <field name="NUM">64</field>
  //         </shadow>
  //       </value>
  //       <value name="DIVISOR">
  //         <shadow type="math_number">
  //           <field name="NUM">10</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="math_constrain">
  //       <value name="VALUE">
  //         <shadow type="math_number">
  //           <field name="NUM">50</field>
  //         </shadow>
  //       </value>
  //       <value name="LOW">
  //         <shadow type="math_number">
  //           <field name="NUM">1</field>
  //         </shadow>
  //       </value>
  //       <value name="HIGH">
  //         <shadow type="math_number">
  //           <field name="NUM">100</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="math_random_int">
  //       <value name="FROM">
  //         <shadow type="math_number">
  //           <field name="NUM">1</field>
  //         </shadow>
  //       </value>
  //       <value name="TO">
  //         <shadow type="math_number">
  //           <field name="NUM">100</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="math_random_float"></block>
  //     <block type="math_atan2">
  //       <value name="X">
  //         <shadow type="math_number">
  //           <field name="NUM">1</field>
  //         </shadow>
  //       </value>
  //       <value name="Y">
  //         <shadow type="math_number">
  //           <field name="NUM">1</field>
  //         </shadow>
  //       </value>
  //     </block>
  //   </category>
  //   <category name="VARIABLES" colour="%{BKY_VARIABLES_HUE}" custom="VARIABLE"></category>
  //   <category name="LOGIC" colour="%{BKY_LOGIC_HUE}">
  //   <block type="controls_if"></block>
  //   <block type="logic_compare"></block>
  //   <block type="logic_operation"></block>
  //   <block type="logic_negate"></block>
  //   <block type="logic_boolean"></block>
  //   <block type="logic_null"></block>
  //   <block type="logic_ternary"></block>
  // </category>
  //   <category name="LOOPS" colour="%{BKY_LOOPS_HUE}">
  //     <block type="controls_repeat_ext">
  //       <value name="TIMES">
  //         <shadow type="math_number">
  //           <field name="NUM">10</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="controls_whileUntil"></block>
  //     <block type="controls_for">
  //       <value name="FROM">
  //         <shadow type="math_number">
  //           <field name="NUM">1</field>
  //         </shadow>
  //       </value>
  //       <value name="TO">
  //         <shadow type="math_number">
  //           <field name="NUM">10</field>
  //         </shadow>
  //       </value>
  //       <value name="BY">
  //         <shadow type="math_number">
  //           <field name="NUM">1</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="controls_forEach"></block>
  //     <block type="controls_flow_statements"></block>
  //   </category>
  //   <!-- AO: functions definitions disappear after cell in which they were defined; is this why they were removed from Python version? -->
  //   <category name="FUNCTIONS" colour="%{BKY_PROCEDURES_HUE}" custom="PROCEDURE"></category>
  //     <category name="COLOUR" colour="%{BKY_COLOUR_HUE}">
  //     <block type="colour_picker"></block>
  //     <block type="colour_random"></block>
  //     <block type="colour_rgb">
  //       <value name="RED">
  //         <shadow type="math_number">
  //           <field name="NUM">100</field>
  //         </shadow>
  //       </value>
  //       <value name="GREEN">
  //         <shadow type="math_number">
  //           <field name="NUM">50</field>
  //         </shadow>
  //       </value>
  //       <value name="BLUE">
  //         <shadow type="math_number">
  //           <field name="NUM">0</field>
  //         </shadow>
  //       </value>
  //     </block>
  //     <block type="colour_blend">
  //       <value name="COLOUR1">
  //         <shadow type="colour_picker">
  //           <field name="COLOUR">#ff0000</field>
  //         </shadow>
  //       </value>
  //       <value name="COLOUR2">
  //         <shadow type="colour_picker">
  //           <field name="COLOUR">#3333ff</field>
  //         </shadow>
  //       </value>
  //       <value name="RATIO">
  //         <shadow type="math_number">
  //           <field name="NUM">0.5</field>
  //         </shadow>
  //       </value>
  //     </block>
  //   </category>
  // </xml>"""