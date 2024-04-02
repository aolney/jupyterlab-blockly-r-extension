//AO: Modified from blockly-3.20191014.4/generators/javascript.js
// using additional examples from lua.js
// and inlining relevant modified blocks from blockly-3.20191014.4/generators/javascript
import Blockly from 'blockly';

//AO: 20220223 trying plus/minus for UI improvement generally but %>% improvement specifically
//NOTE 5/24/22: down graded plus/minus from 3.0.6 to 2.0.39 because genUid must be at Blockly.utils.genUid() for our Blocky version
//NOTE 12/22/22: For unclear reasons, plus/minus causes code generation to fail BUT ONLY FOR R, NOT PYTHON
//Presumably this is some sort of namespace/scoping issue, but in the short term, the best option appears to be disabling procedures in R,
//because plus/minus is otherwise so good that it's not worth ditching it just to get procedures back
import '@blockly/block-plus-minus'; 


/**
 * R code generator.
 * @type {!Blockly.Generator}
 */
export const RGenerator = new Blockly.Generator('R');

//AO: 20220221 importWithSideEffects does not work in deploy - the module is never loaded
// adding a dummy export causes the module to load
export const side_effects_r_generator = "";

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
RGenerator.addReservedWords(
    'Blockly,' +  // In case JS is evaled in the current window.
    //https://stat.ethz.ch/R-manual/R-devel/library/base/html/Reserved.html
    //AO: not sure if .. can be handled correctly this way
    "if,else,repeat,while,function,for,in,next,break,TRUE,FALSE,NULL,Inf,NaN,NA,NA_integer_,NA_real_,NA_complex_,NA_character_,...,..1,..2,..3,..4,..5,..6,..7,..8,..9");

/**
 * Order of operation ENUMs.
 * https://developer.mozilla.org/en/R/Reference/Operators/Operator_Precedence
 */
RGenerator.ORDER_ATOMIC = 0;           // 0 "" ...
RGenerator.ORDER_NEW = 1.1;            // new
RGenerator.ORDER_MEMBER = 1.2;         // . []
RGenerator.ORDER_FUNCTION_CALL = 2;    // ()
RGenerator.ORDER_INCREMENT = 3;        // ++
RGenerator.ORDER_DECREMENT = 3;        // --
RGenerator.ORDER_BITWISE_NOT = 4.1;    // ~
RGenerator.ORDER_UNARY_PLUS = 4.2;     // +
RGenerator.ORDER_UNARY_NEGATION = 4.3; // -
RGenerator.ORDER_LOGICAL_NOT = 4.4;    // !
RGenerator.ORDER_TYPEOF = 4.5;         // typeof
RGenerator.ORDER_VOID = 4.6;           // void
RGenerator.ORDER_DELETE = 4.7;         // delete
RGenerator.ORDER_AWAIT = 4.8;          // await
RGenerator.ORDER_EXPONENTIATION = 5.0; // **
// AO: switched
RGenerator.ORDER_DIVISION = 5.1;       // /
RGenerator.ORDER_MULTIPLICATION = 5.2; // *
// AO: switched
RGenerator.ORDER_MODULUS = 5.3;        // %
// AO: switched
RGenerator.ORDER_ADDITION = 6.1;       // +
RGenerator.ORDER_SUBTRACTION = 6.2;    // -
// AO: switched
RGenerator.ORDER_BITWISE_SHIFT = 7;    // << >> >>>
RGenerator.ORDER_RELATIONAL = 8;       // < <= > >=
RGenerator.ORDER_IN = 8;               // in
RGenerator.ORDER_INSTANCEOF = 8;       // instanceof
RGenerator.ORDER_EQUALITY = 9;         // == != === !==
RGenerator.ORDER_BITWISE_AND = 10;     // &
RGenerator.ORDER_BITWISE_XOR = 11;     // ^
RGenerator.ORDER_BITWISE_OR = 12;      // |
RGenerator.ORDER_LOGICAL_AND = 13;     // &&
RGenerator.ORDER_LOGICAL_OR = 14;      // ||
RGenerator.ORDER_CONDITIONAL = 15;     // ?:
RGenerator.ORDER_ASSIGNMENT = 16;      // = += -= **= *= /= %= <<= >>= ...
RGenerator.ORDER_YIELD = 17;           // yield
RGenerator.ORDER_COMMA = 18;           // ,
RGenerator.ORDER_NONE = 99;            // (...)

/**
 * List of outer-inner pairings that do NOT require parentheses.
 * @type {!Array.<!Array.<number>>}
 */
RGenerator.ORDER_OVERRIDES = [
  // (foo()).bar -> foo().bar
  // (foo())[0] -> foo()[0]
  [RGenerator.ORDER_FUNCTION_CALL, RGenerator.ORDER_MEMBER],
  // (foo())() -> foo()()
  [RGenerator.ORDER_FUNCTION_CALL, RGenerator.ORDER_FUNCTION_CALL],
  // (foo.bar).baz -> foo.bar.baz
  // (foo.bar)[0] -> foo.bar[0]
  // (foo[0]).bar -> foo[0].bar
  // (foo[0])[1] -> foo[0][1]
  [RGenerator.ORDER_MEMBER, RGenerator.ORDER_MEMBER],
  // (foo.bar)() -> foo.bar()
  // (foo[0])() -> foo[0]()
  [RGenerator.ORDER_MEMBER, RGenerator.ORDER_FUNCTION_CALL],

  // !(!foo) -> !!foo
  [RGenerator.ORDER_LOGICAL_NOT, RGenerator.ORDER_LOGICAL_NOT],
  // a * (b * c) -> a * b * c
  [RGenerator.ORDER_MULTIPLICATION, RGenerator.ORDER_MULTIPLICATION],
  // a + (b + c) -> a + b + c
  [RGenerator.ORDER_ADDITION, RGenerator.ORDER_ADDITION],
  // a && (b && c) -> a && b && c
  [RGenerator.ORDER_LOGICAL_AND, RGenerator.ORDER_LOGICAL_AND],
  // a || (b || c) -> a || b || c
  [RGenerator.ORDER_LOGICAL_OR, RGenerator.ORDER_LOGICAL_OR]
];

/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
RGenerator.init = function(workspace) {
  // Create a dictionary of definitions to be printed before the code.
  RGenerator.definitions_ = Object.create(null);
  // Create a dictionary mapping desired function names in definitions_
  // to actual function names (to avoid collisions with user functions).
  RGenerator.functionNames_ = Object.create(null);

  if (!RGenerator.variableDB_) {
    RGenerator.variableDB_ =
        new Blockly.Names(RGenerator.RESERVED_WORDS_);
  } else {
    RGenerator.variableDB_.reset();
  }

  RGenerator.variableDB_.setVariableMap(workspace.getVariableMap());

  //AO: below seems irrelevant; R does not declare variables in this sense
  // var defvars = [];
  // // Add developer variables (not created or named by the user).
  // var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
  // for (var i = 0; i < devVarList.length; i++) {
  //   defvars.push(RGenerator.variableDB_.getName(devVarList[i],
  //       Blockly.Names.DEVELOPER_VARIABLE_TYPE));
  // }

  // // Add user variables, but only ones that are being used.
  // var variables = Blockly.Variables.allUsedVarModels(workspace);
  // for (var i = 0; i < variables.length; i++) {
  //   defvars.push(RGenerator.variableDB_.getName(variables[i].getId(),
  //       Blockly.Variables.NAME_TYPE));
  // }

  // // Declare all of the variables.
  // if (defvars.length) {
  //   RGenerator.definitions_['variables'] =
  //       'var ' + defvars.join(', ') + ';';
  // }
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
RGenerator.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var definitions = [];
  for (var name in RGenerator.definitions_) {
    definitions.push(RGenerator.definitions_[name]);
  }
  // Clean up temporary data.
  delete RGenerator.definitions_;
  delete RGenerator.functionNames_;
  RGenerator.variableDB_.reset();
  return definitions.join('\n\n') + '\n\n\n' + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
RGenerator.scrubNakedValue = function(line) {
  // return line + ';\n';
  return line + '\n';
};

/**
 * Encode a string as a properly escaped R string, complete with
 * quotes. AO: changed to double quotes
 * @param {string} string Text to encode.
 * @return {string} R string.
 * @private
 */
RGenerator.quote_ = function(string) {
  // Can't use goog.string.quote since Google's style guide recommends
  // JS string literals use single quotes.
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/"/g, '\\\"');
  return '\"' + string + '\"';
};

/**
 * Encode a string as a properly escaped multiline R string, complete
 * with quotes. AO: changed to double quote
 * @param {string} string Text to encode.
 * @return {string} R string.
 * @private
 */
RGenerator.multiline_quote_ = function(string) {
  // Can't use goog.string.quote since Google's style guide recommends
  // JS string literals use single quotes.
  var lines = string.split(/\n/g).map(RGenerator.quote_);
  return lines.join(' + \"\\n\" +\n');
};

/**
 * Common tasks for generating R from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The R code created for this block.
 * @param {boolean=} opt_thisOnly True to generate code for only this statement.
 * @return {string} R code with comments and subsequent blocks added.
 * @private
 */
RGenerator.scrub_ = function(block, code, opt_thisOnly) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      comment = Blockly.utils.string.wrap(comment,
          RGenerator.COMMENT_WRAP - 3);
      commentCode += RGenerator.prefixLines(comment + '\n', '# ');
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var i = 0; i < block.inputList.length; i++) {
      if (block.inputList[i].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[i].connection.targetBlock();
        if (childBlock) {
          var comment = RGenerator.allNestedComments(childBlock);
          if (comment) {
            commentCode += RGenerator.prefixLines(comment, '# ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = opt_thisOnly ? '' : RGenerator.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};

// AO: seems irrelevant since R is 1 indexed
// /**
//  * Gets a property and adjusts the value while taking into account indexing.
//  * @param {!Blockly.Block} block The block.
//  * @param {string} atId The property ID of the element to get.
//  * @param {number=} opt_delta Value to add.
//  * @param {boolean=} opt_negate Whether to negate the value.
//  * @param {number=} opt_order The highest order acting on this value.
//  * @return {string|number}
//  */
// RGenerator.getAdjusted = function(block, atId, opt_delta, opt_negate,
//     opt_order) {
//   var delta = opt_delta || 0;
//   var order = opt_order || RGenerator.ORDER_NONE;
//   if (block.workspace.options.oneBasedIndex) {
//     delta--;
//   }
//   var defaultAtIndex = block.workspace.options.oneBasedIndex ? '1' : '0';
//   if (delta > 0) {
//     var at = RGenerator.valueToCode(block, atId,
//         RGenerator.ORDER_ADDITION) || defaultAtIndex;
//   } else if (delta < 0) {
//     var at = RGenerator.valueToCode(block, atId,
//         RGenerator.ORDER_SUBTRACTION) || defaultAtIndex;
//   } else if (opt_negate) {
//     var at = RGenerator.valueToCode(block, atId,
//         RGenerator.ORDER_UNARY_NEGATION) || defaultAtIndex;
//   } else {
//     var at = RGenerator.valueToCode(block, atId, order) ||
//         defaultAtIndex;
//   }

//   if (Blockly.isNumber(at)) {
//     // If the index is a naked number, adjust it right now.
//     at = Number(at) + delta;
//     if (opt_negate) {
//       at = -at;
//     }
//   } else {
//     // If the index is dynamic, adjust it in code.
//     if (delta > 0) {
//       at = at + ' + ' + delta;
//       var innerOrder = RGenerator.ORDER_ADDITION;
//     } else if (delta < 0) {
//       at = at + ' - ' + -delta;
//       var innerOrder = RGenerator.ORDER_SUBTRACTION;
//     }
//     if (opt_negate) {
//       if (delta) {
//         at = '-(' + at + ')';
//       } else {
//         at = '-' + at;
//       }
//       var innerOrder = RGenerator.ORDER_UNARY_NEGATION;
//     }
//     innerOrder = Math.floor(innerOrder);
//     order = Math.floor(order);
//     if (innerOrder && order >= innerOrder) {
//       at = '(' + at + ')';
//     }
//   }
//   return at;
// };

// AO: skipping colour.js

//***********************************************************************
//lists.js
RGenerator.lists = {}

RGenerator['lists_create_empty'] = function(block) {
  // Create an empty list.
  return ['list()', RGenerator.ORDER_ATOMIC];
};

RGenerator['lists_create_with'] = function(block) {
  // Create a list with any number of elements of any type.
  var elements = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] = RGenerator.valueToCode(block, 'ADD' + i,
        RGenerator.ORDER_COMMA) || 'NULL'; //AO: think NULL better than NA here
  }
  var code = 'list(' + elements.join(', ') + ')';
  return [code, RGenerator.ORDER_ATOMIC];
};

RGenerator['lists_repeat'] = function(block) {
  // Create a list with one element repeated.
  var element = RGenerator.valueToCode(block, 'ITEM',
      RGenerator.ORDER_COMMA) || 'NULL'; //AO: think NULL better than NA here
  var repeatCount = RGenerator.valueToCode(block, 'NUM',
      RGenerator.ORDER_COMMA) || '0';
  var code = "as.list(rep(" + element +  ', ' + repeatCount + '))';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['lists_length'] = function(block) {
  // String or array length.
  var list = RGenerator.valueToCode(block, 'VALUE',
      RGenerator.ORDER_MEMBER) || 'list()';
  return [ 'length(' + list + ')', RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['lists_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var list = RGenerator.valueToCode(block, 'VALUE',
      RGenerator.ORDER_MEMBER) || 'list()';
  return ['!' + 'length(' + list + ')', RGenerator.ORDER_LOGICAL_NOT];
};

RGenerator['lists_indexOf'] = function(block) {
  // Find an item in the list.
  // var operator = block.getFieldValue('END') == 'FIRST' ?
  //     'indexOf' : 'lastIndexOf';
  var item = RGenerator.valueToCode(block, 'FIND',
      RGenerator.ORDER_NONE) || '\"\"';
  var list = RGenerator.valueToCode(block, 'VALUE',
      RGenerator.ORDER_MEMBER) || 'list()';
  var code = ""
  if (block.getFieldValue('END') == 'FIRST') {
    code = 'match(' + item + ',' + list + ')'
  }
  else {
    code = 'length(' + list + ') + 1L - match(' + item + ', rev(' + list + '))'
    //length(l) + 1L - match("j",rev(l))
  }
  //list + '.' + operator + '(' + item + ')';
  // if (block.workspace.options.oneBasedIndex) {
  //   return [code + ' + 1', RGenerator.ORDER_ADDITION];
  // }
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['lists_getIndex'] = function(block) {
  // Get element at index.
  // Note: Until January 2013 this block did not have MODE or WHERE inputs.
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var listOrder = (where == 'RANDOM') ? RGenerator.ORDER_COMMA :
      RGenerator.ORDER_MEMBER;
  var list = RGenerator.valueToCode(block, 'VALUE', listOrder) || 'list()';

  switch (where) {
    case ('FIRST'):
      if (mode == 'GET') {
        var code = list + '[1]';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var listVar = RGenerator.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var code = listVar + '<-' + list + '\n' + list + '<-' + list + '[-1]\n' + listVar + '[1]';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '[1] <- NULL\n';
      }
      break;
    case ('LAST'): 
      if (mode == 'GET') {
        var code = list + '[length(' + list + ')]';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var listVar = RGenerator.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var code = listVar + '<-' + list + '\n' + list + '<-' + list + '[-length(' + list + ')]\n' + listVar + '[length(' + list + ')]';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '[length(' + list + ')] <- NULL\n';
      }
      break;
    case ('FROM_START'):
      var at = RGenerator.valueToCode(block, 'AT', RGenerator.ORDER_NONE) ||    '1';
      if (mode == 'GET') {
        var code = list + '[' + at + ']';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var listVar = RGenerator.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var code = listVar + '<-' + list + '\n' + list + '<-' + list + '[-' + at + ']\n' + listVar + '[' + at + ']';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '[' + at + '] <- NULL\n';
      }
      break;
    case ('FROM_END'):
      var at = RGenerator.valueToCode(block, 'AT', RGenerator.ORDER_NONE) ||    '1';
      if (mode == 'GET') {
        var code = list + '[length(' + list + ') -' + at + ']';
        return [code, RGenerator.ORDER_FUNCTION_CALL];
      } else if (mode == 'GET_REMOVE') {
        var listVar = RGenerator.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var code = listVar + '<-' + list + '\n' + list + '<-' + list + '[-(length(' + list + ') -' + at + ')]\n' + listVar + '[length(' + list + ') -' + at + ']';
        return [code, RGenerator.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        return list + '[length(' + list + ') -' + at + '] <- NULL\n';
      }
      break;
    case ('RANDOM'):
      var at = 'sample(1:length(' + list + '),1)'
      if (mode == 'GET') {
        var code = list + '[' + at + ']';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var listVar = RGenerator.variableDB_.getDistinctName(
          'tmp_list', Blockly.Variables.NAME_TYPE);
        var atVar = RGenerator.variableDB_.getDistinctName(
          'at_var', Blockly.Variables.NAME_TYPE);
        var code = atVar + '<-' + at + '\n' + listVar + '<-' + list + '\n' + list + '<-' + list + '[-' + atVar + ']\n' + listVar + '[' + atVar + ']';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'REMOVE') {
        return list + '[' + at + '] <- NULL\n';
      }
      break;
  }
  throw Error('Unhandled combination (lists_getIndex).');
};

RGenerator['lists_setIndex'] = function(block) {
  // Set element at index.
  // Note: Until February 2013 this block did not have MODE or WHERE inputs.
  var list = RGenerator.valueToCode(block, 'LIST',
      RGenerator.ORDER_MEMBER) || 'list()';
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var value = RGenerator.valueToCode(block, 'TO',
      RGenerator.ORDER_ASSIGNMENT) || 'NULL'; //AO: think NULL better than NA here

  switch (where) {
    case ('FIRST'):
      if (mode == 'SET') {
        return list + '[1] <- ' + value + '\n';
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + '1)\n';
      }
      break;
    case ('LAST'):
      if (mode == 'SET') {
        return list + '[length(' + list + ')] <- ' + value + '\n';
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + ', length(' + list + '))\n';
      }
      break;
    case ('FROM_START'):
      var at = RGenerator.valueToCode(block, 'AT', RGenerator.ORDER_NONE) ||    '1';
      if (mode == 'SET') {
        return list + '[' + at + '] <- ' + value + ';\n';
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + ', ' + at + ')\n';
      }
      break;
    case ('FROM_END'):
      var at = RGenerator.valueToCode(block, 'AT', RGenerator.ORDER_NONE) ||    '1';
      if (mode == 'SET') {
        return list + '[length(' + list + ') -' + at + '] <- ' + value + ';\n';
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + ', length(' + list + ') -' +  at + ')\n';
      }
      break;
    case ('RANDOM'):
      var at = 'sample(1:length(' + list + '),1)'
      if (mode == 'SET') {
        var code = list + '[' + at + '] <- ' + value + ';\n';
        return [code, RGenerator.ORDER_MEMBER];
      } else if (mode == 'INSERT') {
        return 'append(' + list + ',' + value + ', ' + at + ')\n';
      } 
      break;
  }
  throw Error('Unhandled combination (lists_setIndex).');
};

/**
 * AO: this appears to be internal only....
 * Returns an expression calculating the index into a list.
 * @param {string} listName Name of the list, used to calculate length.
 * @param {string} where The method of indexing, selected by dropdown in Blockly
 * @param {string=} opt_at The optional offset when indexing from start/end.
 * @return {string} Index expression.
 * @private
 */
RGenerator.lists.getIndex_ = function(listName, where, opt_at) {
  if (where == 'FIRST') {
    return '0';
  } else if (where == 'FROM_END') {
    return 'length(' + listName + ') - ' + opt_at;
  } else if (where == 'LAST') {
    return 'length(' + listName + ')';
  } else {
    return opt_at;
  }
};

RGenerator['lists_getSublist'] = function(block) {
  // Get sublist.
  var list = RGenerator.valueToCode(block, 'LIST',
      RGenerator.ORDER_MEMBER) || 'list()';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = list ;
  } else {
    // If the list is a variable or doesn't require a call for length, don't
    // generate a helper function.
    switch (where1) {
      case 'FROM_START':
        var at1 = RGenerator.valueToCode(block, 'AT1', RGenerator.ORDER_NONE) ||    '1';
        break;
      case 'FROM_END':
        var at1 = RGenerator.valueToCode(block, 'AT1', RGenerator.ORDER_NONE) ||    '1';
        at1 = 'length(' + list + ') - ' + at1;
        break;
      case 'FIRST':
        var at1 = '1';
        break;
      default:
        throw Error('Unhandled option (lists_getSublist).');
    }
    switch (where2) {
      case 'FROM_START':
        var at2 = RGenerator.valueToCode(block, 'AT2', RGenerator.ORDER_NONE) ||    '1';
        break;
      case 'FROM_END':
        var at2 = RGenerator.valueToCode(block, 'AT2', RGenerator.ORDER_NONE) ||    '1';
        at2 = 'length(' + list + ') - '  + at2;
        break;
      case 'LAST':
        var at2 = 'length(' + list + ')' ;
        break;
      default:
        throw Error('Unhandled option (lists_getSublist).');
    }
  code = list + '[' + at1 + ':' + at2 + ']';
  }
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['lists_sort'] = function(block) {
  // Block for sorting a list.
  var list = RGenerator.valueToCode(block, 'LIST',
      RGenerator.ORDER_FUNCTION_CALL) || 'list()';
  var direction = block.getFieldValue('DIRECTION') === '1' ? 'FALSE' : 'TRUE';
  //AO: doesn't seem like R allows us to mess with type (numeric/alphabetical)
  var type = block.getFieldValue('TYPE');
  var code = 'as.list(sort(unlist(' + list + '), decreasing=' + direction + '))';
  return [code,   RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['lists_split'] = function(block) {
  // Block for splitting text into a list, or joining a list into text.
  var input = RGenerator.valueToCode(block, 'INPUT',
      RGenerator.ORDER_MEMBER);
  var delimiter = RGenerator.valueToCode(block, 'DELIM',
      RGenerator.ORDER_NONE) || '\"\"';
  var mode = block.getFieldValue('MODE');
  if (mode == 'SPLIT') {
    if (!input) {
      input = '\"\"';
    }
    var code = 'as.list(unlist(strsplit(' + input + ', ' + delimiter + ')))'; //AO note delimiter is regex
  } else if (mode == 'JOIN') {
    if (!input) {
      input = 'list()';
    }
    var code = 'paste0(' + input + ',collapse=' + delimiter + ')';
  } else {
    throw Error('Unknown mode: ' + mode);
  }
  // var code = input + '.' + functionName + '(' + delimiter + ')';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['lists_reverse'] = function(block) {
  // Block for reversing a list.
  var list = RGenerator.valueToCode(block, 'LIST',
      RGenerator.ORDER_FUNCTION_CALL) || 'list';
  var code = 'rev(' + list + ')';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

//***********************************************************************
//text.js

RGenerator['text'] = function(block) {
  // Text value.
  var code = RGenerator.quote_(block.getFieldValue('TEXT'));
  return [code, RGenerator.ORDER_ATOMIC];
};

RGenerator['text_multiline'] = function(block) {
  // Text value.
  var code = RGenerator.multiline_quote_(block.getFieldValue('TEXT'));
  return [code, RGenerator.ORDER_ATOMIC];
};

/**
 * Enclose the provided value in 'String(...)' function.
 * Leave string literals alone.
 * @param {string} value Code evaluating to a value.
 * @return {string} Code evaluating to a string.
 * @private
 */
RGenerator.text.forceString_ = function(value) {
  if (RGenerator.text.forceString_.strRegExp.test(value)) {
    return value;
  }
  return 'toString(' + value + ')';
};

/**
 * Regular expression to detect a single-quoted string literal.
 */
RGenerator.text.forceString_.strRegExp = /^\s*'([^']|\\')*'\s*$/;

RGenerator['text_join'] = function(block) {
  // Create a string made up of any number of elements of any type.
  switch (block.itemCount_) {
    case 0:
      return ['\"\"', RGenerator.ORDER_ATOMIC];
    case 1:
      var element = RGenerator.valueToCode(block, 'ADD0',
          RGenerator.ORDER_NONE) || '\"\"';
      var code = RGenerator.text.forceString_(element);
      return [code, RGenerator.ORDER_FUNCTION_CALL];
    case 2:
      var element0 = RGenerator.valueToCode(block, 'ADD0',
          RGenerator.ORDER_NONE) || '\"\"';
      var element1 = RGenerator.valueToCode(block, 'ADD1',
          RGenerator.ORDER_NONE) || '\"\"';
      var code = 'paste0(' + RGenerator.text.forceString_(element0) + ', ' +
          RGenerator.text.forceString_(element1) + ')';
      return [code, RGenerator.ORDER_ADDITION];
    default:
      var elements = new Array(block.itemCount_);
      for (var i = 0; i < block.itemCount_; i++) {
        elements[i] = RGenerator.valueToCode(block, 'ADD' + i,
            RGenerator.ORDER_COMMA) || '\"\"';
      }
      var code = 'paste0(' + elements.join(', ') + ')';
      return [code, RGenerator.ORDER_FUNCTION_CALL];
  }
};

RGenerator['text_append'] = function(block) {
  // Append to a variable in place.
  var varName = RGenerator.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var value = RGenerator.valueToCode(block, 'TEXT',
      RGenerator.ORDER_NONE) || '\"\"';
  return varName + ' <- paste0(' + varName + ', ' + RGenerator.text.forceString_(value) + ')\n';
};

RGenerator['text_length'] = function(block) {
  // String or array length.
  var text = RGenerator.valueToCode(block, 'VALUE',
      RGenerator.ORDER_FUNCTION_CALL) || '\"\"';
  var code = 'nchar(' + text + ')';
  return [code, RGenerator.ORDER_MEMBER];
};

RGenerator['text_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var text = RGenerator.valueToCode(block, 'VALUE',
      RGenerator.ORDER_MEMBER) || '\"\"';
  var code = '(is.na(' + text + ') || ' + text + ' == "")';
  return [code, RGenerator.ORDER_LOGICAL_NOT];
};

RGenerator['text_indexOf'] = function(block) {
  // Search the text for a substring.
  var operator = block.getFieldValue('END') == 'FIRST' ?
      'indexOf' : 'lastIndexOf';
  var substring = RGenerator.valueToCode(block, 'FIND',
      RGenerator.ORDER_NONE) || '\"\"';
  var text = RGenerator.valueToCode(block, 'VALUE',
      RGenerator.ORDER_MEMBER) || '\"\"';
  if( operator === 'indexOf' ) {
    var code = 'regexpr(' + substring + ',' + text + ')';
  } else {
    var reverseText = 'paste(rev(strsplit(' + text + ', "")[[1]]),collapse="")';
    var reverseSubstring = 'paste(rev(strsplit(' + substring + ', "")[[1]]),collapse="")';
    var code = 'nchar(' + text + ') + 1L - nchar(' + substring +') + 1 - regexpr(' + reverseSubstring + ', ' + reverseText + ')';
  }
  // Adjust index if using one-based indices.
  // if (block.workspace.options.oneBasedIndex) {
  //   return [code + ' + 1', RGenerator.ORDER_ADDITION];
  // }
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['text_charAt'] = function(block) {
  // Get letter at index.
  // Note: Until January 2013 this block did not have the WHERE input.
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var textOrder = (where == 'RANDOM') ? RGenerator.ORDER_NONE :
      RGenerator.ORDER_MEMBER;
  var text = RGenerator.valueToCode(block, 'VALUE',
      textOrder) || '\"\"';
  switch (where) {
    case 'FIRST':
      var code = 'substr(' + text + ', 1, 1)';
      return [code, RGenerator.ORDER_FUNCTION_CALL];
    case 'LAST':
      var code = 'substr(' + text + ', nchar(' + text + '), nchar(' + text + '))';
      return [code, RGenerator.ORDER_FUNCTION_CALL];
    case 'FROM_START':
      var at = RGenerator.valueToCode(block, 'AT', RGenerator.ORDER_NONE) ||    '1';
      var code = 'substr(' + text + ', ' + at + ',' + at + ')';
      return [code, RGenerator.ORDER_FUNCTION_CALL];
    case 'FROM_END':
      var at = RGenerator.valueToCode(block, 'AT', RGenerator.ORDER_NONE) ||    '1';
      var code = 'substr(' + text + ', nchar(' + text + ') - ' + at + ', nchar(' + text + ') - ' + at + ')';
      return [code, RGenerator.ORDER_FUNCTION_CALL];
    case 'RANDOM':
      var at = 'sample(1:nchar(' + text + '),1)'
      var code = 'substr(' + text + ', ' + at + ',' + at + ')';
      return [code, RGenerator.ORDER_FUNCTION_CALL];
  }
  throw Error('Unhandled option (text_charAt).');
};

/**
 * Returns an expression calculating the index into a string.
 * @param {string} stringName Name of the string, used to calculate length.
 * @param {string} where The method of indexing, selected by dropdown in Blockly
 * @param {string=} opt_at The optional offset when indexing from start/end.
 * @return {string} Index expression.
 * @private
 */
RGenerator.text.getIndex_ = function(stringName, where, opt_at) {
  if (where == 'FIRST') {
    return '0';
  } else if (where == 'FROM_END') {
    return stringName + '.length - 1 - ' + opt_at;
  } else if (where == 'LAST') {
    return stringName + '.length - 1';
  } else {
    return opt_at;
  }
};

RGenerator['text_getSubstring'] = function(block) {
  // Get substring.
  var text = RGenerator.valueToCode(block, 'STRING',
      RGenerator.ORDER_FUNCTION_CALL) || '\"\"';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = text;
  } else {
    // If the text is a variable or literal or doesn't require a call for
    // length, don't generate a helper function.
    switch (where1) {
      case 'FROM_START':
        var at1 = RGenerator.valueToCode(block, 'AT1', RGenerator.ORDER_NONE) ||    '1';
        break;
      case 'FROM_END':
        var at1 = RGenerator.valueToCode(block, 'AT1', RGenerator.ORDER_NONE) ||    '1';
        at1 = 'nchar(' + text + ') - ' + at1 ;
        break;
      case 'FIRST':
        var at1 = '0';
        break;
      default:
        throw Error('Unhandled option (text_getSubstring).');
    }
    switch (where2) {
      case 'FROM_START':
        var at2 = RGenerator.valueToCode(block, 'AT2', RGenerator.ORDER_NONE) ||    '1';
        break;
      case 'FROM_END':
        var at2 = RGenerator.valueToCode(block, 'AT2', RGenerator.ORDER_NONE) ||    '1';
        at2 = 'nchar(' + text + ') - ' + at2 ;
        break;
      case 'LAST':
        var at2 = 'nchar(' + text + ')';
        break;
      default:
        throw Error('Unhandled option (text_getSubstring).');
    }
    var code = 'substr(' + text + ', ' + at1 + ', ' + at2 + ')';
  } 
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['text_changeCase'] = function(block) {
  // Change capitalization.
  var operator = block.getFieldValue('CASE');
  var textOrder = operator ? RGenerator.ORDER_MEMBER :
      RGenerator.ORDER_NONE;
  var text = RGenerator.valueToCode(block, 'TEXT',
      textOrder) || '\"\"';
  if (operator === 'UPPERCASE' ) {
    var code = 'toupper(' + text + ')';
  } else if (operator === 'LOWERCASE' ) {
    var code = 'tolower(' + text + ')';
  } else {
    var code = 'tools::toTitleCase(' + text + ')';
  }
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['text_trim'] = function(block) {
  // Trim spaces.
  var operator = block.getFieldValue('MODE');
  var text = RGenerator.valueToCode(block, 'TEXT',
      RGenerator.ORDER_MEMBER) || '\"\"';
  if (operator === 'LEFT' ) {
    var code = 'trimws(' + text + ', "left")';
  } else if (operator === 'RIGHT' ) {
    var code = 'trimws(' + text + ', "right")';
  } else {
    var code = 'trimws(' + text + ', "both")';
  }
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['text_print'] = function(block) {
  // Print statement.
  var msg = RGenerator.valueToCode(block, 'TEXT',
      RGenerator.ORDER_NONE) || '\"\"';
  return 'print(' + msg + ');\n';
};

RGenerator['text_prompt_ext'] = function(block) {
  // Prompt function.
  if (block.getField('TEXT')) {
    // Internal message.
    var msg = RGenerator.quote_(block.getFieldValue('TEXT'));
  } else {
    // External message.
    var msg = RGenerator.valueToCode(block, 'TEXT',
        RGenerator.ORDER_NONE) || '\"\"';
  }
  var code = 'readline(' + msg + ')';
  var toNumber = block.getFieldValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = 'as.numeric(' + code + ')';
  }
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['text_prompt'] = RGenerator['text_prompt_ext'];

RGenerator['text_count'] = function(block) {
  var text = RGenerator.valueToCode(block, 'TEXT',
      RGenerator.ORDER_MEMBER) || '\"\"';
  var sub = RGenerator.valueToCode(block, 'SUB',
      RGenerator.ORDER_NONE) || '\"\"';
  var code = 'lengths(regmatches(' + text + ', gregexpr(' + sub + ', ' + text + ')))';
  return [code, RGenerator.ORDER_SUBTRACTION];
};

RGenerator['text_replace'] = function(block) {
  var text = RGenerator.valueToCode(block, 'TEXT',
      RGenerator.ORDER_MEMBER) || '\"\"';
  var from = RGenerator.valueToCode(block, 'FROM',
      RGenerator.ORDER_NONE) || '\"\"';
  var to = RGenerator.valueToCode(block, 'TO',
      RGenerator.ORDER_NONE) || '\"\"';
  var code = 'gsub(' + to + ',' + from + ',' + text + ',fixed=TRUE)';
  return [code, RGenerator.ORDER_MEMBER];
};

RGenerator['text_reverse'] = function(block) {
  var text = RGenerator.valueToCode(block, 'TEXT',
      RGenerator.ORDER_MEMBER) || '\"\"';
  var code = 'paste(rev(strsplit(' + text + ', "")[[1]]),collapse="")';
  return [code, RGenerator.ORDER_MEMBER];
};

//***********************************************************************
//math.js

RGenerator['math_number'] = function(block) {
  // Numeric value.
  var code = Number(block.getFieldValue('NUM'));
  if (code == Infinity) {
    code = 'Inf';
  } else if (code == -Infinity) {
    code = '-Inf';
  } 
  var order = code >= 0 ? RGenerator.ORDER_ATOMIC :
              RGenerator.ORDER_UNARY_NEGATION;
  return [code, order];
};

RGenerator['math_arithmetic'] = function(block) {
  // Basic arithmetic operators, and power.
  var OPERATORS = {
    'ADD': [' + ', RGenerator.ORDER_ADDITION],
    'MINUS': [' - ', RGenerator.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', RGenerator.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', RGenerator.ORDER_DIVISION],
    'POWER': [' ^ ', RGenerator.ORDER_EXPONENTIATION]  
  };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = RGenerator.valueToCode(block, 'A', order) || '0';
  var argument1 = RGenerator.valueToCode(block, 'B', order) || '0';
  var code;
  code = argument0 + operator + argument1;
  return [code, order];
};

RGenerator['math_single'] = function(block) {
  // Math operators with single operand.
  var operator = block.getFieldValue('OP');
  var code;
  var arg;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = RGenerator.valueToCode(block, 'NUM',
        RGenerator.ORDER_UNARY_NEGATION) || '0';
    code = '-' + arg;
    return [code, RGenerator.ORDER_UNARY_NEGATION];
  }
  if (operator == 'SIN' || operator == 'COS' || operator == 'TAN') {
    arg = RGenerator.valueToCode(block, 'NUM',
        RGenerator.ORDER_DIVISION) || '0';
  } else {
    arg = RGenerator.valueToCode(block, 'NUM',
        RGenerator.ORDER_NONE) || '0';
  }
  // First, handle cases which generate values that don't need parentheses
  // wrapping the code.
  switch (operator) {
    case 'ABS':
      code = 'abs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'log(' + arg + ')';
      break;
    case 'EXP':
      code = 'exp(' + arg + ')';
      break;
    case 'POW10':
      code = '10 ** ' + arg ;
      break;
    case 'ROUND':
      code = 'round(' + arg + ')';
      break;
    case 'ROUNDUP':
      code = 'ceiling(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'sin(' + arg +' *pi/180)';
      break;
    case 'COS':
      code = 'cos(' + arg +' *pi/180)';
      break;
    case 'TAN':
      code = 'tan(' + arg +' *pi/180)';
      break;
  }
  if (code) {
    return [code, RGenerator.ORDER_FUNCTION_CALL];
  }
  // Second, handle cases which generate values that may need parentheses
  // wrapping the code.
  switch (operator) {
    case 'LOG10':
      code = 'log10(' + arg + ')';
      break;
    case 'ASIN':
      code = 'asin(' + arg +' *pi/180)';
      break;
    case 'ACOS':
      code = 'acos(' + arg +' *pi/180)';
      break;
    case 'ATAN':
      code = 'atan(' + arg +' *pi/180)';
      break;
    default:
      throw Error('Unknown math operator: ' + operator);
  }
  return [code, RGenerator.ORDER_DIVISION];
};

RGenerator['math_constant'] = function(block) {
  // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
  var CONSTANTS = {
    'PI': ['pi', RGenerator.ORDER_MEMBER],
    'E': ['exp(1)', RGenerator.ORDER_MEMBER],
    'GOLDEN_RATIO':
        ['(1 + sqrt(5)) / 2', RGenerator.ORDER_DIVISION],
    'SQRT2': ['sqrt(2)', RGenerator.ORDER_MEMBER],
    'SQRT1_2': ['sqrt(.5)', RGenerator.ORDER_MEMBER],
    'INFINITY': ['Inf', RGenerator.ORDER_ATOMIC]
  };
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

RGenerator['math_number_property'] = function(block) {
  // Check if a number is even, odd, prime, whole, positive, or negative
  // or if it is divisible by certain number. Returns true or false.
  var number_to_check = RGenerator.valueToCode(block, 'NUMBER_TO_CHECK',
      RGenerator.ORDER_MODULUS) || '0';
  var dropdown_property = block.getFieldValue('PROPERTY');
  var code;
  if (dropdown_property == 'PRIME') {
    code = number_to_check + ' == 2L || all(' + number_to_check + ' %% 2L:max(2,floor(sqrt(' + number_to_check + '))) != 0)' ;
    return [code, RGenerator.ORDER_FUNCTION_CALL];
  }
  switch (dropdown_property) {
    case 'EVEN':
      code = number_to_check + ' %% 2 == 0';
      break;
    case 'ODD':
      code = number_to_check + ' %% 2 == 1';
      break;
    case 'WHOLE':
      code = number_to_check + ' %% 1 == 0';
      break;
    case 'POSITIVE':
      code = number_to_check + ' > 0';
      break;
    case 'NEGATIVE':
      code = number_to_check + ' < 0';
      break;
    case 'DIVISIBLE_BY':
      var divisor = RGenerator.valueToCode(block, 'DIVISOR',
          RGenerator.ORDER_MODULUS) || '0';
      code = number_to_check + ' %% ' + divisor + ' == 0';
      break;
  }
  return [code, RGenerator.ORDER_EQUALITY];
};

RGenerator['math_change'] = function(block) {
  // Add to a variable in place.
  var argument0 = RGenerator.valueToCode(block, 'DELTA',
      RGenerator.ORDER_ADDITION) || '0';
  var varName = RGenerator.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  return varName + ' = ifelse( length(' + varName + ')>0 & is.numeric(' + varName+ '),' + varName + ' + ' + argument0 + ',' + argument0 + ' )';
};

// Rounding functions have a single operand.
RGenerator['math_round'] = RGenerator['math_single'];
// Trigonometry functions have a single operand.
RGenerator['math_trig'] = RGenerator['math_single'];

RGenerator['math_on_list'] = function(block) {
  // Math functions for lists.
  var func = block.getFieldValue('OP');
  var list, code;
  switch (func) {
    case 'SUM':
      list = RGenerator.valueToCode(block, 'LIST',
          RGenerator.ORDER_MEMBER) || 'list()';
      code = 'sum(unlist(' + list + '))';
      break;
    case 'MIN':
      list = RGenerator.valueToCode(block, 'LIST',
          RGenerator.ORDER_COMMA) || 'list()';
      code = 'min(unlist(' + list + '))';
      break;
    case 'MAX':
      list = RGenerator.valueToCode(block, 'LIST',
          RGenerator.ORDER_COMMA) || 'list()';
      code = 'max(unlist(' + list + '))';
      break;
    case 'AVERAGE':
      list = RGenerator.valueToCode(block, 'LIST',
          RGenerator.ORDER_NONE) || 'list()';
      code = 'mean(unlist(' + list + '))';
      break;
    case 'MEDIAN':
      list = RGenerator.valueToCode(block, 'LIST',
          RGenerator.ORDER_NONE) || 'list()';
      code = 'median(unlist(' + list + '))';
      break;
    case 'MODE':
      list = RGenerator.valueToCode(block, 'LIST',
          RGenerator.ORDER_NONE) || 'list()';
      code = 'unique(unlist(' + list + '))[which.max(tabulate(match(' + list + ', unique(unlist(' + list + ')))))]';
      break;
    case 'STD_DEV':
      list = RGenerator.valueToCode(block, 'LIST',
          RGenerator.ORDER_NONE) || 'list()';
      code = 'sd(unlist(' + list + '))';
      break;
    case 'RANDOM':
      list = RGenerator.valueToCode(block, 'LIST',
          RGenerator.ORDER_NONE) || 'list()';
      code = 'list[sample(1:length(' + list + '),1)]';
      break;
    default:
      throw Error('Unknown operator: ' + func);
  }
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['math_modulo'] = function(block) {
  // Remainder computation.
  var argument0 = RGenerator.valueToCode(block, 'DIVIDEND',
      RGenerator.ORDER_MODULUS) || '0';
  var argument1 = RGenerator.valueToCode(block, 'DIVISOR',
      RGenerator.ORDER_MODULUS) || '0';
  var code = argument0 + ' %% ' + argument1;
  return [code, RGenerator.ORDER_MODULUS];
};

RGenerator['math_constrain'] = function(block) {
  // Constrain a number between two limits.
  var argument0 = RGenerator.valueToCode(block, 'VALUE',
      RGenerator.ORDER_COMMA) || '0';
  var argument1 = RGenerator.valueToCode(block, 'LOW',
      RGenerator.ORDER_COMMA) || '0';
  var argument2 = RGenerator.valueToCode(block, 'HIGH',
      RGenerator.ORDER_COMMA) || 'Inf';
  var code = 'min(max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['math_random_int'] = function(block) {
  // Random integer between [X] and [Y].
  var argument0 = RGenerator.valueToCode(block, 'FROM',
      RGenerator.ORDER_COMMA) || '0';
  var argument1 = RGenerator.valueToCode(block, 'TO',
      RGenerator.ORDER_COMMA) || '0';
  var code = 'sample(' + argument0 + ':' + argument1 + ',1)';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['math_random_float'] = function(block) {
  // Random fraction between 0 and 1.
  return ['runif(1,0,1)', RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['math_atan2'] = function(block) {
  // Arctangent of point (X, Y) in degrees from -180 to 180.
  var argument0 = RGenerator.valueToCode(block, 'X',
      RGenerator.ORDER_COMMA) || '0';
  var argument1 = RGenerator.valueToCode(block, 'Y',
      RGenerator.ORDER_COMMA) || '0';
  return ['atan2(' + argument1 + ', ' + argument0 + ') / pi * 180',
      RGenerator.ORDER_DIVISION];
};

//***********************************************************************
//variables.js

RGenerator['variables_get'] = function(block) {
  // Variable getter.
  var code = RGenerator.variableDB_.getName(block.getFieldValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  return [code, RGenerator.ORDER_ATOMIC];
};

RGenerator['variables_set'] = function(block) {
  // Variable setter.
  var argument0 = RGenerator.valueToCode(block, 'VALUE',
      RGenerator.ORDER_NONE) || '0';
  var varName = RGenerator.variableDB_.getName(block.getFieldValue('VAR'),
      Blockly.Variables.NAME_TYPE);
  return varName + ' = ' + argument0 + '\n';
};

//***********************************************************************
//variables_dynamic.js

// AO: not sure what this does...
// R is dynamically typed.
RGenerator['variables_get_dynamic'] =
    RGenerator['variables_get'];
RGenerator['variables_set_dynamic'] =
    RGenerator['variables_set'];

//***********************************************************************
//logic.js

RGenerator['controls_if'] = function(block) {
  // If/elseif/else condition.
  var n = 0;
  var code = '', branchCode, conditionCode;
  if (RGenerator.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    code += RGenerator.injectId(RGenerator.STATEMENT_PREFIX,
        block);
  }
  do {
    conditionCode = RGenerator.valueToCode(block, 'IF' + n,
        RGenerator.ORDER_NONE) || 'FALSE';
    branchCode = RGenerator.statementToCode(block, 'DO' + n);
    if (RGenerator.STATEMENT_SUFFIX) {
      branchCode = RGenerator.prefixLines(
          RGenerator.injectId(RGenerator.STATEMENT_SUFFIX,
          block), RGenerator.INDENT) + branchCode;
    }
    code += (n > 0 ? ' else ' : '') +
        'if (' + conditionCode + ') {\n' + branchCode + '}';
    ++n;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE') || RGenerator.STATEMENT_SUFFIX) {
    branchCode = RGenerator.statementToCode(block, 'ELSE');
    if (RGenerator.STATEMENT_SUFFIX) {
      branchCode = RGenerator.prefixLines(
          RGenerator.injectId(RGenerator.STATEMENT_SUFFIX,
          block), RGenerator.INDENT) + branchCode;
    }
    code += ' else {\n' + branchCode + '}';
  }
  return code + '\n';
};

RGenerator['controls_ifelse'] = RGenerator['controls_if'];

RGenerator['logic_compare'] = function(block) {
  // Comparison operator.
  var OPERATORS = {
    'EQ': '==',
    'NEQ': '!=',
    'LT': '<',
    'LTE': '<=',
    'GT': '>',
    'GTE': '>='
  };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ?
      RGenerator.ORDER_EQUALITY : RGenerator.ORDER_RELATIONAL;
  var argument0 = RGenerator.valueToCode(block, 'A', order) || '0';
  var argument1 = RGenerator.valueToCode(block, 'B', order) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

RGenerator['logic_operation'] = function(block) {
  // Operations 'and', 'or'.
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||'; //AO: R has both & and &&; && seems appropriate here
  var order = (operator == '&&') ? RGenerator.ORDER_LOGICAL_AND :
      RGenerator.ORDER_LOGICAL_OR;
  var argument0 = RGenerator.valueToCode(block, 'A', order);
  var argument1 = RGenerator.valueToCode(block, 'B', order);
  if (!argument0 && !argument1) {
    // If there are no arguments, then the return value is false.
    argument0 = 'FALSE';
    argument1 = 'FALSE';
  } else {
    // Single missing arguments have no effect on the return value.
    var defaultArgument = (operator == '&&') ? 'TRUE' : 'FALSE';
    if (!argument0) {
      argument0 = defaultArgument;
    }
    if (!argument1) {
      argument1 = defaultArgument;
    }
  }
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

RGenerator['logic_negate'] = function(block) {
  // Negation.
  var order = RGenerator.ORDER_LOGICAL_NOT;
  var argument0 = RGenerator.valueToCode(block, 'BOOL', order) ||
      'TRUE';
  var code = '!' + argument0;
  return [code, order];
};

RGenerator['logic_boolean'] = function(block) {
  // Boolean values true and false.
  var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'TRUE' : 'FALSE';
  return [code, RGenerator.ORDER_ATOMIC];
};

RGenerator['logic_null'] = function(block) {
  // Null data type.
  return ['NULL', RGenerator.ORDER_ATOMIC];
};

RGenerator['logic_ternary'] = function(block) {
  // Ternary operator.
  var value_if = RGenerator.valueToCode(block, 'IF',
      RGenerator.ORDER_CONDITIONAL) || 'FALSE';
  var value_then = RGenerator.valueToCode(block, 'THEN',
      RGenerator.ORDER_CONDITIONAL) || 'NULL';
  var value_else = RGenerator.valueToCode(block, 'ELSE',
      RGenerator.ORDER_CONDITIONAL) || 'NULL';
  var code = 'ifelse(' + value_if + ', ' + value_then + ', ' + value_else + ')'; //AO: this is vectorized ternary; other Blockly languages would not be vectorized here
  return [code, RGenerator.ORDER_CONDITIONAL];
};

//***********************************************************************
//loops.js

RGenerator['controls_repeat_ext'] = function(block) {
  // Repeat n times.
  if (block.getField('TIMES')) {
    // Internal number.
    var repeats = String(parseInt(block.getFieldValue('TIMES'), 10));
  } else {
    // External number.
    var repeats = RGenerator.valueToCode(block, 'TIMES',
        RGenerator.ORDER_NONE) || '0';
  }
  if (Blockly.isNumber(repeats)) {
    repeats = parseInt(repeats, 10);
  } else {
    repeats = 'strtoi(' + repeats + ')';
  }
  var branch = RGenerator.statementToCode(block, 'DO');
  branch = RGenerator.addLoopTrap(branch, block);
  var loopVar = RGenerator.variableDB_.getDistinctName(
      'count', Blockly.Variables.NAME_TYPE);
  var code = 'for (' + loopVar + ' in 1:' + repeats + ') {\n' +
  branch + '}\n';
  return code;
};

RGenerator['controls_repeat'] = RGenerator['controls_repeat_ext'];

RGenerator['controls_whileUntil'] = function(block) {
  // Do while/until loop.
  var until = block.getFieldValue('MODE') == 'UNTIL';
  var argument0 = RGenerator.valueToCode(block, 'BOOL',
      until ? RGenerator.ORDER_LOGICAL_NOT :
      RGenerator.ORDER_NONE) || 'FALSE';
  var branch = RGenerator.statementToCode(block, 'DO');
  branch = RGenerator.addLoopTrap(branch, block);
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'while (' + argument0 + ') {\n' + branch + '}\n';
};

RGenerator['controls_for'] = function(block) {
  // For loop.
  var variable0 = RGenerator.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = RGenerator.valueToCode(block, 'FROM',
      RGenerator.ORDER_ASSIGNMENT) || '0';
  var argument1 = RGenerator.valueToCode(block, 'TO',
      RGenerator.ORDER_ASSIGNMENT) || '0';
  var increment = RGenerator.valueToCode(block, 'BY',
      RGenerator.ORDER_ASSIGNMENT) || '1';
  var branch = RGenerator.statementToCode(block, 'DO');
  branch = RGenerator.addLoopTrap(branch, block);
  //AO: other languages have a lot of complexity; R seems to capture up/down and non integer looping intrinsically
  var code = 'for (' + variable0 + ' in seq(from=' + argument0 + ', to=' + argument1 + ', by=' + increment + ')) {\n' +
  branch + '}\n';
  return code;
};

RGenerator['controls_forEach'] = function(block) {
  // For each loop.
  var variable0 = RGenerator.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = RGenerator.valueToCode(block, 'LIST',
      RGenerator.ORDER_ASSIGNMENT) || 'list()';
  var branch = RGenerator.statementToCode(block, 'DO');
  branch = RGenerator.addLoopTrap(branch, block);
  var code = 'for (' + variable0 + ' in ' + argument0 + ') {\n' + branch + '}\n';
  return code;
};

RGenerator['controls_flow_statements'] = function(block) {
  // Flow statements: continue, break.
  var xfix = '';
  if (RGenerator.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    xfix += RGenerator.injectId(RGenerator.STATEMENT_PREFIX,
        block);
  }
  if (RGenerator.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the break/continue is triggered.
    xfix += RGenerator.injectId(RGenerator.STATEMENT_SUFFIX,
        block);
  }
  if (RGenerator.STATEMENT_PREFIX) {
    var loop = Blockly.Constants.Loops
        .CONTROL_FLOW_IN_LOOP_CHECK_MIXIN.getSurroundLoop(block);
    if (loop && !loop.suppressPrefixSuffix) {
      // Inject loop's statement prefix here since the regular one at the end
      // of the loop will not get executed if 'continue' is triggered.
      // In the case of 'break', a prefix is needed due to the loop's suffix.
      xfix += RGenerator.injectId(RGenerator.STATEMENT_PREFIX,
          loop);
    }
  }
  switch (block.getFieldValue('FLOW')) {
    case 'BREAK':
      return xfix + 'break\n';
    case 'CONTINUE':
      return xfix + 'next\n';
  }
  throw Error('Unknown flow statement.');
};

//***********************************************************************
//procedures.js

RGenerator['procedures_defreturn'] = function(block) {
  // Define a procedure with a return value.
  var funcName = RGenerator.variableDB_.getName(
      block.getFieldValue('NAME'), Blockly.Procedures.NAME_TYPE);
  var xfix1 = '';
  if (RGenerator.STATEMENT_PREFIX) {
    xfix1 += RGenerator.injectId(RGenerator.STATEMENT_PREFIX,
        block);
  }
  if (RGenerator.STATEMENT_SUFFIX) {
    xfix1 += RGenerator.injectId(RGenerator.STATEMENT_SUFFIX,
        block);
  }
  if (xfix1) {
    xfix1 = RGenerator.prefixLines(xfix1, RGenerator.INDENT);
  }
  var loopTrap = '';
  if (RGenerator.INFINITE_LOOP_TRAP) {
    loopTrap = RGenerator.prefixLines(
        RGenerator.injectId(RGenerator.INFINITE_LOOP_TRAP,
        block), RGenerator.INDENT);
  }
  var branch = RGenerator.statementToCode(block, 'STACK');
  var returnValue = RGenerator.valueToCode(block, 'RETURN',
      RGenerator.ORDER_NONE) || '';
  var xfix2 = '';
  if (branch && returnValue) {
    // After executing the function body, revisit this block for the return.
    xfix2 = xfix1;
  }
  if (returnValue) {
    returnValue = RGenerator.INDENT + 'return(' + returnValue + ')';
  }
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    args[i] = RGenerator.variableDB_.getName(block.arguments_[i],
        Blockly.Variables.NAME_TYPE);
  }
  var code = funcName + ' <- function(' + args.join(', ') + ') {\n' +
      xfix1 + loopTrap + branch + xfix2 + returnValue + '}\n';
  code = RGenerator.scrub_(block, code);
  // Add % so as not to collide with helper functions in definitions list.
  RGenerator.definitions_['%' + funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
RGenerator['procedures_defnoreturn'] =
    RGenerator['procedures_defreturn'];

RGenerator['procedures_callreturn'] = function(block) {
  // Call a procedure with a return value.
  var funcName = RGenerator.variableDB_.getName(
      block.getFieldValue('NAME'), Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    args[i] = RGenerator.valueToCode(block, 'ARG' + i,
        RGenerator.ORDER_COMMA) || 'NULL';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['procedures_callnoreturn'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.
  var tuple = RGenerator['procedures_callreturn'](block);
  return tuple[0] + '\n';
};

RGenerator['procedures_ifreturn'] = function(block) {
  // Conditionally return value from a procedure.
  var condition = RGenerator.valueToCode(block, 'CONDITION',
      RGenerator.ORDER_NONE) || 'FALSE';
  var code = 'if (' + condition + ') {\n';
  if (RGenerator.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the return is triggered.
    code += RGenerator.prefixLines(
        RGenerator.injectId(RGenerator.STATEMENT_SUFFIX, block),
        RGenerator.INDENT);
  }
  if (block.hasReturnValue_) {
    var value = RGenerator.valueToCode(block, 'VALUE',
        RGenerator.ORDER_NONE) || 'NULL';
    code += RGenerator.INDENT + 'return(' + value + ')\n';
  } else {
    code += RGenerator.INDENT + 'return(NULL)\n'; //AO: R returns last expression event without a return statement. If we return NULL, we *might* achieve the desired behavior
  }
  code += '}\n';
  return code;
};
//***********************************************************************
//colour.js

RGenerator['colour_picker'] = function(block) {
  // Colour picker.
  var code = RGenerator.quote_(block.getFieldValue('COLOUR'));
  return [code, RGenerator.ORDER_ATOMIC];
};

RGenerator['colour_random'] = function(block) {
  // Generate a random colour.
  var code = 'rgb(sample(1:255,1),sample(1:255,1),sample(1:255,1),maxColorValue=255)';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['colour_rgb'] = function(block) {
  // Compose a colour from RGB components expressed as percentages.
  var red = RGenerator.valueToCode(block, 'RED',
      RGenerator.ORDER_COMMA) || 0;
  var green = RGenerator.valueToCode(block, 'GREEN',
      RGenerator.ORDER_COMMA) || 0;
  var blue = RGenerator.valueToCode(block, 'BLUE',
      RGenerator.ORDER_COMMA) || 0;
  var code = 'rgb(' + red + ', ' + green + ', ' + blue + ',maxColorValue=255)';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

RGenerator['colour_blend'] = function(block) {
  // Blend two colours together.
  var c1 = RGenerator.valueToCode(block, 'COLOUR1',
      RGenerator.ORDER_COMMA) || '\'#000000\'';
  var c2 = RGenerator.valueToCode(block, 'COLOUR2',
      RGenerator.ORDER_COMMA) || '\'#000000\'';
  var ratio = RGenerator.valueToCode(block, 'RATIO',
      RGenerator.ORDER_COMMA) || 0.5;
  //AO: this could reasonably be a function, but avoiding that because of current function handling issues
  var code = 'c1 <- col2rgb(' + c1 + ')\n' +
            'c2 <- col2rgb(' + c2 + ')\n' +
            'r <- sqrt((1 - ' + ratio + ') * c1[1]^2 + ' + ratio + '* c2[1]^2)\n' +
            'g <- sqrt((1 - ' + ratio + ') * c1[2]^2 + ' + ratio + '* c2[2]^2)\n' +
            'b <- sqrt((1 - ' + ratio + ') * c1[3]^2 + ' + ratio + '* c2[3]^2)\n' +
            'rgb(r,g,b,maxColorValue=255)';
  return [code, RGenerator.ORDER_FUNCTION_CALL];
};

// AO: seems we don't want/need to export since we are hanging R off Blockly
// export { RGenerator }