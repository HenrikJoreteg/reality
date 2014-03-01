(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":3}],2:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],3:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("/Users/henrik/.nvm/v0.10.25/lib/node_modules/watchify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":2,"/Users/henrik/.nvm/v0.10.25/lib/node_modules/watchify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":5,"inherits":4}],4:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],6:[function(require,module,exports){
!function(Newton) {
    "use strict";
    function AngleConstraint(p1, axis, p2, stiffness, angle) {
        return this instanceof AngleConstraint ? (this.axis = axis, this.p1 = p1, this.p2 = p2,
        this.angle = "undefined" == typeof angle ? this.getAngle() : angle, this.stiffness = stiffness || 1,
        void (this.isDestroyed = !1)) : new AngleConstraint(p1, axis, p2, stiffness, angle);
    }
    Math.PI, 2 * Math.PI;
    AngleConstraint.prototype.category = "angular", AngleConstraint.prototype.priority = 6,
    AngleConstraint.prototype.getAngle = function() {
        var p1 = this.p1.position.pool().sub(this.axis.position), p2 = this.p2.position.pool().sub(this.axis.position), angle = p1.getAngleTo(p2);
        return p1.free(), p2.free(), angle;
    }, AngleConstraint.prototype.resolve = function() {
        if (this.p1.isDestroyed || this.p2.isDestroyed || this.axis.isDestroyed) return void (this.isDestroyed = !0);
        var diff = this.angle - this.getAngle();
        diff <= -Math.PI ? diff += 2 * Math.PI : diff >= Math.PI && (diff -= 2 * Math.PI),
        diff *= -.25 * this.stiffness, this.p1.pinned || this.p1.position.rotateAbout(this.axis.position, diff),
        this.p2.pinned || this.p2.position.rotateAbout(this.axis.position, -diff), this.axis.pinned || (this.axis.position.rotateAbout(this.p1.position, diff),
        this.axis.position.rotateAbout(this.p2.position, -diff));
    }, Newton.AngleConstraint = AngleConstraint;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function BoxConstraint(left, top, right, bottom, particles) {
        return this instanceof BoxConstraint ? (this.rect = Newton.Rectangle(left, top, right, bottom),
        void (this.particles = particles)) : new BoxConstraint(left, top, right, bottom, particles);
    }
    BoxConstraint.prototype.category = "boxconstraint", BoxConstraint.prototype.priority = 0,
    BoxConstraint.prototype.addTo = function(simulator) {
        simulator.addConstraints([ this ]);
    }, BoxConstraint.prototype.resolve = function(time, allParticles) {
        for (var particles = this.particles || allParticles, i = -1, len = particles.length; ++i < len; ) particles[i].contain(this.rect);
    }, Newton.BoxConstraint = BoxConstraint;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function DistanceConstraint(p1, p2, stiffness, distance) {
        return this instanceof DistanceConstraint ? (this.p1 = p1, this.p2 = p2, this.stiffness = stiffness || 1,
        this.distance = "undefined" == typeof distance ? this.getDistance() : distance,
        void (this.isDestroyed = !1)) : new DistanceConstraint(p1, p2, stiffness, distance);
    }
    DistanceConstraint.prototype.category = "linear", DistanceConstraint.prototype.priority = 4,
    DistanceConstraint.prototype.getDistance = function() {
        return Newton.Vector.getDistance(this.p1.position, this.p2.position);
    }, DistanceConstraint.prototype.resolve = function() {
        if (this.p1.isDestroyed || this.p2.isDestroyed) return void (this.isDestroyed = !0);
        var pos1 = this.p1.position, pos2 = this.p2.position, delta = pos2.pool().sub(pos1), length = delta.getLength(), invmass1 = 1 / this.p1.getMass(), invmass2 = 1 / this.p2.getMass(), factor = (length - this.distance) / (length * (invmass1 + invmass2)) * this.stiffness, correction1 = delta.pool().scale(factor * invmass1), correction2 = delta.scale(-factor * invmass2);
        this.p1.correct(correction1), this.p2.correct(correction2), delta.free(), correction1.free();
    }, DistanceConstraint.prototype.getCoords = function() {
        return {
            x1: this.p1.position.x,
            y1: this.p1.position.y,
            x2: this.p2.position.x,
            y2: this.p2.position.y
        };
    }, Newton.DistanceConstraint = DistanceConstraint;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function RigidConstraint(particles, iterations) {
        return this instanceof RigidConstraint ? (this.particles = particles, void (this.deltas = this.getDeltas())) : new RigidConstraint(particles, iterations);
    }
    RigidConstraint.prototype.category = "", RigidConstraint.prototype.priority = 2,
    RigidConstraint.prototype.getCenterMass = function() {
        for (var i = -1, len = this.particles.length, center = Newton.Vector(0, 0); ++i < len; ) center.add(this.particles[i].position);
        return center.scale(1 / len), center;
    }, RigidConstraint.prototype.getDeltas = function() {
        for (var center = this.getCenterMass(), i = -1, len = this.particles.length, deltas = Array(len); ++i < len; ) deltas[i] = this.particles[i].position.clone().sub(center);
        return deltas;
    }, RigidConstraint.prototype.resolve = function() {
        for (var center = this.getCenterMass(), angleDelta = 0, i = -1, len = this.particles.length; ++i < len; ) {
            var currentDelta = this.particles[i].position.clone().sub(center), targetDelta = this.deltas[i];
            angleDelta += currentDelta.getAngleTo(targetDelta);
        }
        for (angleDelta /= len, i = -1; ++i < len; ) {
            var goal = this.deltas[i].clone().rotateBy(-angleDelta).add(center), diff = goal.sub(this.particles[i].position);
            this.particles[i].position.add(diff.scale(.5));
        }
    }, Newton.RigidConstraint = RigidConstraint;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function mod(a, b) {
        return (a % b + b) % b;
    }
    function WrapConstraint(left, top, right, bottom, particles) {
        return this instanceof WrapConstraint ? (this.rect = Newton.Rectangle(left, top, right, bottom),
        this.particles = particles, void (this.layer = void 0)) : new WrapConstraint(left, top, right, bottom, particles);
    }
    WrapConstraint.prototype.category = "WrapConstraint", WrapConstraint.prototype.priority = 0,
    WrapConstraint.prototype.addTo = function(simulator, layer) {
        simulator.addConstraints([ this ]), this.layer = layer;
    }, WrapConstraint.prototype.resolve = function(time, allParticles) {
        for (var particle, pos, particles = this.particles || allParticles, i = -1, len = particles.length, rect = this.rect; ++i < len; ) if (pos = particles[i].position,
        pos.x < rect.left || pos.x > rect.right || pos.y < rect.top || pos.y > rect.bottom) {
            particle = particles[i];
            var newX = mod(particle.position.x, this.rect.width) + this.rect.left, newY = mod(particle.position.y, this.rect.height) + this.rect.top;
            particle.shiftTo(newX, newY);
        }
    }, Newton.WrapConstraint = WrapConstraint;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Body(material) {
        return this instanceof Body ? (this.particles = [], this.edges = [], this.constraints = [],
        this.material = material, this.simulator = void 0, this.layer = void 0, void (this.isFree = !1)) : new Body(material);
    }
    Body.prototype.addTo = function(simulator, layer) {
        if (this.simulator) throw new Error("Not implemented: reparenting a body");
        simulator.addParticles(this.particles), simulator.addEdges(this.edges), simulator.addConstraints(this.constraints),
        this.simulator = simulator, this.layer = layer;
        for (var i = 0, ilen = this.particles.length; ilen > i; i++) this.particles[i].layer = layer;
        for (var i = 0, ilen = this.edges.length; ilen > i; i++) this.edges[i].layer = layer;
    }, Body.prototype.free = function() {
        this.isFree = !0, this.simulator && this.simulator.addCollisionParticles(this.particles);
    }, Body.prototype.addParticle = function(particle) {
        this.particles.push(particle), particle.layer = this.layer, this.simulator && (this.simulator.addParticles([ particle ]),
        this.isFree && this.simulator.addCollisionParticles([ particle ]));
    }, Body.prototype.Particle = function() {
        var particle = Newton.Particle.apply(Newton.Particle, Array.prototype.slice.call(arguments));
        return this.addParticle(particle), particle;
    }, Body.prototype.addEdge = function(edge) {
        this.edges.push(edge), edge.layer = this.layer, this.simulator && this.simulator.addEdges([ edge ]);
    }, Body.prototype.Edge = function() {
        var edge = Newton.Edge.apply(Newton.Edge, Array.prototype.slice.call(arguments));
        return this.addEdge(edge), edge;
    }, Body.prototype.addConstraint = function(constraint) {
        this.constraints.push(constraint), this.simulator && this.simulator.addConstraints([ constraint ]);
    }, Body.prototype.DistanceConstraint = function() {
        var constraint = Newton.DistanceConstraint.apply(Newton.DistanceConstraint, Array.prototype.slice.call(arguments));
        return this.addConstraint(constraint), constraint;
    }, Body.prototype.RigidConstraint = function() {
        var constraint = Newton.RigidConstraint.apply(Newton.RigidConstraint, Array.prototype.slice.call(arguments));
        return this.addConstraint(constraint), constraint;
    }, Body.prototype.AngleConstraint = function() {
        var constraint = Newton.AngleConstraint.apply(Newton.AngleConstraint, Array.prototype.slice.call(arguments));
        return this.addConstraint(constraint), constraint;
    }, Newton.Body = Body;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Edge(p1, p2, material) {
        return this instanceof Edge ? (this.p1 = p1, this.p2 = p2, this.material = material || Newton.Material.simple,
        this.compute(), this._rect = new Newton.Rectangle(0, 0, 0, 0), void (this.layer = void 0)) : new Edge(p1, p2, material);
    }
    Edge.COLLISION_TOLERANCE = .5, Edge.getAbc = function(x1, y1, x2, y2) {
        var a = y2 - y1, b = x1 - x2, c = a * x1 + b * y1;
        return {
            a: a,
            b: b,
            c: c
        };
    }, Edge.prototype.compute = function() {
        this.anchor = this.p1.position.clone(), this.vector = this.p2.position.clone().sub(this.p1.position),
        this.length = this.vector.getLength(), this.angle = this.vector.getAngle(), this.normal = this.vector.clone().turnLeft().unit(),
        this.unit = this.vector.clone().unit(), this.bounds = Newton.Rectangle.fromVectors(this.p1.position, this.p2.position).expand(Edge.COLLISION_TOLERANCE);
    }, Edge.prototype.getCoords = function() {
        return {
            x1: this.p1.position.x,
            y1: this.p1.position.y,
            x2: this.p2.position.x,
            y2: this.p2.position.y
        };
    }, Edge.prototype.getProjection = function(vector) {
        var dot = this.vector.getDot(vector);
        return this.unit.clone().scale(dot);
    }, Edge.prototype.getAngleDelta = function(vector) {
        return this.angle - vector.getAngle();
    }, Edge.prototype.getAbc = function() {
        return Edge.getAbc(this.p1.position.x, this.p1.position.y, this.p2.position.x, this.p2.position.y);
    }, Edge.prototype.findIntersection = function(v1, v2) {
        var x1 = v1.x, y1 = v1.y, x2 = v2.x, y2 = v2.y, dot = Newton.Vector.scratch.set(x2 - x1, y2 - y1).getDot(this.normal);
        if (dot >= 0) return !1;
        var bounds1 = this.bounds, bounds2 = this._rect.set(x1, y1, x2, y2).expand(Edge.COLLISION_TOLERANCE);
        if (!bounds1.overlaps(bounds2)) return !1;
        var l1 = this.getAbc(), l2 = Edge.getAbc(x1, y1, x2, y2), det = l1.a * l2.b - l2.a * l1.b;
        if (0 === det) return !1;
        var x = (l2.b * l1.c - l1.b * l2.c) / det, y = (l1.a * l2.c - l2.a * l1.c) / det;
        if (!bounds1.contains(x, y) || !bounds2.contains(x, y)) return !1;
        var dx = x - x1, dy = y - y1;
        return {
            x: x,
            y: y,
            dx: dx,
            dy: dy,
            distance: dx * dx + dy * dy,
            wall: this
        };
    }, Edge.prototype.getReflection = function(velocity, restitution) {
        var dir = this.normal.clone(), friction = this.material.friction, velN = dir.scale(velocity.getDot(dir)).scale(restitution), velT = velocity.clone().sub(velN).scale(1 - friction), reflectedVel = velT.sub(velN);
        return reflectedVel;
    }, Newton.Edge = Edge;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function timeoutFrame(simulator) {
        var currTime = new Date().getTime(), timeToCall = Math.max(0, 16 - (currTime - lastTime)), id = setTimeout(function() {
            simulator(currTime + timeToCall);
        }, timeToCall);
        return lastTime = currTime + timeToCall, id;
    }
    function cancelTimeoutFrame(id) {
        clearTimeout(id);
    }
    var lastTime = 0;
    if ("undefined" != typeof window) {
        for (var vendors = [ "ms", "moz", "webkit", "o" ], isOpera = !!window.opera || navigator.userAgent.indexOf(" OPR/") >= 0, x = (Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor") > 0,
        !!window.chrome && !isOpera, 0); x < vendors.length && !window.requestAnimationFrame; ++x) window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"],
        window.cancelAnimationFrame = window[vendors[x] + "CancelAnimationFrame"] || window[vendors[x] + "CancelRequestAnimationFrame"];
        window.requestAnimationFrame || (window.requestAnimationFrame = timeoutFrame, window.cancelAnimationFrame = cancelTimeoutFrame),
        Newton.frame = window.requestAnimationFrame.bind(window), Newton.cancelFrame = window.cancelAnimationFrame.bind(window);
    } else Newton.frame = timeoutFrame, Newton.cancelFrame = cancelTimeoutFrame;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Material(options) {
        return this instanceof Material ? (options = options || {}, this.weight = options.weight || 1,
        this.restitution = options.restitution || 1, this.friction = options.friction || 0,
        this.maxVelocity = options.maxVelocity || 100, void (this.maxVelocitySquared = this.maxVelocity * this.maxVelocity)) : new Material(options);
    }
    Material.prototype.setMaxVelocity = function(v) {
        return this.maxVelocity = v, this.maxVelocitySquared = v * v, this;
    }, Material.simple = new Material(), Newton.Material = Material;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Particle(x, y, size, material) {
        return this instanceof Particle ? (this.position = new Newton.Vector(x, y), this.lastPosition = this.position.clone(),
        this.lastValidPosition = this.position.clone(), this.velocity = new Newton.Vector(0, 0),
        this.acceleration = new Newton.Vector(0, 0), this.material = material || Newton.Material.simple,
        this.size = size || 1, this.randomDrag = 0, this.pinned = !1, this.colliding = !1,
        this.isDestroyed = !1, void (this.layer = void 0)) : new Particle(x, y, size, material);
    }
    Particle.randomness = 25, Particle.prototype.integrate = function(time) {
        if (!this.pinned) {
            this.velocity.copy(this.position).sub(this.lastPosition);
            var drag = Math.min(1, this.velocity.getLength2() / (this.material.maxVelocitySquared + this.randomDrag));
            this.velocity.scale(1 - drag), this.acceleration.scale(1 - drag).scale(time * time),
            this.lastPosition.copy(this.position), this.position.add(this.velocity).add(this.acceleration),
            this.acceleration.zero(), this.lastValidPosition.copy(this.lastPosition), this.colliding = !1;
        }
    }, Particle.prototype.placeAt = function(x, y) {
        return this.position.set(x, y), this.lastPosition.copy(this.position), this.lastValidPosition.copy(this.lastPosition),
        this;
    }, Particle.prototype.correct = function(v) {
        this.pinned || this.position.add(v);
    }, Particle.prototype.moveTo = function(x, y) {
        return this.position.set(x, y), this;
    }, Particle.prototype.shiftTo = function(x, y) {
        var deltaX = x - this.position.x, deltaY = y - this.position.y;
        this.position.addXY(deltaX, deltaY), this.lastValidPosition.addXY(deltaX, deltaY),
        this.lastPosition.addXY(deltaX, deltaY);
    }, Particle.prototype.destroy = function() {
        this.isDestroyed = !0;
    }, Particle.prototype.getDistance = function(x, y) {
        return this.position.pool().subXY(x, y).getLength();
    }, Particle.prototype.pin = function(x, y) {
        x = "undefined" != typeof x ? x : this.position.x, y = "undefined" != typeof y ? y : this.position.y,
        this.placeAt(x, y), this.pinned = !0, this.size = 1/0;
    }, Particle.prototype.setVelocity = function(x, y) {
        return this.lastPosition.copy(this.position).subXY(x, y), this;
    }, Particle.prototype.contain = function(bounds) {
        this.position.x > bounds.right ? this.position.x = this.lastPosition.x = this.lastValidPosition.x = bounds.right : this.position.x < bounds.left && (this.position.x = this.lastPosition.x = this.lastValidPosition.x = bounds.left),
        this.position.y > bounds.bottom ? this.position.y = this.lastPosition.y = this.lastValidPosition.y = bounds.bottom : this.position.y < bounds.top && (this.position.y = this.lastPosition.y = this.lastValidPosition.y = bounds.top);
    }, Particle.prototype.applyForce = function(force) {
        this.accelerateVector(force.vector);
    }, Particle.prototype.accelerateVector = function(vector) {
        this.acceleration.add(vector);
    }, Particle.prototype.force = function(x, y, mass) {
        mass = mass || this.getMass(), this.acceleration.add({
            x: x / mass,
            y: y / mass
        });
    }, Particle.prototype.getMass = function() {
        return this.size * this.material.weight;
    }, Particle.prototype.getSquaredSpeed = function() {
        return this.velocity.getSquaredLength();
    }, Particle.prototype.attractSquare = function(x, y, m, minDist) {
        var mass = this.getMass(), delta = new Newton.Vector.claim().set(x, y).sub(this.position), r = Math.max(delta.getLength(), minDist || 1), f = m * mass / (r * r), ratio = m / (m + mass);
        this.acceleration.add({
            x: -f * (delta.x / r) * ratio,
            y: -f * (delta.y / r) * ratio
        }), delta.free();
    }, Particle.prototype.collide = function(intersection) {
        var velocity = this.position.pool().sub(this.lastPosition), bouncePoint = Newton.Vector.claim().set(intersection.x, intersection.y).add(intersection.wall.normal), reflectedVelocity = intersection.wall.getReflection(velocity, this.material.restitution);
        this.position.copy(bouncePoint), this.setVelocity(reflectedVelocity.x, reflectedVelocity.y),
        this.lastValidPosition = bouncePoint, this.colliding = !0, velocity.free(), bouncePoint.free();
    }, Newton.Particle = Particle;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function noop() {}
    function prioritySort(a, b) {
        return b.priority - a.priority;
    }
    function Simulator(callback, renderers, integrationFps, iterations) {
        return this instanceof Simulator ? (this.callback = callback || noop, this.renderers = renderers || noop,
        Array.isArray(this.renderers) || (this.renderers = [ this.renderers ]), this.step = this._step.bind(this),
        this.lastTime = 0, this.running = !1, this.fps = 0, this.frames = 0, this.countTime = 0,
        this.countInterval = 250, this.accumulator = 0, this.simulationStep = 1e3 / (integrationFps || 60),
        this.iterations = iterations || 3, this.startTime = 0, this.layers = {}, this.particles = [],
        this.edges = [], this.forces = [], this.constraints = [], void (this.collisionParticles = [])) : new Simulator(callback, renderers, integrationFps, iterations);
    }
    Array.isArray || (Array.isArray = function(vArg) {
        return "[object Array]" === Object.prototype.toString.call(vArg);
    }), Simulator.prototype.start = function() {
        this.running = !0, this.countTime = Date.now() + 1e3, this.startTime = Date.now(),
        Newton.frame(this.step);
    }, Simulator.prototype.stop = function() {
        this.running = !1;
    }, Simulator.prototype._step = function() {
        if (this.running) {
            var time = Date.now(), step = time - this.lastTime;
            for (this.lastTime = time, step > 100 && (step = 0), this.accumulator += step; this.accumulator >= this.simulationStep; ) this.simulate(this.simulationStep, time - this.startTime),
            this.accumulator -= this.simulationStep;
            for (var i = 0; i < this.renderers.length; i++) this.renderers[i](step, this);
            this.frames++, time >= this.countTime && (this.fps = (this.frames / (this.countInterval + time - this.countTime) * 1e3).toFixed(0),
            this.frames = 0, this.countTime = time + this.countInterval), Newton.frame(this.step);
        }
    }, Simulator.prototype.simulate = function(time, totalTime) {
        this.cull(this.particles), this.cull(this.constraints), this.callback(time, this, totalTime),
        this.integrate(time), this.constrain(time), this.updateEdges(), this.collide(time);
    }, Simulator.prototype.cull = function(array) {
        for (var i = 0; i < array.length; ) array[i].isDestroyed ? array.splice(i, 1) : i++;
    }, Simulator.prototype.integrate = function(time) {
        for (var particle, force, linked, particles = this.particles, forces = this.forces, layers = this.layers, emptyLink = [], i = 0, ilen = particles.length; ilen > i; i++) {
            if (particle = particles[i], linked = particle.layer ? layers[particle.layer].linked : emptyLink,
            !particle.pinned) for (var j = 0, jlen = forces.length; jlen > j; j++) force = forces[j],
            force.layer && -1 === linked.indexOf(force.layer) || force.applyTo(particle);
            particle.integrate(time);
        }
    }, Simulator.prototype.constrain = function(time) {
        for (var constraints = this.constraints, j = 0, jlen = this.iterations; jlen > j; j++) for (var i = 0, ilen = constraints.length; ilen > i; i++) constraints[i].resolve(time, this.particles);
    }, Simulator.prototype.updateEdges = function() {
        for (var i = 0, ilen = this.edges.length; ilen > i; i++) this.edges[i].compute();
    }, Simulator.prototype.collide = function() {
        for (var intersect, particle, edge, nearest, linked, particles = this.collisionParticles, edges = this.edges, layers = this.layers, emptyLink = [], i = 0, ilen = particles.length; ilen > i; i++) {
            particle = particles[i], linked = particle.layer ? layers[particle.layer].linked : emptyLink,
            intersect = void 0, nearest = void 0;
            for (var j = 0, jlen = edges.length; jlen > j; j++) edge = edges[j], edge.layer && -1 === linked.indexOf(edge.layer) || particle !== edge.p1 && particle !== edge.p2 && (intersect = edge.findIntersection(particle.lastPosition, particle.position),
            intersect && (!nearest || intersect.distance < nearest.distance) && (nearest = intersect));
            nearest && particle.collide(nearest);
        }
    }, Simulator.prototype.ensureLayer = function(name) {
        name && (this.layers[name] || (this.layers[name] = {
            linked: [ name ]
        }));
    }, Simulator.prototype.add = function(entity, layer) {
        var entities = Array.isArray(entity) ? entity : [ entity ];
        for (this.ensureLayer(layer); entities.length; ) entities.shift().addTo(this, layer);
        return this;
    }, Simulator.prototype.link = function(layer, linkedLayers) {
        return this.ensureLayer(layer), this.layers[layer].linked = linkedLayers.split(" "),
        this;
    }, Simulator.prototype.addParticles = function(particles) {
        this.particles.push.apply(this.particles, particles);
    }, Simulator.prototype.addEdges = function(edges) {
        this.edges.push.apply(this.edges, edges);
        for (var i = 0; i < edges.length; i++) this.addCollisionParticles([ edges[i].p1, edges[i].p2 ]);
    }, Simulator.prototype.addCollisionParticles = function(particles) {
        for (var i = particles.length; i--; ) -1 === this.collisionParticles.indexOf(particles[i]) && this.collisionParticles.push(particles[i]);
        return this;
    }, Simulator.prototype.addConstraints = function(constraints) {
        this.constraints.push.apply(this.constraints, constraints), this.constraints.sort(prioritySort);
    }, Simulator.prototype.findParticle = function(x, y, radius) {
        for (var distance, particles = this.particles, found = void 0, nearest = radius, i = 0, ilen = particles.length; ilen > i; i++) distance = particles[i].getDistance(x, y),
        nearest >= distance && (found = particles[i], nearest = distance);
        return found;
    }, Simulator.prototype.addBody = function(body) {
        this.particles.push.apply(this.particles, body.particles), this.edges.push.apply(this.edges, body.edges),
        this.bodies.push(body);
    }, Simulator.prototype.Layer = function() {
        var newLayer = Newton.Layer();
        return this.layers.push(newLayer), newLayer;
    }, Newton.Simulator = Simulator;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Box(x, y, size) {
        var body = Newton.Body(), ul = body.Particle(x - size, y - size), ur = body.Particle(x + size, y - size), ll = body.Particle(x - size, y + size), lr = body.Particle(x + size, y + size);
        return body.DistanceConstraint(ul, ur), body.DistanceConstraint(ur, lr), body.DistanceConstraint(lr, ll),
        body.DistanceConstraint(ll, ul), body.DistanceConstraint(ul, lr), body.DistanceConstraint(ur, ll),
        body.Edge(ul, ur), body.Edge(ur, lr), body.Edge(lr, ll), body.Edge(ll, ul), body;
    }
    Newton.Box = Box;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Fabric(x1, y1, x2, y2, width, height) {
        for (var particle, spacing = (x2 - x1) / width, body = Newton.Body(), w = 0; width > w; w++) for (var h = 0; height > h; h++) particle = body.Particle(x1 + w * spacing, y1 + h * spacing),
        0 === h && particle.pin();
        for (var w = 0; width > w; w++) for (var h = 0; height > h; h++) h > 0 && body.DistanceConstraint(body.particles[w * height + h], body.particles[w * height + h - 1], .2),
        w > 0 && body.DistanceConstraint(body.particles[w * height + h], body.particles[w * height + h - height], .2),
        0 === w && h > 0 && body.Edge(body.particles[w * height + h], body.particles[w * height + h - 1]),
        h === height - 1 && w > 0 && body.Edge(body.particles[w * height + h], body.particles[w * height + h - height]),
        w === width - 1 && h > 0 && body.Edge(body.particles[w * height + h - 1], body.particles[w * height + h]);
        return body;
    }
    Newton.Fabric = Fabric;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Lattice(x, y, segmentLength, segments, pinLeft, pinRight) {
        var body = Newton.Body(), top = body.Particle(x, y), bottom = body.Particle(x, y + segmentLength);
        pinLeft && (top.pin(), bottom.pin());
        for (var i = 1; segments >= i; i++) {
            var nextTop = body.Particle(x + i * segmentLength, y), nextBottom = body.Particle(x + i * segmentLength, y + segmentLength);
            body.DistanceConstraint(top, nextTop), body.DistanceConstraint(bottom, nextBottom),
            body.DistanceConstraint(top, nextBottom), body.DistanceConstraint(nextTop, bottom),
            body.DistanceConstraint(nextTop, nextBottom), body.Edge(top, nextTop), body.Edge(bottom, nextBottom),
            i === segments && body.Edge(nextTop, nextBottom), top = nextTop, bottom = nextBottom;
        }
        return pinRight && (top.pin(), bottom.pin()), body;
    }
    Newton.Lattice = Lattice;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Squishy(ox, oy, r, points) {
        for (var spacing = 2 * Math.PI / points, body = Newton.Body(), i = 0; points > i; i++) {
            var x = ox + r * Math.cos(i * spacing - .5 * Math.PI), y = oy + r * Math.sin(i * spacing - .5 * Math.PI);
            body.Particle(x, y);
            for (var j = 0; i > j; j++) body.DistanceConstraint(body.particles[i], body.particles[j], .002);
            i > 0 && body.Edge(body.particles[i - 1], body.particles[i]);
        }
        return body.Edge(body.particles[points - 1], body.particles[0]), body;
    }
    Newton.Squishy = Squishy;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function LinearGravity(angle, strength, falloff) {
        return this instanceof LinearGravity ? (this.angle = angle, this.strength = strength,
        this.vector = new Newton.Vector(0, strength).rotateBy(angle), this.simulator = void 0,
        void (this.layer = void 0)) : new LinearGravity(angle, strength, falloff);
    }
    LinearGravity.prototype.addTo = function(simulator, layer) {
        simulator.forces.push(this), this.simulator = simulator, this.layer = layer;
    }, LinearGravity.prototype.setAngle = function(angle) {
        this.angle = angle, this.vector.set(0, this.strength).rotateBy(this.angle);
    }, LinearGravity.prototype.setStrength = function(strength) {
        this.strength = strength, this.vector.set(0, this.strength).rotateBy(this.angle);
    }, LinearGravity.prototype.applyTo = function(particle) {
        particle.accelerateVector(this.vector);
    }, Newton.LinearGravity = LinearGravity;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function RadialGravity(x, y, strength, falloff) {
        return this instanceof RadialGravity ? (this.x = x, this.y = y, this.strength = strength,
        this.simulator = void 0, void (this.layer = void 0)) : new RadialGravity(x, y, strength, falloff);
    }
    RadialGravity.prototype.addTo = function(simulator, layer) {
        simulator.forces.push(this), this.simulator = simulator, this.layer = layer;
    }, RadialGravity.prototype.setLocation = function(x, y) {
        this.x = x, this.y = y;
    }, RadialGravity.prototype.setStrength = function(strength) {
        this.strength = strength;
    }, RadialGravity.prototype.applyTo = function(particle) {
        particle.attractSquare(this.x, this.y, this.strength, 20);
    }, Newton.RadialGravity = RadialGravity;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Rectangle(left, top, right, bottom) {
        return this instanceof Rectangle ? void this.set.apply(this, arguments) : new Rectangle(left, top, right, bottom);
    }
    Rectangle.fromVectors = function(v1, v2) {
        return new Rectangle(v1.x, v1.y, v2.x, v2.y);
    }, Rectangle.prototype = {
        set: function(left, top, right, bottom) {
            return this.left = Math.min(left, right), this.top = Math.min(top, bottom), this.right = Math.max(right, left),
            this.bottom = Math.max(bottom, top), this.width = this.right - this.left, this.height = this.bottom - this.top,
            this;
        },
        contains: function(x, y) {
            return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom;
        },
        overlaps: function(rect) {
            return !(rect.left > this.right || rect.right < this.left || rect.top > this.bottom || rect.bottom < this.top);
        },
        expand: function(amount) {
            return this.left -= amount, this.right += amount, this.top -= amount, this.bottom += amount,
            this;
        }
    }, Newton.Rectangle = Rectangle;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Vector(x, y) {
        return this instanceof Vector ? (this.x = x, void (this.y = y)) : new Vector(x, y);
    }
    Vector._pool = [], Vector.pool = function(size) {
        if ("undefined" == typeof size) return Vector._pool.length;
        Vector._pool.length = 0;
        for (var i = 0; size > i; i++) Vector._pool.push(Newton.Vector());
    }, Vector.claim = function() {
        return Vector._pool.pop() || Newton.Vector();
    }, Vector.prototype.free = function() {
        return Vector._pool.push(this), this;
    }, Vector.prototype.pool = function() {
        return Vector.claim().copy(this);
    }, Vector.scratch = new Vector(), Vector.getDistance = function(a, b) {
        var dx = a.x - b.x, dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }, Vector.prototype.clone = function() {
        return Newton.Vector(this.x, this.y);
    }, Vector.prototype.copy = function(v) {
        return this.x = v.x, this.y = v.y, this;
    }, Vector.prototype.zero = function() {
        return this.x = 0, this.y = 0, this;
    }, Vector.prototype.set = function(x, y) {
        return this.x = x, this.y = y, this;
    }, Vector.prototype.add = function(v) {
        return this.x += v.x, this.y += v.y, this;
    }, Vector.prototype.addXY = function(x, y) {
        return this.x += x, this.y += y, this;
    }, Vector.prototype.sub = function(v) {
        return this.x -= v.x, this.y -= v.y, this;
    }, Vector.prototype.subXY = function(x, y) {
        return this.x -= x, this.y -= y, this;
    }, Vector.prototype.mult = function(v) {
        return this.x *= v.x, this.y *= v.y, this;
    }, Vector.prototype.scale = function(scalar) {
        return this.x *= scalar, this.y *= scalar, this;
    }, Vector.prototype.div = function(v) {
        return this.x /= v.x, this.y /= v.y, this;
    }, Vector.prototype.reverse = function() {
        return this.x = -this.x, this.y = -this.y, this;
    }, Vector.prototype.unit = function() {
        return this.scale(1 / this.getLength()), this;
    }, Vector.prototype.turnRight = function() {
        var x = this.x, y = this.y;
        return this.x = -y, this.y = x, this;
    }, Vector.prototype.turnLeft = function() {
        var x = this.x, y = this.y;
        return this.x = y, this.y = -x, this;
    }, Vector.prototype.rotateBy = function(angle) {
        var x = this.x, y = -this.y, sin = Math.sin(angle), cos = Math.cos(angle);
        return this.x = x * cos - y * sin, this.y = -(x * sin + y * cos), this;
    }, Vector.prototype.rotateAbout = function(pivot, angle) {
        return this.sub(pivot).rotateBy(angle).add(pivot), this;
    }, Vector.prototype.getDot = function(v) {
        return this.x * v.x + this.y * v.y;
    }, Vector.prototype.getCross = function(v) {
        return this.x * v.y + this.y * v.x;
    }, Vector.prototype.getLength = function() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }, Vector.prototype.getLength2 = function() {
        return this.x * this.x + this.y * this.y;
    }, Vector.prototype.getAngle = function() {
        return Math.atan2(-this.y, this.x);
    }, Vector.prototype.getAngleTo = function(v) {
        var cos = this.x * v.x + this.y * v.y, sin = this.y * v.x - this.x * v.y;
        return Math.atan2(sin, cos);
    }, Newton.Vector = Vector;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function rgbToHex(r, g, b) {
        return (1 << 24) + (r << 16) + (g << 8) + b;
    }
    function PixiRenderer(el, width, height) {
        return this instanceof PixiRenderer ? (this.stage = new PIXI.Stage(0, !0), this.stage.setInteractive(!0),
        this.width = width, this.height = height, this.renderer = PIXI.autoDetectRenderer(this.width, this.height, null, !1, !0),
        this.renderer.view.style.display = "block", el.appendChild(this.renderer.view),
        this.infoText = new PIXI.Text("FPS: ??", {
            fill: "#ffffff",
            font: "10pt Helvetica"
        }), this.stage.addChild(this.infoText), this.graphics = new PIXI.Graphics(), this.stage.addChild(this.graphics),
        void (this.callback = this.callback.bind(this))) : new PixiRenderer(el, width, height);
    }
    PixiRenderer.prototype = {
        callback: function(time, sim) {
            var particles = 0, edges = 0;
            this.graphics.clear();
            for (var i = 0, ilen = sim.layers.length; ilen > i; i++) {
                for (var j = 0, jlen = sim.layers[i].bodies.length; jlen > j; j++) particles += this.drawParticles(sim.layers[i].bodies[j].particles),
                edges += this.drawEdges(sim.layers[i].bodies[j].edges);
                this.drawForces(sim.layers[i].forces);
            }
            this.infoText.setText("FPS: " + sim.fps + "\nparticles: " + particles + "\nedges: " + edges),
            this.renderer.render(this.stage);
        },
        drawForces: function(forces) {
            this.graphics.lineStyle(2, 16777215, .3);
            for (var i = 0, ilen = forces.length; ilen > i; i++) {
                var force = forces[i];
                force instanceof Newton.RadialGravity && (this.graphics.beginFill(16777215, .2),
                this.graphics.drawCircle(force.x, force.y, force.strength * force.strength * .5),
                this.graphics.endFill());
            }
        },
        drawParticles: function(particles) {
            for (var particle, pos, last, mass, brightness, j = 0, jlen = particles.length; jlen > j; j++) particle = particles[j],
            pos = particle.position, last = particle.lastValidPosition, mass = particle.getMass(),
            brightness = ~~((mass - 1) / 5 * 128), particle.colliding ? this.graphics.lineStyle(mass, rgbToHex(255, 255, 100), 1) : this.graphics.lineStyle(mass, rgbToHex(255, 28 + brightness, 108 + brightness), 1),
            this.graphics.moveTo(last.x - 1, last.y), this.graphics.lineTo(pos.x + 1, pos.y);
            return particles.length;
        },
        drawEdges: function(edges) {
            this.graphics.lineStyle(1, 16777215, .5);
            for (var edge, i = edges.length; i--; ) edge = edges[i].getCoords(), this.graphics.moveTo(edge.x1, edge.y1),
            this.graphics.lineTo(edge.x2, edge.y2);
            return edges.length;
        }
    }, Newton.PixiRenderer = PixiRenderer;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function Renderer(el) {
        return this instanceof Renderer ? (this.ctx = el.getContext("2d"), this.width = el.width,
        this.height = el.height, void (this.callback = this.callback.bind(this))) : new Renderer(el);
    }
    Renderer.prototype = {
        callback: function(time, sim) {
            var ctx = this.ctx;
            this.clear(ctx, time), this.drawConstraints(ctx, sim.constraints), this.drawEdges(ctx, sim.edges),
            this.drawParticles(ctx, sim.particles), this.drawForces(ctx, sim.forces), this.drawCounts(ctx, {
                particles: sim.particles.length,
                edges: sim.edges.length,
                forces: sim.forces.length,
                constraints: sim.constraints.length
            }), this.drawFPS(ctx, sim);
        },
        clear: function(ctx) {
            ctx.save(), ctx.fillStyle = "#000000", ctx.fillRect(0, 0, this.width, this.height),
            ctx.restore();
        },
        drawForces: function(ctx, forces) {
            ctx.save(), ctx.lineWidth = 2, ctx.strokeStyle = "rgba(255, 255, 255, 0.25)", ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            for (var i = 0, ilen = forces.length; ilen > i; i++) {
                var force = forces[i];
                force instanceof Newton.RadialGravity && (ctx.beginPath(), ctx.arc(force.x, force.y, force.strength * force.strength * .5, 0, 2 * Math.PI, !1),
                ctx.fill());
            }
            ctx.restore();
        },
        drawParticles: function(ctx, particles) {
            var particle, pos, last, mass;
            ctx.save(), ctx.lineCap = "round", ctx.lineJoin = "round";
            for (var j = 0, jlen = particles.length; jlen > j; j++) particle = particles[j],
            pos = particle.position, last = particle.lastValidPosition, mass = particle.getMass(),
            ctx.beginPath(), particle.pinned ? (ctx.strokeStyle = "rgba(255, 255, 255, 1)",
            ctx.lineWidth = 1, ctx.moveTo(last.x - 3, last.y - 3), ctx.lineTo(last.x + 3, last.y + 3),
            ctx.moveTo(last.x + 3, last.y - 3), ctx.lineTo(last.x - 3, last.y + 3)) : (ctx.lineWidth = ~~(mass / 3) + 2,
            ctx.strokeStyle = particle.colliding ? "rgba(255, 255, 100, 1)" : "rgba(255, 28, 108, 1)",
            ctx.moveTo(last.x, last.y), ctx.lineTo(pos.x + 1, pos.y)), ctx.stroke();
            ctx.restore();
        },
        drawConstraints: function(ctx, constraints) {
            var coords, constraint;
            ctx.save(), ctx.strokeStyle = "rgba(100, 100, 255, 1)", ctx.lineWidth = 1;
            for (var i = 0, ilen = constraints.length; ilen > i; i++) constraint = constraints[i],
            "linear" === constraint.category ? (coords = constraint.getCoords(), ctx.beginPath(),
            ctx.moveTo(coords.x1, coords.y1), ctx.lineTo(coords.x2, coords.y2), ctx.closePath(),
            ctx.stroke()) : "rigid" === constraint.category && (coords = constraint.centerMass,
            ctx.beginPath(), ctx.moveTo(coords.x - 3, coords.y - 3), ctx.lineTo(coords.x + 3, coords.y + 3),
            ctx.closePath(), ctx.stroke());
            ctx.restore();
        },
        drawEdges: function(ctx, edges) {
            ctx.save(), ctx.strokeStyle = "rgba(255, 255, 255, 0.4)", ctx.lineWidth = 1;
            for (var edge, i = edges.length; i--; ) edge = edges[i].getCoords(), ctx.beginPath(),
            ctx.moveTo(edge.x1, edge.y1), ctx.lineTo(edge.x2, edge.y2), ctx.closePath(), ctx.stroke();
            return ctx.restore(), edges.length;
        },
        drawCounts: function(ctx, counts) {
            ctx.save(), ctx.fillStyle = "#fff", ctx.font = "10pt Helvetica", ctx.fillText("Particles: " + counts.particles, 10, 20),
            ctx.fillText("Edges: " + counts.edges, 10, 40), ctx.fillText("Forces: " + counts.forces, 10, 60),
            ctx.fillText("Constraints: " + counts.constraints, 10, 80), ctx.restore();
        },
        drawFPS: function(ctx, sim) {
            var text = "FPS: " + sim.fps;
            ctx.save(), ctx.fillStyle = "#fff", ctx.font = "10pt Helvetica", ctx.fillText(text, 10, 120),
            ctx.restore();
        }
    }, Newton.Renderer = Renderer;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports), function(Newton) {
    "use strict";
    function getGLContext(canvas) {
        for (var gl, names = [ "webgl", "experimental-webgl", "webkit-3d", "moz-webgl" ], i = 0; !gl && i++ < names.length; ) try {
            gl = canvas.getContext(names[i]);
        } catch (e) {}
        return gl;
    }
    function createShaderProgram(gl, vsText, fsText) {
        var vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (gl.shaderSource(vs, vsText), gl.shaderSource(fs, fsText), gl.compileShader(vs),
        gl.compileShader(fs), !gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw console.error("error compiling VS shaders:", gl.getShaderInfoLog(vs)),
        new Error("shader failure");
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw console.error("error compiling FS shaders:", gl.getShaderInfoLog(fs)),
        new Error("shader failure");
        var program = gl.createProgram();
        return gl.attachShader(program, vs), gl.attachShader(program, fs), gl.linkProgram(program),
        program;
    }
    function createCircleTexture(gl, size) {
        size = size || 128;
        var canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        var ctx = canvas.getContext("2d"), rad = .5 * size;
        return ctx.beginPath(), ctx.arc(rad, rad, rad, 0, 2 * Math.PI, !1), ctx.closePath(),
        ctx.fillStyle = "#fff", ctx.fill(), createTexture(gl, canvas);
    }
    function createTexture(gl, data) {
        var texture = gl.createTexture();
        return gl.bindTexture(gl.TEXTURE_2D, texture), gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR),
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE),
        gl.generateMipmap(gl.TEXTURE_2D), gl.bindTexture(gl.TEXTURE_2D, null), texture;
    }
    function GLRenderer(el) {
        return this instanceof GLRenderer ? (this.el = el, this.width = el.width, this.height = el.height,
        this.gl = getGLContext(el), this.vertices = [], this.sizes = [], this.vArray = new Float32Array(3 * GLRenderer.MAX_PARTICLES),
        this.sArray = new Float32Array(GLRenderer.MAX_PARTICLES), this.callback = this.callback.bind(this),
        this.gl.viewport(0, 0, this.width, this.height), this.viewportArray = new Float32Array([ this.width, this.height ]),
        this.initShaders(), this.initBuffers(), this.particleTexture = createCircleTexture(this.gl),
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE), void this.gl.enable(this.gl.BLEND)) : new GLRenderer(el);
    }
    var POINT_VS = [ "uniform vec2 viewport;", "attribute vec3 position;", "attribute float size;", "void main() {", "vec2 scaled = ((position.xy / viewport) * 2.0) - 1.0;", "vec2 flipped = vec2(scaled.x, -scaled.y);", "gl_Position = vec4(flipped, 0, 1);", "gl_PointSize = size + 1.0;", "}" ].join("\n"), LINE_VS = [ "uniform vec2 viewport;", "attribute vec3 position;", "void main() {", "vec2 scaled = ((position.xy / viewport) * 2.0) - 1.0;", "vec2 flipped = vec2(scaled.x, -scaled.y);", "gl_Position = vec4(flipped, 0, 1);", "}" ].join("\n"), PARTICLE_FS = [ "precision mediump float;", "uniform sampler2D texture;", "void main() {", "gl_FragColor = texture2D(texture, gl_PointCoord);", "}" ].join("\n"), CONSTRAINT_FS = [ "void main() {", "gl_FragColor = vec4(0.0, 0.5, 1.0, 1.0);", "}" ].join("\n"), EDGE_FS = [ "void main() {", "gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);", "}" ].join("\n");
    GLRenderer.MAX_PARTICLES = 1e4, GLRenderer.prototype = {
        initShaders: function() {
            var gl = this.gl;
            this.particleShader = createShaderProgram(gl, POINT_VS, PARTICLE_FS), this.particleShader.uniforms = {
                viewport: gl.getUniformLocation(this.particleShader, "viewport")
            }, this.particleShader.attributes = {
                position: gl.getAttribLocation(this.particleShader, "position"),
                size: gl.getAttribLocation(this.particleShader, "size")
            }, gl.useProgram(this.particleShader), gl.uniform2fv(this.particleShader.uniforms.viewport, this.viewportArray),
            this.edgeShader = createShaderProgram(gl, LINE_VS, EDGE_FS), this.edgeShader.uniforms = {
                viewport: gl.getUniformLocation(this.edgeShader, "viewport")
            }, this.edgeShader.attributes = {
                position: gl.getAttribLocation(this.edgeShader, "position")
            }, gl.useProgram(this.edgeShader), gl.uniform2fv(this.edgeShader.uniforms.viewport, this.viewportArray),
            this.constraintShader = createShaderProgram(gl, LINE_VS, CONSTRAINT_FS), this.constraintShader.uniforms = {
                viewport: gl.getUniformLocation(this.constraintShader, "viewport")
            }, this.constraintShader.attributes = {
                position: gl.getAttribLocation(this.constraintShader, "position")
            }, gl.useProgram(this.constraintShader), gl.uniform2fv(this.constraintShader.uniforms.viewport, this.viewportArray);
        },
        initBuffers: function() {
            var gl = this.gl;
            this.particlePositionBuffer = gl.createBuffer(), this.particleSizeBuffer = gl.createBuffer(),
            this.edgePositionBuffer = gl.createBuffer();
        },
        callback: function(time, sim) {
            this.clear(time), this.drawParticles(sim.particles), this.drawEdges(sim.edges),
            this.drawConstraints(sim.constraints);
        },
        clear: function() {
            var gl = this.gl;
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        },
        drawForces: function(ctx, forces) {
            ctx.save(), ctx.lineWidth = 2, ctx.strokeStyle = "rgba(255, 255, 255, 0.25)", ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            for (var i = 0, ilen = forces.length; ilen > i; i++) {
                var force = forces[i];
                force instanceof Newton.RadialGravity && (ctx.beginPath(), ctx.arc(force.x, force.y, force.strength * force.strength * .5, 0, 2 * Math.PI, !1),
                ctx.fill());
            }
            ctx.restore();
        },
        drawParticles: function(particles) {
            var gl = this.gl, vertices = this.vertices, sizes = this.sizes;
            vertices.length = 0, sizes.length = 0;
            for (var particle, i = 0, ilen = particles.length; ilen > i; i++) particle = particles[i],
            vertices.push(particle.position.x, particle.position.y, 0), sizes.push(particle.size < 8 ? particle.size : 8);
            if (vertices.length > this.vArray.length) throw new Error("vArray too small to hold vertices");
            if (this.vArray.set(vertices, 0), sizes.length > this.sArray.length) throw new Error("sArray too small to hold sizes");
            this.sArray.set(sizes, 0), gl.activeTexture(gl.TEXTURE0), gl.bindTexture(gl.TEXTURE_2D, this.particleTexture),
            gl.useProgram(this.particleShader), gl.bindBuffer(gl.ARRAY_BUFFER, this.particlePositionBuffer),
            gl.bufferData(gl.ARRAY_BUFFER, this.vArray, gl.STATIC_DRAW), gl.vertexAttribPointer(this.particleShader.attributes.position, 3, gl.FLOAT, !1, 0, 0),
            gl.enableVertexAttribArray(this.particleShader.attributes.position), gl.bindBuffer(gl.ARRAY_BUFFER, this.particleSizeBuffer),
            gl.bufferData(gl.ARRAY_BUFFER, this.sArray, gl.STATIC_DRAW), gl.vertexAttribPointer(this.particleShader.attributes.size, 1, gl.FLOAT, !1, 0, 0),
            gl.enableVertexAttribArray(this.particleShader.attributes.size), gl.drawArrays(gl.POINTS, 0, vertices.length / 3);
        },
        drawConstraints: function(constraints) {
            for (var constraint, coords, gl = this.gl, vertices = [], i = 0, ilen = constraints.length; ilen > i; i++) constraint = constraints[i],
            "linear" === constraint.category && (coords = constraint.getCoords(), vertices.push(coords.x1, coords.y1, 0),
            vertices.push(coords.x2, coords.y2, 0));
            gl.useProgram(this.constraintShader), gl.bindBuffer(gl.ARRAY_BUFFER, this.edgePositionBuffer),
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW), gl.vertexAttribPointer(this.constraintShader.attributes.position, 3, gl.FLOAT, !1, 0, 0),
            gl.enableVertexAttribArray(this.constraintShader.attributes.position), gl.lineWidth(1),
            gl.drawArrays(gl.LINES, 0, vertices.length / 3);
        },
        drawEdges: function(edges) {
            for (var edge, gl = this.gl, vertices = [], i = 0, ilen = edges.length; ilen > i; i++) edge = edges[i].getCoords(),
            vertices.push(edge.x1, edge.y1, 0), vertices.push(edge.x2, edge.y2, 0);
            gl.useProgram(this.edgeShader), gl.bindBuffer(gl.ARRAY_BUFFER, this.edgePositionBuffer),
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW), gl.vertexAttribPointer(this.edgeShader.attributes.position, 3, gl.FLOAT, !1, 0, 0),
            gl.enableVertexAttribArray(this.edgeShader.attributes.position), gl.lineWidth(3),
            gl.drawArrays(gl.LINES, 0, vertices.length / 3);
        },
        drawCounts: function(ctx, counts) {
            ctx.save(), ctx.fillStyle = "#fff", ctx.font = "10pt Helvetica", ctx.fillText("Particles: " + counts.particles, 10, 20),
            ctx.fillText("Edges: " + counts.edges, 10, 40), ctx.fillText("Forces: " + counts.forces, 10, 60),
            ctx.fillText("Constraints: " + counts.constraints, 10, 80), ctx.restore();
        },
        drawFPS: function(sim) {
            var text = "FPS: " + sim.fps;
            ctx.save(), ctx.fillStyle = "#fff", ctx.font = "10pt Helvetica", ctx.fillText(text, 10, 120),
            ctx.restore();
        }
    }, Newton.GLRenderer = GLRenderer;
}("undefined" == typeof exports ? this.Newton = this.Newton || {} : exports);
//# sourceMappingURL=newton-map.js

},{}],7:[function(require,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based 
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {
    
});

emitter.on('somenamespace*', function (eventName, payloads) {
    
});

Please note that callbacks triggered by wildcard registered events also get 
the event name as the first argument.
*/
module.exports = WildEmitter;

function WildEmitter() {
    this.callbacks = {};
}

// Listen on the given `event` with `fn`. Store a group name if present.
WildEmitter.prototype.on = function (event, groupName, fn) {
    var hasGroup = (arguments.length === 3),
        group = hasGroup ? arguments[1] : undefined,
        func = hasGroup ? arguments[2] : arguments[1];
    func._groupName = group;
    (this.callbacks[event] = this.callbacks[event] || []).push(func);
    return this;
};

// Adds an `event` listener that will be invoked a single
// time then automatically removed.
WildEmitter.prototype.once = function (event, groupName, fn) {
    var self = this,
        hasGroup = (arguments.length === 3),
        group = hasGroup ? arguments[1] : undefined,
        func = hasGroup ? arguments[2] : arguments[1];
    function on() {
        self.off(event, on);
        func.apply(this, arguments);
    }
    this.on(event, group, on);
    return this;
};

// Unbinds an entire group
WildEmitter.prototype.releaseGroup = function (groupName) {
    var item, i, len, handlers;
    for (item in this.callbacks) {
        handlers = this.callbacks[item];
        for (i = 0, len = handlers.length; i < len; i++) {
            if (handlers[i]._groupName === groupName) {
                //console.log('removing');
                // remove it and shorten the array we're looping through
                handlers.splice(i, 1);
                i--;
                len--;
            }
        }
    }
    return this;
};

// Remove the given callback for `event` or all
// registered callbacks.
WildEmitter.prototype.off = function (event, fn) {
    var callbacks = this.callbacks[event],
        i;

    if (!callbacks) return this;

    // remove all handlers
    if (arguments.length === 1) {
        delete this.callbacks[event];
        return this;
    }

    // remove specific handler
    i = callbacks.indexOf(fn);
    callbacks.splice(i, 1);
    return this;
};

/// Emit `event` with the given args.
// also calls any `*` handlers
WildEmitter.prototype.emit = function (event) {
    var args = [].slice.call(arguments, 1),
        callbacks = this.callbacks[event],
        specialCallbacks = this.getWildcardCallbacks(event),
        i,
        len,
        item,
        listeners;

    if (callbacks) {
        listeners = callbacks.slice();
        for (i = 0, len = listeners.length; i < len; ++i) {
            if (listeners[i]) {
                listeners[i].apply(this, args);
            } else {
                break;
            }
        }
    }

    if (specialCallbacks) {
        len = specialCallbacks.length;
        listeners = specialCallbacks.slice();
        for (i = 0, len = listeners.length; i < len; ++i) {
            if (listeners[i]) {
                listeners[i].apply(this, [event].concat(args));
            } else {
                break;
            }
        }
    }

    return this;
};

// Helper for for finding special wildcard event handlers that match the event
WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
    var item,
        split,
        result = [];

    for (item in this.callbacks) {
        split = item.split('*');
        if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
            result = result.concat(this.callbacks[item]);
        }
    }
    return result;
};

},{}],8:[function(require,module,exports){
(function (global){
// Simmer is a simulation runner for Newton.js designed
// to be used in rich UI applications (not games) where
// you want to be able to run simulations until particles
// you care about have stopped and then automatically
// halt the simulation.

// The defalt constraints are the window's inner dimensions
var Newton = require('newton');
var root = (typeof window !== 'undefined') ? window : global;
var WildEmitter = require('wildemitter');


function Simmer(spec) {
    WildEmitter.call(this);

    // our defaults
    this.spec = {
        border: true,
        width: root.innerWidth || 500,
        height: root.innerHeight || 500
    };
    this.renderCallbacks = [];
    this.simCallbacks = [];

    // update our settings with passed in options
    for (var item in this.spec) {
        if (spec && spec.hasOwnProperty(item)) this.spec[item] = spec[item];
    }

    this.simulator = Newton.Simulator(this._simulate.bind(this), this._render.bind(this));

    if (this.spec.border) {
        this.border = Newton.BoxConstraint(0, 0, this.spec.width, this.spec.height);
        this.simulator.add(this.border);
    }
}

Simmer.prototype = Object.create(WildEmitter.prototype, {
    constructor: Simmer
});

Simmer.prototype.addSimFunction = function (func) {
    this.simCallbacks.push(func);
};

Simmer.prototype.addRenderFunction = function (func) {
    this.renderCallbacks.push(func);
};

Simmer.prototype._render = function () {
    var i = 0;
    var l = this.renderCallbacks.length;
    for (; i < l; i++) {
        this.renderCallbacks[i].apply(this, arguments);
    }
};

// internal simulation callback
Simmer.prototype._simulate = function (frame, simulator) {
    var self = this;
    var i = 0;
    var l = this.simCallbacks.length;
    var moving;
    for (; i < l; i++) {
        this.simCallbacks[i].apply(this, arguments);
    }
    // see if any of our particles are moving
    this.simulator.particles.forEach(function (particle) {
        if (self.isMoving(particle)) {
            moving = true;
            delete particle.stillCount;
        } else {
            particle.stillCount++ || (particle.stillCount = 1);

            if (particle.stillCount < 10) {
                moving = true;
            }
        }
    });

    // if none of them are moving, stop the simulator
    if (!moving) {
        this.stop();
    }
};

Simmer.prototype.isMoving = function (particle) {
    return Math.abs(particle.velocity.x) > 0.01 || Math.abs(particle.velocity.y) > 0.01;
};

Simmer.prototype.stop = function () {
    // reset all particle still counters then stop
    this.simulator.particles.forEach(function (particle) {
        delete particle.stillCount;
    });
    this.simulator.stop();
    this.emit('stop');
};

Simmer.prototype.addAndRun = function (thing) {
    this.add(thing);
    this.simulator.start();
    this.emit('start');
};

// Helper for convenience.
Simmer.prototype.addGravity = function (strength, direction) {
    this.gravity = new Newton.LinearGravity(direction || 0, strength || 0.001);
    this.simulator.add(this.gravity);
};

Simmer.prototype.add = function (thing) {
    try {
        this.simulator.add(thing);
    } catch (e) {
        this.simulator.addParticles([thing])
    }
};

Simmer.prototype.getDebugCanvas = function () {
    if (!root.document) return;
    var canvas = document.createElement('canvas');
    var renderer;
    canvas.width = this.spec.width;
    canvas.height = this.spec.height;
    renderer = Newton.Renderer(canvas, this.spec.width, this.spec.height);
    this.addRenderFunction(renderer.callback);
    return canvas;
};

Simmer.prototype.showDebugCanvas = function () {
    if (!root.document) return;
    var canvas = this.getDebugCanvas();
    canvas.style.position = "fixed";
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.zIndex = -1;
    document.body.appendChild(canvas);
};


module.exports = Simmer;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"newton":6,"wildemitter":7}],9:[function(require,module,exports){
var assert = require('assert');
var Simmer = require('./simmer');
var Newton = require('newton');

var sim = new Simmer();

var p = Newton.Particle(100, 100);

sim.on('start', function () {
    console.log('start event');
    assert.ok(true, 'start event');
});

sim.on('stop', function () {
    console.log('stop event');
    assert.ok(true, 'stop event');
});

sim.addGravity();
sim.addAndRun(p);
sim.showDebugCanvas();


if (typeof window !== 'undefined') window.sim = sim;

},{"./simmer":8,"assert":1,"newton":6}]},{},[9])