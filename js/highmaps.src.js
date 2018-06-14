/**
 * @license Highmaps JS v6.1.0-modified (2018-06-15)
 *
 * (c) 2011-2016 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
'use strict';
(function (root, factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = root.document ?
			factory(root) :
			factory;
	} else {
		root.Highcharts = factory(root);
	}
}(typeof window !== 'undefined' ? window : this, function (win) {
	var Highcharts = (function () {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		/* global win, window */

		// glob is a temporary fix to allow our es-modules to work.
		var glob = typeof win === 'undefined' ? window : win,
		    doc = glob.document,
		    SVG_NS = 'http://www.w3.org/2000/svg',
		    userAgent = (glob.navigator && glob.navigator.userAgent) || '',
		    svg = (
		        doc &&
		        doc.createElementNS &&
		        !!doc.createElementNS(SVG_NS, 'svg').createSVGRect
		    ),
		    isMS = /(edge|msie|trident)/i.test(userAgent) && !glob.opera,
		    isFirefox = userAgent.indexOf('Firefox') !== -1,
		    isChrome = userAgent.indexOf('Chrome') !== -1,
		    hasBidiBug = (
		        isFirefox &&
		        parseInt(userAgent.split('Firefox/')[1], 10) < 4 // issue #38
		    );

		var Highcharts = glob.Highcharts ? glob.Highcharts.error(16, true) : {
		    product: 'Highmaps',
		    version: '6.1.0-modified',
		    deg2rad: Math.PI * 2 / 360,
		    doc: doc,
		    hasBidiBug: hasBidiBug,
		    hasTouch: doc && doc.documentElement.ontouchstart !== undefined,
		    isMS: isMS,
		    isWebKit: userAgent.indexOf('AppleWebKit') !== -1,
		    isFirefox: isFirefox,
		    isChrome: isChrome,
		    isSafari: !isChrome && userAgent.indexOf('Safari') !== -1,
		    isTouchDevice: /(Mobile|Android|Windows Phone)/.test(userAgent),
		    SVG_NS: SVG_NS,
		    chartCount: 0,
		    seriesTypes: {},
		    symbolSizes: {},
		    svg: svg,
		    win: glob,
		    marginNames: ['plotTop', 'marginRight', 'marginBottom', 'plotLeft'],
		    noop: function () {
		        return undefined;
		    },
		    /**
		     * An array containing the current chart objects in the page. A chart's
		     * position in the array is preserved throughout the page's lifetime. When
		     * a chart is destroyed, the array item becomes `undefined`.
		     * @type {Array<Chart>}
		     * @memberOf Highcharts
		     */
		    charts: []
		};

		return Highcharts;
	}());
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */


		/**
		 * The Highcharts object is the placeholder for all other members, and various
		 * utility functions. The most important member of the namespace would be the
		 * chart constructor.
		 *
		 * @example
		 * var chart = Highcharts.chart('container', { ... });
		 *
		 * @namespace Highcharts
		 */

		H.timers = [];

		var charts = H.charts,
		    doc = H.doc,
		    win = H.win;

		/**
		 * Provide error messages for debugging, with links to online explanation. This
		 * function can be overridden to provide custom error handling.
		 *
		 * @function #error
		 * @memberOf Highcharts
		 * @param {Number|String} code - The error code. See [errors.xml]{@link
		 *     https://github.com/highcharts/highcharts/blob/master/errors/errors.xml}
		 *     for available codes. If it is a string, the error message is printed
		 *     directly in the console.
		 * @param {Boolean} [stop=false] - Whether to throw an error or just log a
		 *     warning in the console.
		 *
		 * @sample highcharts/chart/highcharts-error/ Custom error handler
		 */
		H.error = function (code, stop) {
		    var msg = H.isNumber(code) ?
		        'Highcharts error #' + code + ': www.highcharts.com/errors/' + code :
		        code;
		    if (stop) {
		        throw new Error(msg);
		    }
		    // else ...
		    if (win.console) {
		        console.log(msg); // eslint-disable-line no-console
		    }
		};

		/**
		 * An animator object used internally. One instance applies to one property
		 * (attribute or style prop) on one element. Animation is always initiated
		 * through {@link SVGElement#animate}.
		 *
		 * @constructor Fx
		 * @memberOf Highcharts
		 * @param {HTMLDOMElement|SVGElement} elem - The element to animate.
		 * @param {AnimationOptions} options - Animation options.
		 * @param {string} prop - The single attribute or CSS property to animate.
		 * @private
		 *
		 * @example
		 * var rect = renderer.rect(0, 0, 10, 10).add();
		 * rect.animate({ width: 100 });
		 */
		H.Fx = function (elem, options, prop) {
		    this.options = options;
		    this.elem = elem;
		    this.prop = prop;
		};
		H.Fx.prototype = {

		    /**
		     * Set the current step of a path definition on SVGElement.
		     *
		     * @function #dSetter
		     * @memberOf Highcharts.Fx
		     */
		    dSetter: function () {
		        var start = this.paths[0],
		            end = this.paths[1],
		            ret = [],
		            now = this.now,
		            i = start.length,
		            startVal;

		        // Land on the final path without adjustment points appended in the ends
		        if (now === 1) {
		            ret = this.toD;

		        } else if (i === end.length && now < 1) {
		            while (i--) {
		                startVal = parseFloat(start[i]);
		                ret[i] =
		                    isNaN(startVal) ? // a letter instruction like M or L
		                            end[i] :
		                            now * (parseFloat(end[i] - startVal)) + startVal;

		            }
		        // If animation is finished or length not matching, land on right value
		        } else {
		            ret = end;
		        }
		        this.elem.attr('d', ret, null, true);
		    },

		    /**
		     * Update the element with the current animation step.
		     *
		     * @function #update
		     * @memberOf Highcharts.Fx
		     */
		    update: function () {
		        var elem = this.elem,
		            prop = this.prop, // if destroyed, it is null
		            now = this.now,
		            step = this.options.step;

		        // Animation setter defined from outside
		        if (this[prop + 'Setter']) {
		            this[prop + 'Setter']();

		        // Other animations on SVGElement
		        } else if (elem.attr) {
		            if (elem.element) {
		                elem.attr(prop, now, null, true);
		            }

		        // HTML styles, raw HTML content like container size
		        } else {
		            elem.style[prop] = now + this.unit;
		        }

		        if (step) {
		            step.call(elem, now, this);
		        }

		    },

		    /**
		     * Run an animation.
		     *
		     * @function #run
		     * @memberOf Highcharts.Fx
		     * @param {Number} from - The current value, value to start from.
		     * @param {Number} to - The end value, value to land on.
		     * @param {String} [unit] - The property unit, for example `px`.
		     *
		     */
		    run: function (from, to, unit) {
		        var self = this,
		            options = self.options,
		            timer = function (gotoEnd) {
		                return timer.stopped ? false : self.step(gotoEnd);
		            },
		            requestAnimationFrame =
		                win.requestAnimationFrame ||
		                function (step) {
		                    setTimeout(step, 13);
		                },
		            step = function () {
		                for (var i = 0; i < H.timers.length; i++) {
		                    if (!H.timers[i]()) {
		                        H.timers.splice(i--, 1);
		                    }
		                }

		                if (H.timers.length) {
		                    requestAnimationFrame(step);
		                }
		            };

		        if (from === to && !this.elem['forceAnimate:' + this.prop]) {
		            delete options.curAnim[this.prop];
		            if (options.complete && H.keys(options.curAnim).length === 0) {
		                options.complete.call(this.elem);
		            }
		        } else { // #7166
		            this.startTime = +new Date();
		            this.start = from;
		            this.end = to;
		            this.unit = unit;
		            this.now = this.start;
		            this.pos = 0;

		            timer.elem = this.elem;
		            timer.prop = this.prop;

		            if (timer() && H.timers.push(timer) === 1) {
		                requestAnimationFrame(step);
		            }
		        }
		    },

		    /**
		     * Run a single step in the animation.
		     *
		     * @function #step
		     * @memberOf Highcharts.Fx
		     * @param   {Boolean} [gotoEnd] - Whether to go to the endpoint of the
		     *     animation after abort.
		     * @returns {Boolean} Returns `true` if animation continues.
		     */
		    step: function (gotoEnd) {
		        var t = +new Date(),
		            ret,
		            done,
		            options = this.options,
		            elem = this.elem,
		            complete = options.complete,
		            duration = options.duration,
		            curAnim = options.curAnim;

		        if (elem.attr && !elem.element) { // #2616, element is destroyed
		            ret = false;

		        } else if (gotoEnd || t >= duration + this.startTime) {
		            this.now = this.end;
		            this.pos = 1;
		            this.update();

		            curAnim[this.prop] = true;

		            done = true;

		            H.objectEach(curAnim, function (val) {
		                if (val !== true) {
		                    done = false;
		                }
		            });

		            if (done && complete) {
		                complete.call(elem);
		            }
		            ret = false;

		        } else {
		            this.pos = options.easing((t - this.startTime) / duration);
		            this.now = this.start + ((this.end - this.start) * this.pos);
		            this.update();
		            ret = true;
		        }
		        return ret;
		    },

		    /**
		     * Prepare start and end values so that the path can be animated one to one.
		     *
		     * @function #initPath
		     * @memberOf Highcharts.Fx
		     * @param {SVGElement} elem - The SVGElement item.
		     * @param {String} fromD - Starting path definition.
		     * @param {Array} toD - Ending path definition.
		     * @returns {Array} An array containing start and end paths in array form
		     * so that they can be animated in parallel.
		     */
		    initPath: function (elem, fromD, toD) {
		        fromD = fromD || '';
		        var shift,
		            startX = elem.startX,
		            endX = elem.endX,
		            bezier = fromD.indexOf('C') > -1,
		            numParams = bezier ? 7 : 3,
		            fullLength,
		            slice,
		            i,
		            start = fromD.split(' '),
		            end = toD.slice(), // copy
		            isArea = elem.isArea,
		            positionFactor = isArea ? 2 : 1,
		            reverse;

		        /**
		         * In splines make moveTo and lineTo points have six parameters like
		         * bezier curves, to allow animation one-to-one.
		         */
		        function sixify(arr) {
		            var isOperator,
		                nextIsOperator;
		            i = arr.length;
		            while (i--) {

		                // Fill in dummy coordinates only if the next operator comes
		                // three places behind (#5788)
		                isOperator = arr[i] === 'M' || arr[i] === 'L';
		                nextIsOperator = /[a-zA-Z]/.test(arr[i + 3]);
		                if (isOperator && nextIsOperator) {
		                    arr.splice(
		                        i + 1, 0,
		                        arr[i + 1], arr[i + 2],
		                        arr[i + 1], arr[i + 2]
		                    );
		                }
		            }
		        }

		        /**
		         * Insert an array at the given position of another array
		         */
		        function insertSlice(arr, subArr, index) {
		            [].splice.apply(
		                arr,
		                [index, 0].concat(subArr)
		            );
		        }

		        /**
		         * If shifting points, prepend a dummy point to the end path.
		         */
		        function prepend(arr, other) {
		            while (arr.length < fullLength) {

		                // Move to, line to or curve to?
		                arr[0] = other[fullLength - arr.length];

		                // Prepend a copy of the first point
		                insertSlice(arr, arr.slice(0, numParams), 0);

		                // For areas, the bottom path goes back again to the left, so we
		                // need to append a copy of the last point.
		                if (isArea) {
		                    insertSlice(
		                        arr,
		                        arr.slice(arr.length - numParams), arr.length
		                    );
		                    i--;
		                }
		            }
		            arr[0] = 'M';
		        }

		        /**
		         * Copy and append last point until the length matches the end length
		         */
		        function append(arr, other) {
		            var i = (fullLength - arr.length) / numParams;
		            while (i > 0 && i--) {

		                // Pull out the slice that is going to be appended or inserted.
		                // In a line graph, the positionFactor is 1, and the last point
		                // is sliced out. In an area graph, the positionFactor is 2,
		                // causing the middle two points to be sliced out, since an area
		                // path starts at left, follows the upper path then turns and
		                // follows the bottom back.
		                slice = arr.slice().splice(
		                    (arr.length / positionFactor) - numParams,
		                    numParams * positionFactor
		                );

		                // Move to, line to or curve to?
		                slice[0] = other[fullLength - numParams - (i * numParams)];

		                // Disable first control point
		                if (bezier) {
		                    slice[numParams - 6] = slice[numParams - 2];
		                    slice[numParams - 5] = slice[numParams - 1];
		                }

		                // Now insert the slice, either in the middle (for areas) or at
		                // the end (for lines)
		                insertSlice(arr, slice, arr.length / positionFactor);

		                if (isArea) {
		                    i--;
		                }
		            }
		        }

		        if (bezier) {
		            sixify(start);
		            sixify(end);
		        }

		        // For sideways animation, find out how much we need to shift to get the
		        // start path Xs to match the end path Xs.
		        if (startX && endX) {
		            for (i = 0; i < startX.length; i++) {
		                // Moving left, new points coming in on right
		                if (startX[i] === endX[0]) {
		                    shift = i;
		                    break;
		                // Moving right
		                } else if (startX[0] ===
		                        endX[endX.length - startX.length + i]) {
		                    shift = i;
		                    reverse = true;
		                    break;
		                }
		            }
		            if (shift === undefined) {
		                start = [];
		            }
		        }

		        if (start.length && H.isNumber(shift)) {

		            // The common target length for the start and end array, where both
		            // arrays are padded in opposite ends
		            fullLength = end.length + shift * positionFactor * numParams;

		            if (!reverse) {
		                prepend(end, start);
		                append(start, end);
		            } else {
		                prepend(start, end);
		                append(end, start);
		            }
		        }

		        return [start, end];
		    }
		}; // End of Fx prototype

		/**
		 * Handle animation of the color attributes directly.
		 */
		H.Fx.prototype.fillSetter =
		H.Fx.prototype.strokeSetter = function () {
		    this.elem.attr(
		        this.prop,
		        H.color(this.start).tweenTo(H.color(this.end), this.pos),
		        null,
		        true
		    );
		};


		/**
		 * Utility function to deep merge two or more objects and return a third object.
		 * If the first argument is true, the contents of the second object is copied
		 * into the first object. The merge function can also be used with a single
		 * object argument to create a deep copy of an object.
		 *
		 * @function #merge
		 * @memberOf Highcharts
		 * @param {Boolean} [extend] - Whether to extend the left-side object (a) or
		          return a whole new object.
		 * @param {Object} a - The first object to extend. When only this is given, the
		          function returns a deep copy.
		 * @param {...Object} [n] - An object to merge into the previous one.
		 * @returns {Object} - The merged object. If the first argument is true, the
		 * return is the same as the second argument.
		 */
		H.merge = function () {
		    var i,
		        args = arguments,
		        len,
		        ret = {},
		        doCopy = function (copy, original) {
		            // An object is replacing a primitive
		            if (typeof copy !== 'object') {
		                copy = {};
		            }

		            H.objectEach(original, function (value, key) {

		                // Copy the contents of objects, but not arrays or DOM nodes
		                if (
		                        H.isObject(value, true) &&
		                        !H.isClass(value) &&
		                        !H.isDOMElement(value)
		                ) {
		                    copy[key] = doCopy(copy[key] || {}, value);

		                // Primitives and arrays are copied over directly
		                } else {
		                    copy[key] = original[key];
		                }
		            });
		            return copy;
		        };

		    // If first argument is true, copy into the existing object. Used in
		    // setOptions.
		    if (args[0] === true) {
		        ret = args[1];
		        args = Array.prototype.slice.call(args, 2);
		    }

		    // For each argument, extend the return
		    len = args.length;
		    for (i = 0; i < len; i++) {
		        ret = doCopy(ret, args[i]);
		    }

		    return ret;
		};

		/**
		 * Shortcut for parseInt
		 * @ignore
		 * @param {Object} s
		 * @param {Number} mag Magnitude
		 */
		H.pInt = function (s, mag) {
		    return parseInt(s, mag || 10);
		};

		/**
		 * Utility function to check for string type.
		 *
		 * @function #isString
		 * @memberOf Highcharts
		 * @param {Object} s - The item to check.
		 * @returns {Boolean} - True if the argument is a string.
		 */
		H.isString = function (s) {
		    return typeof s === 'string';
		};

		/**
		 * Utility function to check if an item is an array.
		 *
		 * @function #isArray
		 * @memberOf Highcharts
		 * @param {Object} obj - The item to check.
		 * @returns {Boolean} - True if the argument is an array.
		 */
		H.isArray = function (obj) {
		    var str = Object.prototype.toString.call(obj);
		    return str === '[object Array]' || str === '[object Array Iterator]';
		};

		/**
		 * Utility function to check if an item is of type object.
		 *
		 * @function #isObject
		 * @memberOf Highcharts
		 * @param {Object} obj - The item to check.
		 * @param {Boolean} [strict=false] - Also checks that the object is not an
		 *    array.
		 * @returns {Boolean} - True if the argument is an object.
		 */
		H.isObject = function (obj, strict) {
		    return !!obj && typeof obj === 'object' && (!strict || !H.isArray(obj));
		};

		/**
		 * Utility function to check if an Object is a HTML Element.
		 *
		 * @function #isDOMElement
		 * @memberOf Highcharts
		 * @param {Object} obj - The item to check.
		 * @returns {Boolean} - True if the argument is a HTML Element.
		 */
		H.isDOMElement = function (obj) {
		    return H.isObject(obj) && typeof obj.nodeType === 'number';
		};

		/**
		 * Utility function to check if an Object is an class.
		 *
		 * @function #isClass
		 * @memberOf Highcharts
		 * @param {Object} obj - The item to check.
		 * @returns {Boolean} - True if the argument is an class.
		 */
		H.isClass = function (obj) {
		    var c = obj && obj.constructor;
		    return !!(
		        H.isObject(obj, true) &&
		        !H.isDOMElement(obj) &&
		        (c && c.name && c.name !== 'Object')
		    );
		};

		/**
		 * Utility function to check if an item is a number and it is finite (not NaN,
		 * Infinity or -Infinity).
		 *
		 * @function #isNumber
		 * @memberOf Highcharts
		 * @param  {Object} n
		 *         The item to check.
		 * @return {Boolean}
		 *         True if the item is a finite number
		 */
		H.isNumber = function (n) {
		    return typeof n === 'number' && !isNaN(n) && n < Infinity && n > -Infinity;
		};

		/**
		 * Remove the last occurence of an item from an array.
		 *
		 * @function #erase
		 * @memberOf Highcharts
		 * @param {Array} arr - The array.
		 * @param {*} item - The item to remove.
		 */
		H.erase = function (arr, item) {
		    var i = arr.length;
		    while (i--) {
		        if (arr[i] === item) {
		            arr.splice(i, 1);
		            break;
		        }
		    }
		};

		/**
		 * Check if an object is null or undefined.
		 *
		 * @function #defined
		 * @memberOf Highcharts
		 * @param {Object} obj - The object to check.
		 * @returns {Boolean} - False if the object is null or undefined, otherwise
		 *        true.
		 */
		H.defined = function (obj) {
		    return obj !== undefined && obj !== null;
		};

		/**
		 * Set or get an attribute or an object of attributes. To use as a setter, pass
		 * a key and a value, or let the second argument be a collection of keys and
		 * values. To use as a getter, pass only a string as the second argument.
		 *
		 * @function #attr
		 * @memberOf Highcharts
		 * @param {Object} elem - The DOM element to receive the attribute(s).
		 * @param {String|Object} [prop] - The property or an object of key-value pairs.
		 * @param {String} [value] - The value if a single property is set.
		 * @returns {*} When used as a getter, return the value.
		 */
		H.attr = function (elem, prop, value) {
		    var ret;

		    // if the prop is a string
		    if (H.isString(prop)) {
		        // set the value
		        if (H.defined(value)) {
		            elem.setAttribute(prop, value);

		        // get the value
		        } else if (elem && elem.getAttribute) {
		            ret = elem.getAttribute(prop);

		            // IE7 and below cannot get class through getAttribute (#7850)
		            if (!ret && prop === 'class') {
		                ret = elem.getAttribute(prop + 'Name');
		            }
		        }

		    // else if prop is defined, it is a hash of key/value pairs
		    } else if (H.defined(prop) && H.isObject(prop)) {
		        H.objectEach(prop, function (val, key) {
		            elem.setAttribute(key, val);
		        });
		    }
		    return ret;
		};

		/**
		 * Check if an element is an array, and if not, make it into an array.
		 *
		 * @function #splat
		 * @memberOf Highcharts
		 * @param obj {*} - The object to splat.
		 * @returns {Array} The produced or original array.
		 */
		H.splat = function (obj) {
		    return H.isArray(obj) ? obj : [obj];
		};

		/**
		 * Set a timeout if the delay is given, otherwise perform the function
		 * synchronously.
		 *
		 * @function #syncTimeout
		 * @memberOf Highcharts
		 * @param   {Function} fn - The function callback.
		 * @param   {Number}   delay - Delay in milliseconds.
		 * @param   {Object}   [context] - The context.
		 * @returns {Number} An identifier for the timeout that can later be cleared
		 * with H.clearTimeout.
		 */
		H.syncTimeout = function (fn, delay, context) {
		    if (delay) {
		        return setTimeout(fn, delay, context);
		    }
		    fn.call(0, context);
		};

		/**
		 * Internal clear timeout. The function checks that the `id` was not removed
		 * (e.g. by `chart.destroy()`). For the details see
		 * [issue #7901](https://github.com/highcharts/highcharts/issues/7901).
		 *
		 * @function #clearTimeout
		 * @memberOf Highcharts
		 * @param   {Number}   id - id of a timeout.
		 */
		H.clearTimeout = function (id) {
		    if (H.defined(id)) {
		        clearTimeout(id);
		    }
		};

		/**
		 * Utility function to extend an object with the members of another.
		 *
		 * @function #extend
		 * @memberOf Highcharts
		 * @param {Object} a - The object to be extended.
		 * @param {Object} b - The object to add to the first one.
		 * @returns {Object} Object a, the original object.
		 */
		H.extend = function (a, b) {
		    var n;
		    if (!a) {
		        a = {};
		    }
		    for (n in b) {
		        a[n] = b[n];
		    }
		    return a;
		};


		/**
		 * Return the first value that is not null or undefined.
		 *
		 * @function #pick
		 * @memberOf Highcharts
		 * @param {...*} items - Variable number of arguments to inspect.
		 * @returns {*} The value of the first argument that is not null or undefined.
		 */
		H.pick = function () {
		    var args = arguments,
		        i,
		        arg,
		        length = args.length;
		    for (i = 0; i < length; i++) {
		        arg = args[i];
		        if (arg !== undefined && arg !== null) {
		            return arg;
		        }
		    }
		};

		/**
		 * @typedef {Object} CSSObject - A style object with camel case property names.
		 * The properties can be whatever styles are supported on the given SVG or HTML
		 * element.
		 * @example
		 * {
		 *    fontFamily: 'monospace',
		 *    fontSize: '1.2em'
		 * }
		 */
		/**
		 * Set CSS on a given element.
		 *
		 * @function #css
		 * @memberOf Highcharts
		 * @param {HTMLDOMElement} el - A HTML DOM element.
		 * @param {CSSObject} styles - Style object with camel case property names.
		 *
		 */
		H.css = function (el, styles) {
		    if (H.isMS && !H.svg) { // #2686
		        if (styles && styles.opacity !== undefined) {
		            styles.filter = 'alpha(opacity=' + (styles.opacity * 100) + ')';
		        }
		    }
		    H.extend(el.style, styles);
		};

		/**
		 * A HTML DOM element.
		 * @typedef {Object} HTMLDOMElement
		 */

		/**
		 * Utility function to create an HTML element with attributes and styles.
		 *
		 * @function #createElement
		 * @memberOf Highcharts
		 * @param {String} tag - The HTML tag.
		 * @param {Object} [attribs] - Attributes as an object of key-value pairs.
		 * @param {CSSObject} [styles] - Styles as an object of key-value pairs.
		 * @param {Object} [parent] - The parent HTML object.
		 * @param {Boolean} [nopad=false] - If true, remove all padding, border and
		 *    margin.
		 * @returns {HTMLDOMElement} The created DOM element.
		 */
		H.createElement = function (tag, attribs, styles, parent, nopad) {
		    var el = doc.createElement(tag),
		        css = H.css;
		    if (attribs) {
		        H.extend(el, attribs);
		    }
		    if (nopad) {
		        css(el, { padding: 0, border: 'none', margin: 0 });
		    }
		    if (styles) {
		        css(el, styles);
		    }
		    if (parent) {
		        parent.appendChild(el);
		    }
		    return el;
		};

		/**
		 * Extend a prototyped class by new members.
		 *
		 * @function #extendClass
		 * @memberOf Highcharts
		 * @param {Object} parent - The parent prototype to inherit.
		 * @param {Object} members - A collection of prototype members to add or
		 *        override compared to the parent prototype.
		 * @returns {Object} A new prototype.
		 */
		H.extendClass = function (parent, members) {
		    var object = function () {};
		    object.prototype = new parent(); // eslint-disable-line new-cap
		    H.extend(object.prototype, members);
		    return object;
		};

		/**
		 * Left-pad a string to a given length by adding a character repetetively.
		 *
		 * @function #pad
		 * @memberOf Highcharts
		 * @param {Number} number - The input string or number.
		 * @param {Number} length - The desired string length.
		 * @param {String} [padder=0] - The character to pad with.
		 * @returns {String} The padded string.
		 */
		H.pad = function (number, length, padder) {
		    return new Array(
		            (length || 2) +
		            1 -
		            String(number)
		                .replace('-', '')
		                .length
		        ).join(padder || 0) + number;
		};

		/**
		 * @typedef {Number|String} RelativeSize - If a number is given, it defines the
		 *    pixel length. If a percentage string is given, like for example `'50%'`,
		 *    the setting defines a length relative to a base size, for example the size
		 *    of a container.
		 */
		/**
		 * Return a length based on either the integer value, or a percentage of a base.
		 *
		 * @function #relativeLength
		 * @memberOf Highcharts
		 * @param  {RelativeSize} value
		 *         A percentage string or a number.
		 * @param  {number} base
		 *         The full length that represents 100%.
		 * @param  {number} [offset=0]
		 *         A pixel offset to apply for percentage values. Used internally in
		 *         axis positioning.
		 * @return {number}
		 *         The computed length.
		 */
		H.relativeLength = function (value, base, offset) {
		    return (/%$/).test(value) ?
		        (base * parseFloat(value) / 100) + (offset || 0) :
		        parseFloat(value);
		};

		/**
		 * Wrap a method with extended functionality, preserving the original function.
		 *
		 * @function #wrap
		 * @memberOf Highcharts
		 * @param {Object} obj - The context object that the method belongs to. In real
		 *        cases, this is often a prototype.
		 * @param {String} method - The name of the method to extend.
		 * @param {Function} func - A wrapper function callback. This function is called
		 *        with the same arguments as the original function, except that the
		 *        original function is unshifted and passed as the first argument.
		 *
		 */
		H.wrap = function (obj, method, func) {
		    var proceed = obj[method];
		    obj[method] = function () {
		        var args = Array.prototype.slice.call(arguments),
		            outerArgs = arguments,
		            ctx = this,
		            ret;
		        ctx.proceed = function () {
		            proceed.apply(ctx, arguments.length ? arguments : outerArgs);
		        };
		        args.unshift(proceed);
		        ret = func.apply(this, args);
		        ctx.proceed = null;
		        return ret;
		    };
		};



		/**
		 * Format a single variable. Similar to sprintf, without the % prefix.
		 *
		 * @example
		 * formatSingle('.2f', 5); // => '5.00'.
		 *
		 * @function #formatSingle
		 * @memberOf Highcharts
		 * @param {String} format The format string.
		 * @param {*} val The value.
		 * @param {Time}   [time]
		 *        A `Time` instance that determines the date formatting, for example for
		 *        applying time zone corrections to the formatted date.

		 * @returns {String} The formatted representation of the value.
		 */
		H.formatSingle = function (format, val, time) {
		    var floatRegex = /f$/,
		        decRegex = /\.([0-9])/,
		        lang = H.defaultOptions.lang,
		        decimals;

		    if (floatRegex.test(format)) { // float
		        decimals = format.match(decRegex);
		        decimals = decimals ? decimals[1] : -1;
		        if (val !== null) {
		            val = H.numberFormat(
		                val,
		                decimals,
		                lang.decimalPoint,
		                format.indexOf(',') > -1 ? lang.thousandsSep : ''
		            );
		        }
		    } else {
		        val = (time || H.time).dateFormat(format, val);
		    }
		    return val;
		};

		/**
		 * Format a string according to a subset of the rules of Python's String.format
		 * method.
		 *
		 * @function #format
		 * @memberOf Highcharts
		 * @param {String} str
		 *        The string to format.
		 * @param {Object} ctx
		 *        The context, a collection of key-value pairs where each key is
		 *        replaced by its value.
		 * @param {Time}   [time]
		 *        A `Time` instance that determines the date formatting, for example for
		 *        applying time zone corrections to the formatted date.
		 * @returns {String} The formatted string.
		 *
		 * @example
		 * var s = Highcharts.format(
		 *     'The {color} fox was {len:.2f} feet long',
		 *     { color: 'red', len: Math.PI }
		 * );
		 * // => The red fox was 3.14 feet long
		 */
		H.format = function (str, ctx, time) {
		    var splitter = '{',
		        isInside = false,
		        segment,
		        valueAndFormat,
		        path,
		        i,
		        len,
		        ret = [],
		        val,
		        index;

		    while (str) {
		        index = str.indexOf(splitter);
		        if (index === -1) {
		            break;
		        }

		        segment = str.slice(0, index);
		        if (isInside) { // we're on the closing bracket looking back

		            valueAndFormat = segment.split(':');
		            path = valueAndFormat.shift().split('.'); // get first and leave
		            len = path.length;
		            val = ctx;

		            // Assign deeper paths
		            for (i = 0; i < len; i++) {
		                if (val) {
		                    val = val[path[i]];
		                }
		            }

		            // Format the replacement
		            if (valueAndFormat.length) {
		                val = H.formatSingle(valueAndFormat.join(':'), val, time);
		            }

		            // Push the result and advance the cursor
		            ret.push(val);

		        } else {
		            ret.push(segment);

		        }
		        str = str.slice(index + 1); // the rest
		        isInside = !isInside; // toggle
		        splitter = isInside ? '}' : '{'; // now look for next matching bracket
		    }
		    ret.push(str);
		    return ret.join('');
		};

		/**
		 * Get the magnitude of a number.
		 *
		 * @function #getMagnitude
		 * @memberOf Highcharts
		 * @param {Number} number The number.
		 * @returns {Number} The magnitude, where 1-9 are magnitude 1, 10-99 magnitude 2
		 *        etc.
		 */
		H.getMagnitude = function (num) {
		    return Math.pow(10, Math.floor(Math.log(num) / Math.LN10));
		};

		/**
		 * Take an interval and normalize it to multiples of round numbers.
		 *
		 * @todo  Move this function to the Axis prototype. It is here only for
		 *        historical reasons.
		 * @function #normalizeTickInterval
		 * @memberOf Highcharts
		 * @param {Number} interval - The raw, un-rounded interval.
		 * @param {Array} [multiples] - Allowed multiples.
		 * @param {Number} [magnitude] - The magnitude of the number.
		 * @param {Boolean} [allowDecimals] - Whether to allow decimals.
		 * @param {Boolean} [hasTickAmount] - If it has tickAmount, avoid landing
		 *        on tick intervals lower than original.
		 * @returns {Number} The normalized interval.
		 */
		H.normalizeTickInterval = function (interval, multiples, magnitude,
		        allowDecimals, hasTickAmount) {
		    var normalized,
		        i,
		        retInterval = interval;

		    // round to a tenfold of 1, 2, 2.5 or 5
		    magnitude = H.pick(magnitude, 1);
		    normalized = interval / magnitude;

		    // multiples for a linear scale
		    if (!multiples) {
		        multiples = hasTickAmount ?
		            // Finer grained ticks when the tick amount is hard set, including
		            // when alignTicks is true on multiple axes (#4580).
		            [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] :

		            // Else, let ticks fall on rounder numbers
		            [1, 2, 2.5, 5, 10];


		        // the allowDecimals option
		        if (allowDecimals === false) {
		            if (magnitude === 1) {
		                multiples = H.grep(multiples, function (num) {
		                    return num % 1 === 0;
		                });
		            } else if (magnitude <= 0.1) {
		                multiples = [1 / magnitude];
		            }
		        }
		    }

		    // normalize the interval to the nearest multiple
		    for (i = 0; i < multiples.length; i++) {
		        retInterval = multiples[i];
		        // only allow tick amounts smaller than natural
		        if (
		            (
		                hasTickAmount &&
		                retInterval * magnitude >= interval
		            ) ||
		            (
		                !hasTickAmount &&
		                (
		                    normalized <=
		                    (
		                        multiples[i] +
		                        (multiples[i + 1] || multiples[i])
		                    ) / 2
		                )
		            )
		        ) {
		            break;
		        }
		    }

		    // Multiply back to the correct magnitude. Correct floats to appropriate
		    // precision (#6085).
		    retInterval = H.correctFloat(
		        retInterval * magnitude,
		        -Math.round(Math.log(0.001) / Math.LN10)
		    );

		    return retInterval;
		};


		/**
		 * Sort an object array and keep the order of equal items. The ECMAScript
		 * standard does not specify the behaviour when items are equal.
		 *
		 * @function #stableSort
		 * @memberOf Highcharts
		 * @param {Array} arr - The array to sort.
		 * @param {Function} sortFunction - The function to sort it with, like with
		 *        regular Array.prototype.sort.
		 *
		 */
		H.stableSort = function (arr, sortFunction) {
		    var length = arr.length,
		        sortValue,
		        i;

		    // Add index to each item
		    for (i = 0; i < length; i++) {
		        arr[i].safeI = i; // stable sort index
		    }

		    arr.sort(function (a, b) {
		        sortValue = sortFunction(a, b);
		        return sortValue === 0 ? a.safeI - b.safeI : sortValue;
		    });

		    // Remove index from items
		    for (i = 0; i < length; i++) {
		        delete arr[i].safeI; // stable sort index
		    }
		};

		/**
		 * Non-recursive method to find the lowest member of an array. `Math.min` raises
		 * a maximum call stack size exceeded error in Chrome when trying to apply more
		 * than 150.000 points. This method is slightly slower, but safe.
		 *
		 * @function #arrayMin
		 * @memberOf  Highcharts
		 * @param {Array} data An array of numbers.
		 * @returns {Number} The lowest number.
		 */
		H.arrayMin = function (data) {
		    var i = data.length,
		        min = data[0];

		    while (i--) {
		        if (data[i] < min) {
		            min = data[i];
		        }
		    }
		    return min;
		};

		/**
		 * Non-recursive method to find the lowest member of an array. `Math.max` raises
		 * a maximum call stack size exceeded error in Chrome when trying to apply more
		 * than 150.000 points. This method is slightly slower, but safe.
		 *
		 * @function #arrayMax
		 * @memberOf  Highcharts
		 * @param {Array} data - An array of numbers.
		 * @returns {Number} The highest number.
		 */
		H.arrayMax = function (data) {
		    var i = data.length,
		        max = data[0];

		    while (i--) {
		        if (data[i] > max) {
		            max = data[i];
		        }
		    }
		    return max;
		};

		/**
		 * Utility method that destroys any SVGElement instances that are properties on
		 * the given object. It loops all properties and invokes destroy if there is a
		 * destroy method. The property is then delete.
		 *
		 * @function #destroyObjectProperties
		 * @memberOf Highcharts
		 * @param {Object} obj - The object to destroy properties on.
		 * @param {Object} [except] - Exception, do not destroy this property, only
		 *    delete it.
		 *
		 */
		H.destroyObjectProperties = function (obj, except) {
		    H.objectEach(obj, function (val, n) {
		        // If the object is non-null and destroy is defined
		        if (val && val !== except && val.destroy) {
		            // Invoke the destroy
		            val.destroy();
		        }

		        // Delete the property from the object.
		        delete obj[n];
		    });
		};


		/**
		 * Discard a HTML element by moving it to the bin and delete.
		 *
		 * @function #discardElement
		 * @memberOf Highcharts
		 * @param {HTMLDOMElement} element - The HTML node to discard.
		 *
		 */
		H.discardElement = function (element) {
		    var garbageBin = H.garbageBin;
		    // create a garbage bin element, not part of the DOM
		    if (!garbageBin) {
		        garbageBin = H.createElement('div');
		    }

		    // move the node and empty bin
		    if (element) {
		        garbageBin.appendChild(element);
		    }
		    garbageBin.innerHTML = '';
		};

		/**
		 * Fix JS round off float errors.
		 *
		 * @function #correctFloat
		 * @memberOf Highcharts
		 * @param {Number} num - A float number to fix.
		 * @param {Number} [prec=14] - The precision.
		 * @returns {Number} The corrected float number.
		 */
		H.correctFloat = function (num, prec) {
		    return parseFloat(
		        num.toPrecision(prec || 14)
		    );
		};

		/**
		 * Set the global animation to either a given value, or fall back to the given
		 * chart's animation option.
		 *
		 * @function #setAnimation
		 * @memberOf Highcharts
		 * @param {Boolean|Animation} animation - The animation object.
		 * @param {Object} chart - The chart instance.
		 *
		 * @todo This function always relates to a chart, and sets a property on the
		 *        renderer, so it should be moved to the SVGRenderer.
		 */
		H.setAnimation = function (animation, chart) {
		    chart.renderer.globalAnimation = H.pick(
		        animation,
		        chart.options.chart.animation,
		        true
		    );
		};

		/**
		 * Get the animation in object form, where a disabled animation is always
		 * returned as `{ duration: 0 }`.
		 *
		 * @function #animObject
		 * @memberOf Highcharts
		 * @param {Boolean|AnimationOptions} animation - An animation setting. Can be an
		 *        object with duration, complete and easing properties, or a boolean to
		 *        enable or disable.
		 * @returns {AnimationOptions} An object with at least a duration property.
		 */
		H.animObject = function (animation) {
		    return H.isObject(animation) ?
		        H.merge(animation) :
		        { duration: animation ? 500 : 0 };
		};

		/**
		 * The time unit lookup
		 */
		H.timeUnits = {
		    millisecond: 1,
		    second: 1000,
		    minute: 60000,
		    hour: 3600000,
		    day: 24 * 3600000,
		    week: 7 * 24 * 3600000,
		    month: 28 * 24 * 3600000,
		    year: 364 * 24 * 3600000
		};

		/**
		 * Format a number and return a string based on input settings.
		 *
		 * @function #numberFormat
		 * @memberOf Highcharts
		 * @param {Number} number - The input number to format.
		 * @param {Number} decimals - The amount of decimals. A value of -1 preserves
		 *        the amount in the input number.
		 * @param {String} [decimalPoint] - The decimal point, defaults to the one given
		 *        in the lang options, or a dot.
		 * @param {String} [thousandsSep] - The thousands separator, defaults to the one
		 *        given in the lang options, or a space character.
		 * @returns {String} The formatted number.
		 *
		 * @sample highcharts/members/highcharts-numberformat/ Custom number format
		 */
		H.numberFormat = function (number, decimals, decimalPoint, thousandsSep) {
		    number = +number || 0;
		    decimals = +decimals;

		    var lang = H.defaultOptions.lang,
		        origDec = (number.toString().split('.')[1] || '').split('e')[0].length,
		        strinteger,
		        thousands,
		        ret,
		        roundedNumber,
		        exponent = number.toString().split('e'),
		        fractionDigits;

		    if (decimals === -1) {
		        // Preserve decimals. Not huge numbers (#3793).
		        decimals = Math.min(origDec, 20);
		    } else if (!H.isNumber(decimals)) {
		        decimals = 2;
		    } else if (decimals && exponent[1] && exponent[1] < 0) {
		        // Expose decimals from exponential notation (#7042)
		        fractionDigits = decimals + +exponent[1];
		        if (fractionDigits >= 0) {
		            // remove too small part of the number while keeping the notation
		            exponent[0] = (+exponent[0]).toExponential(fractionDigits)
		                .split('e')[0];
		            decimals = fractionDigits;
		        } else {
		            // fractionDigits < 0
		            exponent[0] = exponent[0].split('.')[0] || 0;

		            if (decimals < 20) {
		                // use number instead of exponential notation (#7405)
		                number = (exponent[0] * Math.pow(10, exponent[1]))
		                    .toFixed(decimals);
		            } else {
		                // or zero
		                number = 0;
		            }
		            exponent[1] = 0;
		        }
		    }

		    // Add another decimal to avoid rounding errors of float numbers. (#4573)
		    // Then use toFixed to handle rounding.
		    roundedNumber = (
		        Math.abs(exponent[1] ? exponent[0] : number) +
		        Math.pow(10, -Math.max(decimals, origDec) - 1)
		    ).toFixed(decimals);

		    // A string containing the positive integer component of the number
		    strinteger = String(H.pInt(roundedNumber));

		    // Leftover after grouping into thousands. Can be 0, 1 or 2.
		    thousands = strinteger.length > 3 ? strinteger.length % 3 : 0;

		    // Language
		    decimalPoint = H.pick(decimalPoint, lang.decimalPoint);
		    thousandsSep = H.pick(thousandsSep, lang.thousandsSep);

		    // Start building the return
		    ret = number < 0 ? '-' : '';

		    // Add the leftover after grouping into thousands. For example, in the
		    // number 42 000 000, this line adds 42.
		    ret += thousands ? strinteger.substr(0, thousands) + thousandsSep : '';

		    // Add the remaining thousands groups, joined by the thousands separator
		    ret += strinteger
		        .substr(thousands)
		        .replace(/(\d{3})(?=\d)/g, '$1' + thousandsSep);

		    // Add the decimal point and the decimal component
		    if (decimals) {
		        // Get the decimal component
		        ret += decimalPoint + roundedNumber.slice(-decimals);
		    }

		    if (exponent[1] && +ret !== 0) {
		        ret += 'e' + exponent[1];
		    }

		    return ret;
		};

		/**
		 * Easing definition
		 * @ignore
		 * @param   {Number} pos Current position, ranging from 0 to 1.
		 */
		Math.easeInOutSine = function (pos) {
		    return -0.5 * (Math.cos(Math.PI * pos) - 1);
		};

		/**
		 * Get the computed CSS value for given element and property, only for numerical
		 * properties. For width and height, the dimension of the inner box (excluding
		 * padding) is returned. Used for fitting the chart within the container.
		 *
		 * @function #getStyle
		 * @memberOf Highcharts
		 * @param {HTMLDOMElement} el - A HTML element.
		 * @param {String} prop - The property name.
		 * @param {Boolean} [toInt=true] - Parse to integer.
		 * @returns {Number} - The numeric value.
		 */
		H.getStyle = function (el, prop, toInt) {

		    var style;

		    // For width and height, return the actual inner pixel size (#4913)
		    if (prop === 'width') {
		        return Math.max(
		            0, // #8377
		            Math.min(el.offsetWidth, el.scrollWidth) -
		                H.getStyle(el, 'padding-left') -
		                H.getStyle(el, 'padding-right')
		        );
		    } else if (prop === 'height') {
		        return Math.max(
		            0, // #8377
		            Math.min(el.offsetHeight, el.scrollHeight) -
		                H.getStyle(el, 'padding-top') -
		                H.getStyle(el, 'padding-bottom')
		        );
		    }

		    if (!win.getComputedStyle) {
		        // SVG not supported, forgot to load oldie.js?
		        H.error(27, true);
		    }

		    // Otherwise, get the computed style
		    style = win.getComputedStyle(el, undefined);
		    if (style) {
		        style = style.getPropertyValue(prop);
		        if (H.pick(toInt, prop !== 'opacity')) {
		            style = H.pInt(style);
		        }
		    }
		    return style;
		};

		/**
		 * Search for an item in an array.
		 *
		 * @function #inArray
		 * @memberOf Highcharts
		 * @param {*} item - The item to search for.
		 * @param {arr} arr - The array or node collection to search in.
		 * @param {fromIndex} [fromIndex=0] - The index to start searching from.
		 * @returns {Number} - The index within the array, or -1 if not found.
		 */
		H.inArray = function (item, arr, fromIndex) {
		    return (
		        H.indexOfPolyfill ||
		        Array.prototype.indexOf
		    ).call(arr, item, fromIndex);
		};

		/**
		 * Filter an array by a callback.
		 *
		 * @function #grep
		 * @memberOf Highcharts
		 * @param {Array} arr - The array to filter.
		 * @param {Function} callback - The callback function. The function receives the
		 *        item as the first argument. Return `true` if the item is to be
		 *        preserved.
		 * @returns {Array} - A new, filtered array.
		 */
		H.grep = function (arr, callback) {
		    return (H.filterPolyfill || Array.prototype.filter).call(arr, callback);
		};

		/**
		 * Return the value of the first element in the array that satisfies the
		 * provided testing function.
		 *
		 * @function #find
		 * @memberOf Highcharts
		 * @param {Array} arr - The array to test.
		 * @param {Function} callback - The callback function. The function receives the
		 *        item as the first argument. Return `true` if this item satisfies the
		 *        condition.
		 * @returns {Mixed} - The value of the element.
		 */
		H.find = Array.prototype.find ?
		    function (arr, callback) {
		        return arr.find(callback);
		    } :
		    // Legacy implementation. PhantomJS, IE <= 11 etc. #7223.
		    function (arr, fn) {
		        var i,
		            length = arr.length;

		        for (i = 0; i < length; i++) {
		            if (fn(arr[i], i)) {
		                return arr[i];
		            }
		        }
		    };

		/**
		 * Test whether at least one element in the array passes the test implemented by
		 * the provided function.
		 *
		 * @function #some
		 * @memberOf Highcharts
		 * @param  {Array}   arr  The array to test
		 * @param  {Function} fn  The function to run on each item. Return truty to pass
		 *                        the test. Receives arguments `currentValue`, `index`
		 *                        and `array`.
		 * @param  {Object}   ctx The context.
		 */
		H.some = function (arr, fn, ctx) {
		    return (H.somePolyfill || Array.prototype.some).call(arr, fn, ctx);
		};

		/**
		 * Map an array by a callback.
		 *
		 * @function #map
		 * @memberOf Highcharts
		 * @param {Array} arr - The array to map.
		 * @param {Function} fn - The callback function. Return the new value for the
		 *        new array.
		 * @returns {Array} - A new array item with modified items.
		 */
		H.map = function (arr, fn) {
		    var results = [],
		        i = 0,
		        len = arr.length;

		    for (; i < len; i++) {
		        results[i] = fn.call(arr[i], arr[i], i, arr);
		    }

		    return results;
		};

		/**
		 * Returns an array of a given object's own properties.
		 *
		 * @function #keys
		 * @memberOf highcharts
		 * @param {Object} obj - The object of which the properties are to be returned.
		 * @returns {Array} - An array of strings that represents all the properties.
		 */
		H.keys = function (obj) {
		    return (H.keysPolyfill || Object.keys).call(undefined, obj);
		};

		/**
		 * Reduce an array to a single value.
		 *
		 * @function #reduce
		 * @memberOf Highcharts
		 * @param {Array} arr - The array to reduce.
		 * @param {Function} fn - The callback function. Return the reduced value.
		 *  Receives 4 arguments: Accumulated/reduced value, current value, current
		 *  array index, and the array.
		 * @param {Mixed} initialValue - The initial value of the accumulator.
		 * @returns {Mixed} - The reduced value.
		 */
		H.reduce = function (arr, func, initialValue) {
		    return (H.reducePolyfill || Array.prototype.reduce).call(
		        arr,
		        func,
		        initialValue
		    );
		};

		/**
		 * Get the element's offset position, corrected for `overflow: auto`.
		 *
		 * @function #offset
		 * @memberOf Highcharts
		 * @param {HTMLDOMElement} el - The HTML element.
		 * @returns {Object} An object containing `left` and `top` properties for the
		 * position in the page.
		 */
		H.offset = function (el) {
		    var docElem = doc.documentElement,
		        box = (el.parentElement || el.parentNode) ?
		            el.getBoundingClientRect() :
		            { top: 0, left: 0 };

		    return {
		        top: box.top  + (win.pageYOffset || docElem.scrollTop) -
		            (docElem.clientTop  || 0),
		        left: box.left + (win.pageXOffset || docElem.scrollLeft) -
		            (docElem.clientLeft || 0)
		    };
		};

		/**
		 * Stop running animation.
		 *
		 * @todo A possible extension to this would be to stop a single property, when
		 * we want to continue animating others. Then assign the prop to the timer
		 * in the Fx.run method, and check for the prop here. This would be an
		 * improvement in all cases where we stop the animation from .attr. Instead of
		 * stopping everything, we can just stop the actual attributes we're setting.
		 *
		 * @function #stop
		 * @memberOf Highcharts
		 * @param {SVGElement} el - The SVGElement to stop animation on.
		 * @param {string} [prop] - The property to stop animating. If given, the stop
		 *    method will stop a single property from animating, while others continue.
		 *
		 */
		H.stop = function (el, prop) {

		    var i = H.timers.length;

		    // Remove timers related to this element (#4519)
		    while (i--) {
		        if (H.timers[i].elem === el && (!prop || prop === H.timers[i].prop)) {
		            H.timers[i].stopped = true; // #4667
		        }
		    }
		};

		/**
		 * Iterate over an array.
		 *
		 * @function #each
		 * @memberOf Highcharts
		 * @param {Array} arr - The array to iterate over.
		 * @param {Function} fn - The iterator callback. It passes three arguments:
		 * * item - The array item.
		 * * index - The item's index in the array.
		 * * arr - The array that each is being applied to.
		 * @param {Object} [ctx] The context.
		 */
		H.each = function (arr, fn, ctx) { // modern browsers
		    return (H.forEachPolyfill || Array.prototype.forEach).call(arr, fn, ctx);
		};

		/**
		 * Iterate over object key pairs in an object.
		 *
		 * @function #objectEach
		 * @memberOf Highcharts
		 * @param  {Object}   obj - The object to iterate over.
		 * @param  {Function} fn  - The iterator callback. It passes three arguments:
		 * * value - The property value.
		 * * key - The property key.
		 * * obj - The object that objectEach is being applied to.
		 * @param  {Object}   ctx The context
		 */
		H.objectEach = function (obj, fn, ctx) {
		    for (var key in obj) {
		        if (obj.hasOwnProperty(key)) {
		            fn.call(ctx || obj[key], obj[key], key, obj);
		        }
		    }
		};

		/**
		 * Add an event listener.
		 *
		 * @function #addEvent
		 * @memberOf Highcharts
		 * @param {Object} el - The element or object to add a listener to. It can be a
		 *        {@link HTMLDOMElement}, an {@link SVGElement} or any other object.
		 * @param {String} type - The event type.
		 * @param {Function} fn - The function callback to execute when the event is
		 *        fired.
		 * @param {Object} options
		 *        Event options
		 * @param {Number} options.order
		 *        The order the event handler should be called. This opens for having
		 *        one handler be called before another, independent of in which order
		 *        they were added.
		 * @returns {Function} A callback function to remove the added event.
		 */
		H.addEvent = function (el, type, fn, options) {

		    var events,
		        addEventListener = el.addEventListener || H.addEventListenerPolyfill;

		    // If we're setting events directly on the constructor, use a separate
		    // collection, `protoEvents` to distinguish it from the item events in
		    // `hcEvents`.
		    if (typeof el === 'function' && el.prototype) {
		        events = el.prototype.protoEvents = el.prototype.protoEvents || {};
		    } else {
		        events = el.hcEvents = el.hcEvents || {};
		    }

		    // Allow click events added to points, otherwise they will be prevented by
		    // the TouchPointer.pinch function after a pinch zoom operation (#7091).
		    if (H.Point && el instanceof H.Point && el.series && el.series.chart) {
		        el.series.chart.runTrackerClick = true;
		    }

		    // Handle DOM events
		    if (addEventListener) {
		        addEventListener.call(el, type, fn, false);
		    }

		    if (!events[type]) {
		        events[type] = [];
		    }

		    events[type].push(fn);

		    // Order the calls
		    if (options && H.isNumber(options.order)) {
		        fn.order = options.order;
		        events[type].sort(function (a, b) {
		            return a.order - b.order;
		        });
		    }

		    // Return a function that can be called to remove this event.
		    return function () {
		        H.removeEvent(el, type, fn);
		    };
		};

		/**
		 * Remove an event that was added with {@link Highcharts#addEvent}.
		 *
		 * @function #removeEvent
		 * @memberOf Highcharts
		 * @param {Object} el - The element to remove events on.
		 * @param {String} [type] - The type of events to remove. If undefined, all
		 *        events are removed from the element.
		 * @param {Function} [fn] - The specific callback to remove. If undefined, all
		 *        events that match the element and optionally the type are removed.
		 *
		 */
		H.removeEvent = function (el, type, fn) {

		    var events,
		        index;

		    function removeOneEvent(type, fn) {
		        var removeEventListener =
		            el.removeEventListener || H.removeEventListenerPolyfill;

		        if (removeEventListener) {
		            removeEventListener.call(el, type, fn, false);
		        }
		    }

		    function removeAllEvents(eventCollection) {
		        var types,
		            len;

		        if (!el.nodeName) {
		            return; // break on non-DOM events
		        }

		        if (type) {
		            types = {};
		            types[type] = true;
		        } else {
		            types = eventCollection;
		        }

		        H.objectEach(types, function (val, n) {
		            if (eventCollection[n]) {
		                len = eventCollection[n].length;
		                while (len--) {
		                    removeOneEvent(n, eventCollection[n][len]);
		                }
		            }
		        });
		    }

		    H.each(['protoEvents', 'hcEvents'], function (coll) {
		        var eventCollection = el[coll];
		        if (eventCollection) {
		            if (type) {
		                events = eventCollection[type] || [];
		                if (fn) {
		                    index = H.inArray(fn, events);
		                    if (index > -1) {
		                        events.splice(index, 1);
		                        eventCollection[type] = events;
		                    }
		                    removeOneEvent(type, fn);

		                } else {
		                    removeAllEvents(eventCollection);
		                    eventCollection[type] = [];
		                }
		            } else {
		                removeAllEvents(eventCollection);
		                el[coll] = {};
		            }
		        }
		    });
		};

		/**
		 * Fire an event that was registered with {@link Highcharts#addEvent}.
		 *
		 * @function #fireEvent
		 * @memberOf Highcharts
		 * @param {Object} el - The object to fire the event on. It can be a
		 *        {@link HTMLDOMElement}, an {@link SVGElement} or any other object.
		 * @param {String} type - The type of event.
		 * @param {Object} [eventArguments] - Custom event arguments that are passed on
		 *        as an argument to the event handler.
		 * @param {Function} [defaultFunction] - The default function to execute if the
		 *        other listeners haven't returned false.
		 *
		 */
		H.fireEvent = function (el, type, eventArguments, defaultFunction) {
		    var e,
		        events,
		        len,
		        i,
		        fn;

		    eventArguments = eventArguments || {};

		    if (doc.createEvent && (el.dispatchEvent || el.fireEvent)) {
		        e = doc.createEvent('Events');
		        e.initEvent(type, true, true);

		        H.extend(e, eventArguments);

		        if (el.dispatchEvent) {
		            el.dispatchEvent(e);
		        } else {
		            el.fireEvent(type, e);
		        }

		    } else {

		        H.each(['protoEvents', 'hcEvents'], function (coll) {

		            if (el[coll]) {
		                events = el[coll][type] || [];
		                len = events.length;

		                if (!eventArguments.target) { // We're running a custom event

		                    H.extend(eventArguments, {
		                        // Attach a simple preventDefault function to skip
		                        // default handler if called. The built-in
		                        // defaultPrevented property is not overwritable (#5112)
		                        preventDefault: function () {
		                            eventArguments.defaultPrevented = true;
		                        },
		                        // Setting target to native events fails with clicking
		                        // the zoom-out button in Chrome.
		                        target: el,
		                        // If the type is not set, we're running a custom event
		                        // (#2297). If it is set, we're running a browser event,
		                        // and setting it will cause en error in IE8 (#2465).
		                        type: type
		                    });
		                }


		                for (i = 0; i < len; i++) {
		                    fn = events[i];

		                    // If the event handler return false, prevent the default
		                    // handler from executing
		                    if (fn && fn.call(el, eventArguments) === false) {
		                        eventArguments.preventDefault();
		                    }
		                }
		            }
		        });
		    }

		    // Run the default if not prevented
		    if (defaultFunction && !eventArguments.defaultPrevented) {
		        defaultFunction.call(el, eventArguments);
		    }
		};

		/**
		 * An animation configuration. Animation configurations can also be defined as
		 * booleans, where `false` turns off animation and `true` defaults to a duration
		 * of 500ms.
		 * @typedef {Object} AnimationOptions
		 * @property {Number} duration - The animation duration in milliseconds.
		 * @property {String} [easing] - The name of an easing function as defined on
		 *     the `Math` object.
		 * @property {Function} [complete] - A callback function to exectute when the
		 *     animation finishes.
		 * @property {Function} [step] - A callback function to execute on each step of
		 *     each attribute or CSS property that's being animated. The first argument
		 *     contains information about the animation and progress.
		 */


		/**
		 * The global animate method, which uses Fx to create individual animators.
		 *
		 * @function #animate
		 * @memberOf Highcharts
		 * @param {HTMLDOMElement|SVGElement} el - The element to animate.
		 * @param {Object} params - An object containing key-value pairs of the
		 *        properties to animate. Supports numeric as pixel-based CSS properties
		 *        for HTML objects and attributes for SVGElements.
		 * @param {AnimationOptions} [opt] - Animation options.
		 */
		H.animate = function (el, params, opt) {
		    var start,
		        unit = '',
		        end,
		        fx,
		        args;

		    if (!H.isObject(opt)) { // Number or undefined/null
		        args = arguments;
		        opt = {
		            duration: args[2],
		            easing: args[3],
		            complete: args[4]
		        };
		    }
		    if (!H.isNumber(opt.duration)) {
		        opt.duration = 400;
		    }
		    opt.easing = typeof opt.easing === 'function' ?
		        opt.easing :
		        (Math[opt.easing] || Math.easeInOutSine);
		    opt.curAnim = H.merge(params);

		    H.objectEach(params, function (val, prop) {
		        // Stop current running animation of this property
		        H.stop(el, prop);

		        fx = new H.Fx(el, opt, prop);
		        end = null;

		        if (prop === 'd') {
		            fx.paths = fx.initPath(
		                el,
		                el.d,
		                params.d
		            );
		            fx.toD = params.d;
		            start = 0;
		            end = 1;
		        } else if (el.attr) {
		            start = el.attr(prop);
		        } else {
		            start = parseFloat(H.getStyle(el, prop)) || 0;
		            if (prop !== 'opacity') {
		                unit = 'px';
		            }
		        }

		        if (!end) {
		            end = val;
		        }
		        if (end && end.match && end.match('px')) {
		            end = end.replace(/px/g, ''); // #4351
		        }
		        fx.run(start, end, unit);
		    });
		};

		/**
		 * Factory to create new series prototypes.
		 *
		 * @function #seriesType
		 * @memberOf Highcharts
		 *
		 * @param {String} type - The series type name.
		 * @param {String} parent - The parent series type name. Use `line` to inherit
		 *        from the basic {@link Series} object.
		 * @param {Object} options - The additional default options that is merged with
		 *        the parent's options.
		 * @param {Object} props - The properties (functions and primitives) to set on
		 *        the new prototype.
		 * @param {Object} [pointProps] - Members for a series-specific extension of the
		 *        {@link Point} prototype if needed.
		 * @returns {*} - The newly created prototype as extended from {@link Series}
		 * or its derivatives.
		 */
		// docs: add to API + extending Highcharts
		H.seriesType = function (type, parent, options, props, pointProps) {
		    var defaultOptions = H.getOptions(),
		        seriesTypes = H.seriesTypes;

		    // Merge the options
		    defaultOptions.plotOptions[type] = H.merge(
		        defaultOptions.plotOptions[parent],
		        options
		    );

		    // Create the class
		    seriesTypes[type] = H.extendClass(seriesTypes[parent] ||
		        function () {}, props);
		    seriesTypes[type].prototype.type = type;

		    // Create the point class if needed
		    if (pointProps) {
		        seriesTypes[type].prototype.pointClass =
		            H.extendClass(H.Point, pointProps);
		    }

		    return seriesTypes[type];
		};

		/**
		 * Get a unique key for using in internal element id's and pointers. The key
		 * is composed of a random hash specific to this Highcharts instance, and a
		 * counter.
		 * @function #uniqueKey
		 * @memberOf Highcharts
		 * @return {string} The key.
		 * @example
		 * var id = H.uniqueKey(); // => 'highcharts-x45f6hp-0'
		 */
		H.uniqueKey = (function () {

		    var uniqueKeyHash = Math.random().toString(36).substring(2, 9),
		        idCounter = 0;

		    return function () {
		        return 'highcharts-' + uniqueKeyHash + '-' + idCounter++;
		    };
		}());

		/**
		 * Register Highcharts as a plugin in jQuery
		 */
		if (win.jQuery) {
		    win.jQuery.fn.highcharts = function () {
		        var args = [].slice.call(arguments);

		        if (this[0]) { // this[0] is the renderTo div

		            // Create the chart
		            if (args[0]) {
		                new H[ // eslint-disable-line no-new
		                    // Constructor defaults to Chart
		                    H.isString(args[0]) ? args.shift() : 'Chart'
		                ](this[0], args[0], args[1]);
		                return this;
		            }

		            // When called without parameters or with the return argument,
		            // return an existing chart
		            return charts[H.attr(this[0], 'data-highcharts-chart')];
		        }
		    };
		}

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var each = H.each,
		    isNumber = H.isNumber,
		    map = H.map,
		    merge = H.merge,
		    pInt = H.pInt;

		/**
		 * @typedef {string} ColorString
		 * A valid color to be parsed and handled by Highcharts. Highcharts internally
		 * supports hex colors like `#ffffff`, rgb colors like `rgb(255,255,255)` and
		 * rgba colors like `rgba(255,255,255,1)`. Other colors may be supported by the
		 * browsers and displayed correctly, but Highcharts is not able to process them
		 * and apply concepts like opacity and brightening.
		 */
		/**
		 * Handle color operations. The object methods are chainable.
		 * @param {String} input The input color in either rbga or hex format
		 */
		H.Color = function (input) {
		    // Backwards compatibility, allow instanciation without new
		    if (!(this instanceof H.Color)) {
		        return new H.Color(input);
		    }
		    // Initialize
		    this.init(input);
		};
		H.Color.prototype = {

		    // Collection of parsers. This can be extended from the outside by pushing
		    // parsers to Highcharts.Color.prototype.parsers.
		    parsers: [{
		        // RGBA color
		        regex: /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/, // eslint-disable-line security/detect-unsafe-regex
		        parse: function (result) {
		            return [
		                pInt(result[1]),
		                pInt(result[2]),
		                pInt(result[3]),
		                parseFloat(result[4], 10)
		            ];
		        }
		    }, {
		        // RGB color
		        regex:
		            /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/,
		        parse: function (result) {
		            return [pInt(result[1]), pInt(result[2]), pInt(result[3]), 1];
		        }
		    }],

		    // Collection of named colors. Can be extended from the outside by adding
		    // colors to Highcharts.Color.prototype.names.
		    names: {
		        none: 'rgba(255,255,255,0)',
		        white: '#ffffff',
		        black: '#000000'
		    },

		    /**
		     * Parse the input color to rgba array
		     * @param {String} input
		     */
		    init: function (input) {
		        var result,
		            rgba,
		            i,
		            parser,
		            len;

		        this.input = input = this.names[
		                                input && input.toLowerCase ?
		                                    input.toLowerCase() :
		                                    ''
		                            ] || input;

		        // Gradients
		        if (input && input.stops) {
		            this.stops = map(input.stops, function (stop) {
		                return new H.Color(stop[1]);
		            });

		        // Solid colors
		        } else {

		            // Bitmasking as input[0] is not working for legacy IE.
		            if (input && input.charAt && input.charAt() === '#') {

		                len = input.length;
		                input = parseInt(input.substr(1), 16);

		                // Handle long-form, e.g. #AABBCC
		                if (len === 7) {

		                    rgba = [
		                        (input & 0xFF0000) >> 16,
		                        (input & 0xFF00) >> 8,
		                        (input & 0xFF),
		                        1
		                    ];

		                // Handle short-form, e.g. #ABC
		                // In short form, the value is assumed to be the same
		                // for both nibbles for each component. e.g. #ABC = #AABBCC
		                } else if (len === 4) {

		                    rgba = [
		                        ((input & 0xF00) >> 4) | (input & 0xF00) >> 8,
		                        ((input & 0xF0) >> 4) | (input & 0xF0),
		                        ((input & 0xF) << 4) | (input & 0xF),
		                        1
		                    ];
		                }
		            }

		            // Otherwise, check regex parsers
		            if (!rgba) {
		                i = this.parsers.length;
		                while (i-- && !rgba) {
		                    parser = this.parsers[i];
		                    result = parser.regex.exec(input);
		                    if (result) {
		                        rgba = parser.parse(result);
		                    }
		                }
		            }
		        }
		        this.rgba = rgba || [];
		    },

		    /**
		     * Return the color a specified format
		     * @param {String} format
		     */
		    get: function (format) {
		        var input = this.input,
		            rgba = this.rgba,
		            ret;

		        if (this.stops) {
		            ret = merge(input);
		            ret.stops = [].concat(ret.stops);
		            each(this.stops, function (stop, i) {
		                ret.stops[i] = [ret.stops[i][0], stop.get(format)];
		            });

		        // it's NaN if gradient colors on a column chart
		        } else if (rgba && isNumber(rgba[0])) {
		            if (format === 'rgb' || (!format && rgba[3] === 1)) {
		                ret = 'rgb(' + rgba[0] + ',' + rgba[1] + ',' + rgba[2] + ')';
		            } else if (format === 'a') {
		                ret = rgba[3];
		            } else {
		                ret = 'rgba(' + rgba.join(',') + ')';
		            }
		        } else {
		            ret = input;
		        }
		        return ret;
		    },

		    /**
		     * Brighten the color
		     * @param {Number} alpha
		     */
		    brighten: function (alpha) {
		        var i,
		            rgba = this.rgba;

		        if (this.stops) {
		            each(this.stops, function (stop) {
		                stop.brighten(alpha);
		            });

		        } else if (isNumber(alpha) && alpha !== 0) {
		            for (i = 0; i < 3; i++) {
		                rgba[i] += pInt(alpha * 255);

		                if (rgba[i] < 0) {
		                    rgba[i] = 0;
		                }
		                if (rgba[i] > 255) {
		                    rgba[i] = 255;
		                }
		            }
		        }
		        return this;
		    },

		    /**
		     * Set the color's opacity to a given alpha value
		     * @param {Number} alpha
		     */
		    setOpacity: function (alpha) {
		        this.rgba[3] = alpha;
		        return this;
		    },

		    /*
		     * Return an intermediate color between two colors.
		     *
		     * @param  {Highcharts.Color} to
		     *         The color object to tween to.
		     * @param  {Number} pos
		     *         The intermediate position, where 0 is the from color (current
		     *         color item), and 1 is the `to` color.
		     *
		     * @return {String}
		     *         The intermediate color in rgba notation.
		     */
		    tweenTo: function (to, pos) {
		        // Check for has alpha, because rgba colors perform worse due to lack of
		        // support in WebKit.
		        var fromRgba = this.rgba,
		            toRgba = to.rgba,
		            hasAlpha,
		            ret;

		        // Unsupported color, return to-color (#3920, #7034)
		        if (!toRgba.length || !fromRgba || !fromRgba.length) {
		            ret = to.input || 'none';

		        // Interpolate
		        } else {
		            hasAlpha = (toRgba[3] !== 1 || fromRgba[3] !== 1);
		            ret = (hasAlpha ? 'rgba(' : 'rgb(') +
		                Math.round(toRgba[0] + (fromRgba[0] - toRgba[0]) * (1 - pos)) +
		                ',' +
		                Math.round(toRgba[1] + (fromRgba[1] - toRgba[1]) * (1 - pos)) +
		                ',' +
		                Math.round(toRgba[2] + (fromRgba[2] - toRgba[2]) * (1 - pos)) +
		                (
		                    hasAlpha ?
		                        (
		                            ',' +
		                            (toRgba[3] + (fromRgba[3] - toRgba[3]) * (1 - pos))
		                        ) :
		                        ''
		                ) +
		                ')';
		        }
		        return ret;
		    }
		};
		H.color = function (input) {
		    return new H.Color(input);
		};

	}(Highcharts));
	(function (Highcharts) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */



		var H = Highcharts,
		    defined = H.defined,
		    each = H.each,
		    extend = H.extend,
		    merge = H.merge,
		    pick = H.pick,
		    timeUnits = H.timeUnits,
		    win = H.win;

		/**
		 * The Time class. Time settings are applied in general for each page using
		 * `Highcharts.setOptions`, or individually for each Chart item through the
		 * [time](https://api.highcharts.com/highcharts/time) options set.
		 *
		 * The Time object is available from
		 * [Chart.time](http://api.highcharts.com/class-reference/Highcharts.Chart#.time),
		 * which refers to  `Highcharts.time` if no individual time settings are
		 * applied.
		 *
		 * @example
		 * // Apply time settings globally
		 * Highcharts.setOptions({
		 *     time: {
		 *         timezone: 'Europe/London'
		 *     }
		 * });
		 *
		 * // Apply time settings by instance
		 * var chart = Highcharts.chart('container', {
		 *     time: {
		 *         timezone: 'America/New_York'
		 *     },
		 *     series: [{
		 *         data: [1, 4, 3, 5]
		 *     }]
		 * });
		 *
		 * // Use the Time object
		 * console.log(
		 *        'Current time in New York',
		 *        chart.time.dateFormat('%Y-%m-%d %H:%M:%S', Date.now())
		 * );
		 *
		 * @param  options {Object}
		 *         Time options as defined in [chart.options.time](/highcharts/time).
		 * @since  6.0.5
		 * @class
		 */
		Highcharts.Time = function (options) {
		    this.update(options, false);
		};

		Highcharts.Time.prototype = {

		    /**
		     * Time options that can apply globally or to individual charts. These
		     * settings affect how `datetime` axes are laid out, how tooltips are
		     * formatted, how series
		     * [pointIntervalUnit](#plotOptions.series.pointIntervalUnit) works and how
		     * the Highstock range selector handles time.
		     *
		     * The common use case is that all charts in the same Highcharts object
		     * share the same time settings, in which case the global settings are set
		     * using `setOptions`.
		     *
		     * ```js
		     * // Apply time settings globally
		     * Highcharts.setOptions({
		     *     time: {
		     *         timezone: 'Europe/London'
		     *     }
		     * });
		     * // Apply time settings by instance
		     * var chart = Highcharts.chart('container', {
		     *     time: {
		     *         timezone: 'America/New_York'
		     *     },
		     *     series: [{
		     *         data: [1, 4, 3, 5]
		     *     }]
		     * });
		     *
		     * // Use the Time object
		     * console.log(
		     *        'Current time in New York',
		     *        chart.time.dateFormat('%Y-%m-%d %H:%M:%S', Date.now())
		     * );
		     * ```
		     *
		     * Since v6.0.5, the time options were moved from the `global` obect to the
		     * `time` object, and time options can be set on each individual chart.
		     *
		     * @sample {highcharts|highstock}
		     *         highcharts/time/timezone/
		     *         Set the timezone globally
		     * @sample {highcharts}
		     *         highcharts/time/individual/
		     *         Set the timezone per chart instance
		     * @sample {highstock}
		     *         stock/time/individual/
		     *         Set the timezone per chart instance
		     * @since 6.0.5
		     * @apioption time
		     */

		    /**
		     * Whether to use UTC time for axis scaling, tickmark placement and
		     * time display in `Highcharts.dateFormat`. Advantages of using UTC
		     * is that the time displays equally regardless of the user agent's
		     * time zone settings. Local time can be used when the data is loaded
		     * in real time or when correct Daylight Saving Time transitions are
		     * required.
		     *
		     * @type {Boolean}
		     * @sample {highcharts} highcharts/time/useutc-true/ True by default
		     * @sample {highcharts} highcharts/time/useutc-false/ False
		     * @apioption time.useUTC
		     * @default true
		     */

		    /**
		     * A custom `Date` class for advanced date handling. For example,
		     * [JDate](https://github.com/tahajahangir/jdate) can be hooked in to
		     * handle Jalali dates.
		     *
		     * @type {Object}
		     * @since 4.0.4
		     * @product highcharts highstock
		     * @apioption time.Date
		     */

		    /**
		     * A callback to return the time zone offset for a given datetime. It
		     * takes the timestamp in terms of milliseconds since January 1 1970,
		     * and returns the timezone offset in minutes. This provides a hook
		     * for drawing time based charts in specific time zones using their
		     * local DST crossover dates, with the help of external libraries.
		     *
		     * @type {Function}
		     * @see [global.timezoneOffset](#global.timezoneOffset)
		     * @sample {highcharts|highstock}
		     *         highcharts/time/gettimezoneoffset/
		     *         Use moment.js to draw Oslo time regardless of browser locale
		     * @since 4.1.0
		     * @product highcharts highstock
		     * @apioption time.getTimezoneOffset
		     */

		    /**
		     * Requires [moment.js](http://momentjs.com/). If the timezone option
		     * is specified, it creates a default
		     * [getTimezoneOffset](#time.getTimezoneOffset) function that looks
		     * up the specified timezone in moment.js. If moment.js is not included,
		     * this throws a Highcharts error in the console, but does not crash the
		     * chart.
		     *
		     * @type {String}
		     * @see [getTimezoneOffset](#time.getTimezoneOffset)
		     * @sample {highcharts|highstock}
		     *         highcharts/time/timezone/
		     *         Europe/Oslo
		     * @default undefined
		     * @since 5.0.7
		     * @product highcharts highstock
		     * @apioption time.timezone
		     */

		    /**
		     * The timezone offset in minutes. Positive values are west, negative
		     * values are east of UTC, as in the ECMAScript
		     * [getTimezoneOffset](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset)
		     * method. Use this to display UTC based data in a predefined time zone.
		     *
		     * @type {Number}
		     * @see [time.getTimezoneOffset](#time.getTimezoneOffset)
		     * @sample {highcharts|highstock}
		     *         highcharts/time/timezoneoffset/
		     *         Timezone offset
		     * @default 0
		     * @since 3.0.8
		     * @product highcharts highstock
		     * @apioption time.timezoneOffset
		     */
		    defaultOptions: {},

		    /**
		     * Update the Time object with current options. It is called internally on
		     * initiating Highcharts, after running `Highcharts.setOptions` and on
		     * `Chart.update`.
		     *
		     * @private
		     */
		    update: function (options) {
		        var useUTC = pick(options && options.useUTC, true),
		            time = this;

		        this.options = options = merge(true, this.options || {}, options);

		        // Allow using a different Date class
		        this.Date = options.Date || win.Date;

		        this.useUTC = useUTC;
		        this.timezoneOffset = useUTC && options.timezoneOffset;

		        /**
		         * Get the time zone offset based on the current timezone information as
		         * set in the global options.
		         *
		         * @function #getTimezoneOffset
		         * @memberOf Highcharts.Time
		         * @param  {Number} timestamp
		         *         The JavaScript timestamp to inspect.
		         * @return {Number}
		         *         The timezone offset in minutes compared to UTC.
		         */
		        this.getTimezoneOffset = this.timezoneOffsetFunction();

		        /*
		         * The time object has options allowing for variable time zones, meaning
		         * the axis ticks or series data needs to consider this.
		         */
		        this.variableTimezone = !!(
		            !useUTC ||
		            options.getTimezoneOffset ||
		            options.timezone
		        );

		        // UTC time with timezone handling
		        if (this.variableTimezone || this.timezoneOffset) {
		            this.get = function (unit, date) {
		                var realMs = date.getTime(),
		                    ms = realMs - time.getTimezoneOffset(date),
		                    ret;

		                date.setTime(ms); // Temporary adjust to timezone
		                ret = date['getUTC' + unit]();
		                date.setTime(realMs); // Reset

		                return ret;
		            };
		            this.set = function (unit, date, value) {
		                var ms, offset, newOffset;

		                // For lower order time units, just set it directly using local
		                // time
		                if (
		                    H.inArray(unit, ['Milliseconds', 'Seconds', 'Minutes']) !==
		                    -1
		                ) {
		                    date['set' + unit](value);

		                // Higher order time units need to take the time zone into
		                // account
		                } else {

		                    // Adjust by timezone
		                    offset = time.getTimezoneOffset(date);
		                    ms = date.getTime() - offset;
		                    date.setTime(ms);

		                    date['setUTC' + unit](value);
		                    newOffset = time.getTimezoneOffset(date);

		                    ms = date.getTime() + newOffset;
		                    date.setTime(ms);
		                }

		            };

		        // UTC time with no timezone handling
		        } else if (useUTC) {
		            this.get = function (unit, date) {
		                return date['getUTC' + unit]();
		            };
		            this.set = function (unit, date, value) {
		                return date['setUTC' + unit](value);
		            };

		        // Local time
		        } else {
		            this.get = function (unit, date) {
		                return date['get' + unit]();
		            };
		            this.set = function (unit, date, value) {
		                return date['set' + unit](value);
		            };
		        }

		    },

		    /**
		     * Make a time and returns milliseconds. Interprets the inputs as UTC time,
		     * local time or a specific timezone time depending on the current time
		     * settings.
		     *
		     * @param  {Number} year
		     *         The year
		     * @param  {Number} month
		     *         The month. Zero-based, so January is 0.
		     * @param  {Number} date
		     *         The day of the month
		     * @param  {Number} hours
		     *         The hour of the day, 0-23.
		     * @param  {Number} minutes
		     *         The minutes
		     * @param  {Number} seconds
		     *         The seconds
		     *
		     * @return {Number}
		     *         The time in milliseconds since January 1st 1970.
		     */
		    makeTime: function (year, month, date, hours, minutes, seconds) {
		        var d, offset, newOffset;
		        if (this.useUTC) {
		            d = this.Date.UTC.apply(0, arguments);
		            offset = this.getTimezoneOffset(d);
		            d += offset;
		            newOffset = this.getTimezoneOffset(d);

		            if (offset !== newOffset) {
		                d += newOffset - offset;

		            // A special case for transitioning from summer time to winter time.
		            // When the clock is set back, the same time is repeated twice, i.e.
		            // 02:30 am is repeated since the clock is set back from 3 am to
		            // 2 am. We need to make the same time as local Date does.
		            } else if (
		                offset - 36e5 === this.getTimezoneOffset(d - 36e5) &&
		                !H.isSafari
		            ) {
		                d -= 36e5;
		            }

		        } else {
		            d = new this.Date(
		                year,
		                month,
		                pick(date, 1),
		                pick(hours, 0),
		                pick(minutes, 0),
		                pick(seconds, 0)
		            ).getTime();
		        }
		        return d;
		    },

		    /**
		     * Sets the getTimezoneOffset function. If the `timezone` option is set, a
		     * default getTimezoneOffset function with that timezone is returned. If
		     * a `getTimezoneOffset` option is defined, it is returned. If neither are
		     * specified, the function using the `timezoneOffset` option or 0 offset is
		     * returned.
		     *
		     * @private
		     * @return {Function} A getTimezoneOffset function
		     */
		    timezoneOffsetFunction: function () {
		        var time = this,
		            options = this.options,
		            moment = win.moment;

		        if (!this.useUTC) {
		            return function (timestamp) {
		                return new Date(timestamp).getTimezoneOffset() * 60000;
		            };
		        }

		        if (options.timezone) {
		            if (!moment) {
		                // getTimezoneOffset-function stays undefined because it depends
		                // on Moment.js
		                H.error(25);

		            } else {
		                return function (timestamp) {
		                    return -moment.tz(
		                        timestamp,
		                        options.timezone
		                    ).utcOffset() * 60000;
		                };
		            }
		        }

		        // If not timezone is set, look for the getTimezoneOffset callback
		        if (this.useUTC && options.getTimezoneOffset) {
		            return function (timestamp) {
		                return options.getTimezoneOffset(timestamp) * 60000;
		            };
		        }

		        // Last, use the `timezoneOffset` option if set
		        return function () {
		            return (time.timezoneOffset || 0) * 60000;
		        };
		    },

		    /**
		     * Formats a JavaScript date timestamp (milliseconds since Jan 1st 1970)
		     * into a human readable date string. The format is a subset of the formats
		     * for PHP's [strftime](http://www.php.net/manual/en/function.strftime.php)
		     * function. Additional formats can be given in the
		     * {@link Highcharts.dateFormats} hook.
		     *
		     * @param {String} format
		     *        The desired format where various time
		     *        representations are prefixed with %.
		     * @param {Number} timestamp
		     *        The JavaScript timestamp.
		     * @param {Boolean} [capitalize=false]
		     *        Upper case first letter in the return.
		     * @returns {String} The formatted date.
		     */
		    dateFormat: function (format, timestamp, capitalize) {
		        if (!H.defined(timestamp) || isNaN(timestamp)) {
		            return H.defaultOptions.lang.invalidDate || '';
		        }
		        format = H.pick(format, '%Y-%m-%d %H:%M:%S');

		        var time = this,
		            date = new this.Date(timestamp),
		            // get the basic time values
		            hours = this.get('Hours', date),
		            day = this.get('Day', date),
		            dayOfMonth = this.get('Date', date),
		            month = this.get('Month', date),
		            fullYear = this.get('FullYear', date),
		            lang = H.defaultOptions.lang,
		            langWeekdays = lang.weekdays,
		            shortWeekdays = lang.shortWeekdays,
		            pad = H.pad,

		            // List all format keys. Custom formats can be added from the
		            // outside.
		            replacements = H.extend(
		                {

		                    // Day
		                    // Short weekday, like 'Mon'
		                    'a': shortWeekdays ?
		                        shortWeekdays[day] :
		                        langWeekdays[day].substr(0, 3),
		                    // Long weekday, like 'Monday'
		                    'A': langWeekdays[day],
		                    // Two digit day of the month, 01 to 31
		                    'd': pad(dayOfMonth),
		                    // Day of the month, 1 through 31
		                    'e': pad(dayOfMonth, 2, ' '),
		                    'w': day,

		                    // Week (none implemented)
		                    // 'W': weekNumber(),

		                    // Month
		                    // Short month, like 'Jan'
		                    'b': lang.shortMonths[month],
		                    // Long month, like 'January'
		                    'B': lang.months[month],
		                    // Two digit month number, 01 through 12
		                    'm': pad(month + 1),
		                    // Month number, 1 through 12 (#8150)
		                    'o': month + 1,

		                    // Year
		                    // Two digits year, like 09 for 2009
		                    'y': fullYear.toString().substr(2, 2),
		                    // Four digits year, like 2009
		                    'Y': fullYear,

		                    // Time
		                    // Two digits hours in 24h format, 00 through 23
		                    'H': pad(hours),
		                    // Hours in 24h format, 0 through 23
		                    'k': hours,
		                    // Two digits hours in 12h format, 00 through 11
		                    'I': pad((hours % 12) || 12),
		                    // Hours in 12h format, 1 through 12
		                    'l': (hours % 12) || 12,
		                    // Two digits minutes, 00 through 59
		                    'M': pad(time.get('Minutes', date)),
		                    // Upper case AM or PM
		                    'p': hours < 12 ? 'AM' : 'PM',
		                    // Lower case AM or PM
		                    'P': hours < 12 ? 'am' : 'pm',
		                    // Two digits seconds, 00 through  59
		                    'S': pad(date.getSeconds()),
		                    // Milliseconds (naming from Ruby)
		                    'L': pad(Math.round(timestamp % 1000), 3)
		                },

		                /**
		                 * A hook for defining additional date format specifiers. New
		                 * specifiers are defined as key-value pairs by using the
		                 * specifier as key, and a function which takes the timestamp as
		                 * value. This function returns the formatted portion of the
		                 * date.
		                 *
		                 * @type {Object}
		                 * @name dateFormats
		                 * @memberOf Highcharts
		                 * @sample highcharts/global/dateformats/
		                 *         Adding support for week
		                 * number
		                 */
		                H.dateFormats
		            );


		        // Do the replaces
		        H.objectEach(replacements, function (val, key) {
		            // Regex would do it in one line, but this is faster
		            while (format.indexOf('%' + key) !== -1) {
		                format = format.replace(
		                    '%' + key,
		                    typeof val === 'function' ? val.call(time, timestamp) : val
		                );
		            }

		        });

		        // Optionally capitalize the string and return
		        return capitalize ?
		            format.substr(0, 1).toUpperCase() + format.substr(1) :
		            format;
		    },

		    /**
		     * Return an array with time positions distributed on round time values
		     * right and right after min and max. Used in datetime axes as well as for
		     * grouping data on a datetime axis.
		     *
		     * @param {Object} normalizedInterval
		     *        The interval in axis values (ms) and thecount
		     * @param {Number} min The minimum in axis values
		     * @param {Number} max The maximum in axis values
		     * @param {Number} startOfWeek
		     */
		    getTimeTicks: function (
		        normalizedInterval,
		        min,
		        max,
		        startOfWeek
		    ) {
		        var time = this,
		            Date = time.Date,
		            tickPositions = [],
		            i,
		            higherRanks = {},
		            minYear, // used in months and years as a basis for Date.UTC()
		            // When crossing DST, use the max. Resolves #6278.
		            minDate = new Date(min),
		            interval = normalizedInterval.unitRange,
		            count = normalizedInterval.count || 1,
		            variableDayLength;

		        if (defined(min)) { // #1300
		            time.set(
		                'Milliseconds',
		                minDate,
		                interval >= timeUnits.second ?
		                    0 : // #3935
		                    count * Math.floor(
		                        time.get('Milliseconds', minDate) / count
		                    )
		            ); // #3652, #3654

		            if (interval >= timeUnits.second) { // second
		                time.set('Seconds',
		                    minDate,
		                    interval >= timeUnits.minute ?
		                        0 : // #3935
		                        count * Math.floor(time.get('Seconds', minDate) / count)
		                );
		            }

		            if (interval >= timeUnits.minute) { // minute
		                time.set('Minutes',    minDate,
		                    interval >= timeUnits.hour ?
		                        0 :
		                        count * Math.floor(time.get('Minutes', minDate) / count)
		                );
		            }

		            if (interval >= timeUnits.hour) { // hour
		                time.set(
		                    'Hours',
		                    minDate,
		                    interval >= timeUnits.day ?
		                        0 :
		                        count * Math.floor(
		                            time.get('Hours', minDate) / count
		                        )
		                );
		            }

		            if (interval >= timeUnits.day) { // day
		                time.set(
		                    'Date',
		                    minDate,
		                    interval >= timeUnits.month ?
		                        1 :
		                        count * Math.floor(time.get('Date', minDate) / count)
		                    );
		            }

		            if (interval >= timeUnits.month) { // month
		                time.set(
		                    'Month',
		                    minDate,
		                    interval >= timeUnits.year ? 0 :
		                        count * Math.floor(time.get('Month', minDate) / count)
		                );
		                minYear = time.get('FullYear', minDate);
		            }

		            if (interval >= timeUnits.year) { // year
		                minYear -= minYear % count;
		                time.set('FullYear', minDate, minYear);
		            }

		            // week is a special case that runs outside the hierarchy
		            if (interval === timeUnits.week) {
		                // get start of current week, independent of count
		                time.set(
		                    'Date',
		                    minDate,
		                    (
		                        time.get('Date', minDate) -
		                        time.get('Day', minDate) +
		                        pick(startOfWeek, 1)
		                    )
		                );
		            }


		            // Get basics for variable time spans
		            minYear = time.get('FullYear', minDate);
		            var minMonth = time.get('Month', minDate),
		                minDateDate = time.get('Date', minDate),
		                minHours = time.get('Hours', minDate);

		            // Redefine min to the floored/rounded minimum time (#7432)
		            min = minDate.getTime();

		            // Handle local timezone offset
		            if (time.variableTimezone) {

		                // Detect whether we need to take the DST crossover into
		                // consideration. If we're crossing over DST, the day length may
		                // be 23h or 25h and we need to compute the exact clock time for
		                // each tick instead of just adding hours. This comes at a cost,
		                // so first we find out if it is needed (#4951).
		                variableDayLength = (
		                    // Long range, assume we're crossing over.
		                    max - min > 4 * timeUnits.month ||
		                    // Short range, check if min and max are in different time
		                    // zones.
		                    time.getTimezoneOffset(min) !== time.getTimezoneOffset(max)
		                );
		            }

		            // Iterate and add tick positions at appropriate values
		            var t = minDate.getTime();
		            i = 1;
		            while (t < max) {
		                tickPositions.push(t);

		                // if the interval is years, use Date.UTC to increase years
		                if (interval === timeUnits.year) {
		                    t = time.makeTime(minYear + i * count, 0);

		                // if the interval is months, use Date.UTC to increase months
		                } else if (interval === timeUnits.month) {
		                    t = time.makeTime(minYear, minMonth + i * count);

		                // if we're using global time, the interval is not fixed as it
		                // jumps one hour at the DST crossover
		                } else if (
		                    variableDayLength &&
		                    (interval === timeUnits.day || interval === timeUnits.week)
		                ) {
		                    t = time.makeTime(
		                        minYear,
		                        minMonth,
		                        minDateDate +
		                            i * count * (interval === timeUnits.day ? 1 : 7)
		                    );

		                } else if (
		                    variableDayLength &&
		                    interval === timeUnits.hour &&
		                    count > 1
		                ) {
		                    // make sure higher ranks are preserved across DST (#6797,
		                    // #7621)
		                    t = time.makeTime(
		                        minYear,
		                        minMonth,
		                        minDateDate,
		                        minHours + i * count
		                    );

		                // else, the interval is fixed and we use simple addition
		                } else {
		                    t += interval * count;
		                }

		                i++;
		            }

		            // push the last time
		            tickPositions.push(t);


		            // Handle higher ranks. Mark new days if the time is on midnight
		            // (#950, #1649, #1760, #3349). Use a reasonable dropout threshold
		            // to prevent looping over dense data grouping (#6156).
		            if (interval <= timeUnits.hour && tickPositions.length < 10000) {
		                each(tickPositions, function (t) {
		                    if (
		                        // Speed optimization, no need to run dateFormat unless
		                        // we're on a full or half hour
		                        t % 1800000 === 0 &&
		                        // Check for local or global midnight
		                        time.dateFormat('%H%M%S%L', t) === '000000000'
		                    ) {
		                        higherRanks[t] = 'day';
		                    }
		                });
		            }
		        }


		        // record information on the chosen unit - for dynamic label formatter
		        tickPositions.info = extend(normalizedInterval, {
		            higherRanks: higherRanks,
		            totalRange: interval * count
		        });

		        return tickPositions;
		    }

		}; // end of Time


	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */

		var color = H.color,
		    isTouchDevice = H.isTouchDevice,
		    merge = H.merge,
		    svg = H.svg;

		/* ****************************************************************************
		 * Handle the options                                                         *
		 *****************************************************************************/
		/**
		 * @optionparent
		 */
		H.defaultOptions = {
    


		    /**
		     * Styled mode only. Configuration object for adding SVG definitions for
		     * reusable elements. See [gradients, shadows and patterns](http://www.
		     * highcharts.com/docs/chart-design-and-style/gradients-shadows-and-
		     * patterns) for more information and code examples.
		     *
		     * @type {Object}
		     * @since 5.0.0
		     * @apioption defs
		     */

		    /**
		     * @ignore-option
		     */
		    symbols: ['circle', 'diamond', 'square', 'triangle', 'triangle-down'],
		    lang: {

		        /**
		         * The loading text that appears when the chart is set into the loading
		         * state following a call to `chart.showLoading`.
		         *
		         * @type {String}
		         * @default Loading...
		         */
		        loading: 'Loading...',

		        /**
		         * An array containing the months names. Corresponds to the `%B` format
		         * in `Highcharts.dateFormat()`.
		         *
		         * @type {Array<String>}
		         * @default [ "January" , "February" , "March" , "April" , "May" ,
		         *          "June" , "July" , "August" , "September" , "October" ,
		         *          "November" , "December"]
		         */
		        months: [
		            'January', 'February', 'March', 'April', 'May', 'June', 'July',
		            'August', 'September', 'October', 'November', 'December'
		        ],

		        /**
		         * An array containing the months names in abbreviated form. Corresponds
		         * to the `%b` format in `Highcharts.dateFormat()`.
		         *
		         * @type {Array<String>}
		         * @default [ "Jan" , "Feb" , "Mar" , "Apr" , "May" , "Jun" ,
		         *          "Jul" , "Aug" , "Sep" , "Oct" , "Nov" , "Dec"]
		         */
		        shortMonths: [
		            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
		            'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
		        ],

		        /**
		         * An array containing the weekday names.
		         *
		         * @type {Array<String>}
		         * @default ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
		         *          "Friday", "Saturday"]
		         */
		        weekdays: [
		            'Sunday', 'Monday', 'Tuesday', 'Wednesday',
		            'Thursday', 'Friday', 'Saturday'
		        ],

		        /**
		         * Short week days, starting Sunday. If not specified, Highcharts uses
		         * the first three letters of the `lang.weekdays` option.
		         *
		         * @type {Array<String>}
		         * @sample highcharts/lang/shortweekdays/
		         *         Finnish two-letter abbreviations
		         * @since 4.2.4
		         * @apioption lang.shortWeekdays
		         */

		        /**
		         * What to show in a date field for invalid dates. Defaults to an empty
		         * string.
		         *
		         * @type {String}
		         * @since 4.1.8
		         * @product highcharts highstock
		         * @apioption lang.invalidDate
		         */

		        /**
		         * The default decimal point used in the `Highcharts.numberFormat`
		         * method unless otherwise specified in the function arguments.
		         *
		         * @type {String}
		         * @default .
		         * @since 1.2.2
		         */
		        decimalPoint: '.',

		        /**
		         * [Metric prefixes](http://en.wikipedia.org/wiki/Metric_prefix) used
		         * to shorten high numbers in axis labels. Replacing any of the
		         * positions with `null` causes the full number to be written. Setting
		         * `numericSymbols` to `null` disables shortening altogether.
		         *
		         * @type {Array<String>}
		         * @sample {highcharts} highcharts/lang/numericsymbols/
		         *         Replacing the symbols with text
		         * @sample {highstock} highcharts/lang/numericsymbols/
		         *         Replacing the symbols with text
		         * @default [ "k" , "M" , "G" , "T" , "P" , "E"]
		         * @since 2.3.0
		         */
		        numericSymbols: ['k', 'M', 'G', 'T', 'P', 'E'],

		        /**
		         * The magnitude of [numericSymbols](#lang.numericSymbol) replacements.
		         * Use 10000 for Japanese, Korean and various Chinese locales, which
		         * use symbols for 10^4, 10^8 and 10^12.
		         *
		         * @type {Number}
		         * @sample highcharts/lang/numericsymbolmagnitude/
		         *         10000 magnitude for Japanese
		         * @default 1000
		         * @since 5.0.3
		         * @apioption lang.numericSymbolMagnitude
		         */

		        /**
		         * The text for the label appearing when a chart is zoomed.
		         *
		         * @type {String}
		         * @default Reset zoom
		         * @since 1.2.4
		         */
		        resetZoom: 'Reset zoom',

		        /**
		         * The tooltip title for the label appearing when a chart is zoomed.
		         *
		         * @type {String}
		         * @default Reset zoom level 1:1
		         * @since 1.2.4
		         */
		        resetZoomTitle: 'Reset zoom level 1:1',

		        /**
		         * The default thousands separator used in the `Highcharts.numberFormat`
		         * method unless otherwise specified in the function arguments. Since
		         * Highcharts 4.1 it defaults to a single space character, which is
		         * compatible with ISO and works across Anglo-American and continental
		         * European languages.
		         *
		         * The default is a single space.
		         *
		         * @type {String}
		         * @default
		         * @since 1.2.2
		         */
		        thousandsSep: ' '
		    },

		    /**
		     * Global options that don't apply to each chart. These options, like
		     * the `lang` options, must be set using the `Highcharts.setOptions`
		     * method.
		     *
		     * <pre>Highcharts.setOptions({
		     *     global: {
		     *         useUTC: false
		     *     }
		     * });</pre>
		     *
		     */

		    /**
		     * _Canvg rendering for Android 2.x is removed as of Highcharts 5.0\.
		     * Use the [libURL](#exporting.libURL) option to configure exporting._
		     *
		     * The URL to the additional file to lazy load for Android 2.x devices.
		     * These devices don't support SVG, so we download a helper file that
		     * contains [canvg](http://code.google.com/p/canvg/), its dependency
		     * rbcolor, and our own CanVG Renderer class. To avoid hotlinking to
		     * our site, you can install canvas-tools.js on your own server and
		     * change this option accordingly.
		     *
		     * @type {String}
		     * @deprecated
		     * @default http://code.highcharts.com/{version}/modules/canvas-tools.js
		     * @product highcharts highmaps
		     * @apioption global.canvasToolsURL
		     */

		    /**
		     * This option is deprecated since v6.0.5. Instead, use
		     * [time.useUTC](#time.useUTC) that supports individual time settings
		     * per chart.
		     *
		     * @deprecated
		     * @type {Boolean}
		     * @apioption global.useUTC
		     */

		    /**
		     * This option is deprecated since v6.0.5. Instead, use
		     * [time.Date](#time.Date) that supports individual time settings
		     * per chart.
		     *
		     * @deprecated
		     * @type {Object}
		     * @product highcharts highstock
		     * @apioption global.Date
		     */

		    /**
		     * This option is deprecated since v6.0.5. Instead, use
		     * [time.getTimezoneOffset](#time.getTimezoneOffset) that supports
		     * individual time settings per chart.
		     *
		     * @deprecated
		     * @type {Function}
		     * @product highcharts highstock
		     * @apioption global.getTimezoneOffset
		     */

		    /**
		     * This option is deprecated since v6.0.5. Instead, use
		     * [time.timezone](#time.timezone) that supports individual time
		     * settings per chart.
		     *
		     * @deprecated
		     * @type {String}
		     * @product highcharts highstock
		     * @apioption global.timezone
		     */

		    /**
		     * This option is deprecated since v6.0.5. Instead, use
		     * [time.timezoneOffset](#time.timezoneOffset) that supports individual
		     * time settings per chart.
		     *
		     * @deprecated
		     * @type {Number}
		     * @product highcharts highstock
		     * @apioption global.timezoneOffset
		     */
		    global: {},


		    time: H.Time.prototype.defaultOptions,

		    /**
		     * General options for the chart.
		     * @type {Object}
		     */
		    chart: {

		        /**
		         * When using multiple axis, the ticks of two or more opposite axes
		         * will automatically be aligned by adding ticks to the axis or axes
		         * with the least ticks, as if `tickAmount` were specified.
		         *
		         * This can be prevented by setting `alignTicks` to false. If the grid
		         * lines look messy, it's a good idea to hide them for the secondary
		         * axis by setting `gridLineWidth` to 0.
		         *
		         * If `startOnTick` or `endOnTick` in an Axis options are set to false,
		         * then the `alignTicks ` will be disabled for the Axis.
		         *
		         * Disabled for logarithmic axes.
		         *
		         * @type      {Boolean}
		         * @sample    {highcharts} highcharts/chart/alignticks-true/
		         *            True by default
		         * @sample    {highcharts} highcharts/chart/alignticks-false/
		         *            False
		         * @sample    {highstock} stock/chart/alignticks-true/
		         *            True by default
		         * @sample    {highstock} stock/chart/alignticks-false/
		         *            False
		         * @default   true
		         * @product   highcharts highstock
		         * @apioption chart.alignTicks
		         */


		        /**
		         * Set the overall animation for all chart updating. Animation can be
		         * disabled throughout the chart by setting it to false here. It can
		         * be overridden for each individual API method as a function parameter.
		         * The only animation not affected by this option is the initial series
		         * animation, see [plotOptions.series.animation](
		         * #plotOptions.series.animation).
		         *
		         * The animation can either be set as a boolean or a configuration
		         * object. If `true`, it will use the 'swing' jQuery easing and a
		         * duration of 500 ms. If used as a configuration object, the following
		         * properties are supported:
		         *
		         * <dl>
		         *
		         * <dt>duration</dt>
		         *
		         * <dd>The duration of the animation in milliseconds.</dd>
		         *
		         * <dt>easing</dt>
		         *
		         * <dd>A string reference to an easing function set on the `Math`
		         * object. See [the easing demo](
		         * http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/plotoptions/series-animation-easing/).
		         * </dd>
		         *
		         * </dl>
		         *
		         * @type {Boolean|Object}
		         * @sample {highcharts} highcharts/chart/animation-none/
		         *         Updating with no animation
		         * @sample {highcharts} highcharts/chart/animation-duration/
		         *         With a longer duration
		         * @sample {highcharts} highcharts/chart/animation-easing/
		         *         With a jQuery UI easing
		         * @sample {highmaps} maps/chart/animation-none/
		         *         Updating with no animation
		         * @sample {highmaps} maps/chart/animation-duration/
		         *         With a longer duration
		         * @default true
		         * @apioption chart.animation
		         */

		        /**
		         * A CSS class name to apply to the charts container `div`, allowing
		         * unique CSS styling for each chart.
		         *
		         * @type {String}
		         * @apioption chart.className
		         */

		        /**
		         * Event listeners for the chart.
		         *
		         * @apioption chart.events
		         */

		        /**
		         * Fires when a series is added to the chart after load time, using
		         * the `addSeries` method. One parameter, `event`, is passed to the
		         * function, containing common event information.
		         * Through `event.options` you can access the series options that was
		         * passed to the `addSeries` method. Returning false prevents the series
		         * from being added.
		         *
		         * @type {Function}
		         * @context Chart
		         * @sample {highcharts} highcharts/chart/events-addseries/ Alert on add series
		         * @sample {highstock} stock/chart/events-addseries/ Alert on add series
		         * @since 1.2.0
		         * @apioption chart.events.addSeries
		         */

		        /**
		         * Fires when clicking on the plot background. One parameter, `event`,
		         * is passed to the function, containing common event information.
		         *
		         * Information on the clicked spot can be found through `event.xAxis`
		         * and `event.yAxis`, which are arrays containing the axes of each
		         * dimension and each axis' value at the clicked spot. The primary axes
		         * are `event.xAxis[0]` and `event.yAxis[0]`. Remember the unit of a
		         * datetime axis is milliseconds since 1970-01-01 00:00:00.
		         *
		         * <pre>click: function(e) {
		         *     console.log(
		         *         Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', e.xAxis[0].value),
		         *         e.yAxis[0].value
		         *     )
		         * }</pre>
		         *
		         * @type {Function}
		         * @context Chart
		         * @sample {highcharts} highcharts/chart/events-click/
		         *         Alert coordinates on click
		         * @sample {highcharts} highcharts/chart/events-container/
		         *         Alternatively, attach event to container
		         * @sample {highstock} stock/chart/events-click/
		         *         Alert coordinates on click
		         * @sample {highstock} highcharts/chart/events-container/
		         *         Alternatively, attach event to container
		         * @sample {highmaps} maps/chart/events-click/
		         *         Record coordinates on click
		         * @sample {highmaps} highcharts/chart/events-container/
		         *         Alternatively, attach event to container
		         * @since 1.2.0
		         * @apioption chart.events.click
		         */


		        /**
		         * Fires when the chart is finished loading. Since v4.2.2, it also waits
		         * for images to be loaded, for example from point markers. One
		         * parameter, `event`, is passed to the function, containing common
		         * event information.
		         *
		         * There is also a second parameter to the chart constructor where a
		         * callback function can be passed to be executed on chart.load.
		         *
		         * @type {Function}
		         * @context Chart
		         * @sample {highcharts} highcharts/chart/events-load/
		         *         Alert on chart load
		         * @sample {highstock} stock/chart/events-load/
		         *         Alert on chart load
		         * @sample {highmaps} maps/chart/events-load/
		         *         Add series on chart load
		         * @apioption chart.events.load
		         */

		        /**
		         * Fires when the chart is redrawn, either after a call to
		         * `chart.redraw()` or after an axis, series or point is modified with
		         * the `redraw` option set to true. One parameter, `event`, is passed to
		         * the function, containing common event information.
		         *
		         * @type {Function}
		         * @context Chart
		         * @sample {highcharts} highcharts/chart/events-redraw/
		         *         Alert on chart redraw
		         * @sample {highstock} stock/chart/events-redraw/
		         *         Alert on chart redraw when adding a series or moving the
		         *         zoomed range
		         * @sample {highmaps} maps/chart/events-redraw/
		         *         Set subtitle on chart redraw
		         * @since 1.2.0
		         * @apioption chart.events.redraw
		         */

		        /**
		         * Fires after initial load of the chart (directly after the `load`
		         * event), and after each redraw (directly after the `redraw` event).
		         *
		         * @type {Function}
		         * @context Chart
		         * @since 5.0.7
		         * @apioption chart.events.render
		         */

		        /**
		         * Fires when an area of the chart has been selected. Selection is
		         * enabled by setting the chart's zoomType. One parameter, `event`, is
		         * passed to the function, containing common event information. The
		         * default action for the selection event is to zoom the chart to the
		         * selected area. It can be prevented by calling
		         * `event.preventDefault()`.
		         *
		         * Information on the selected area can be found through `event.xAxis`
		         * and `event.yAxis`, which are arrays containing the axes of each
		         * dimension and each axis' min and max values. The primary axes are
		         * `event.xAxis[0]` and `event.yAxis[0]`. Remember the unit of a
		         * datetime axis is milliseconds since 1970-01-01 00:00:00.
		         *
		         * <pre>selection: function(event) {
		         *     // log the min and max of the primary, datetime x-axis
		         *     console.log(
		         *         Highcharts.dateFormat(
		         *             '%Y-%m-%d %H:%M:%S',
		         *             event.xAxis[0].min
		         *         ),
		         *         Highcharts.dateFormat(
		         *             '%Y-%m-%d %H:%M:%S',
		         *             event.xAxis[0].max
		         *         )
		         *     );
		         *     // log the min and max of the y axis
		         *     console.log(event.yAxis[0].min, event.yAxis[0].max);
		         * }</pre>
		         *
		         * @type {Function}
		         * @sample {highcharts} highcharts/chart/events-selection/
		         *         Report on selection and reset
		         * @sample {highcharts} highcharts/chart/events-selection-points/
		         *         Select a range of points through a drag selection
		         * @sample {highstock} stock/chart/events-selection/
		         *         Report on selection and reset
		         * @sample {highstock} highcharts/chart/events-selection-points/
		         *         Select a range of points through a drag selection
		         *         (Highcharts)
		         * @apioption chart.events.selection
		         */

		        /**
		         * The margin between the outer edge of the chart and the plot area.
		         * The numbers in the array designate top, right, bottom and left
		         * respectively. Use the options `marginTop`, `marginRight`,
		         * `marginBottom` and `marginLeft` for shorthand setting of one option.
		         *
		         * By default there is no margin. The actual space is dynamically
		         * calculated from the offset of axis labels, axis title, title,
		         * subtitle and legend in addition to the `spacingTop`, `spacingRight`,
		         * `spacingBottom` and `spacingLeft` options.
		         *
		         * @type {Array}
		         * @sample {highcharts} highcharts/chart/margins-zero/
		         *         Zero margins
		         * @sample {highstock} stock/chart/margin-zero/
		         *         Zero margins
		         *
		         * @defaults {all} null
		         * @apioption chart.margin
		         */

		        /**
		         * The margin between the bottom outer edge of the chart and the plot
		         * area. Use this to set a fixed pixel value for the margin as opposed
		         * to the default dynamic margin. See also `spacingBottom`.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/marginbottom/
		         *         100px bottom margin
		         * @sample {highstock} stock/chart/marginbottom/
		         *         100px bottom margin
		         * @sample {highmaps} maps/chart/margin/
		         *         100px margins
		         * @since 2.0
		         * @apioption chart.marginBottom
		         */

		        /**
		         * The margin between the left outer edge of the chart and the plot
		         * area. Use this to set a fixed pixel value for the margin as opposed
		         * to the default dynamic margin. See also `spacingLeft`.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/marginleft/
		         *         150px left margin
		         * @sample {highstock} stock/chart/marginleft/
		         *         150px left margin
		         * @sample {highmaps} maps/chart/margin/
		         *         100px margins
		         * @default null
		         * @since 2.0
		         * @apioption chart.marginLeft
		         */

		        /**
		         * The margin between the right outer edge of the chart and the plot
		         * area. Use this to set a fixed pixel value for the margin as opposed
		         * to the default dynamic margin. See also `spacingRight`.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/marginright/
		         *         100px right margin
		         * @sample {highstock} stock/chart/marginright/
		         *         100px right margin
		         * @sample {highmaps} maps/chart/margin/
		         *         100px margins
		         * @default null
		         * @since 2.0
		         * @apioption chart.marginRight
		         */

		        /**
		         * The margin between the top outer edge of the chart and the plot area.
		         * Use this to set a fixed pixel value for the margin as opposed to
		         * the default dynamic margin. See also `spacingTop`.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/margintop/ 100px top margin
		         * @sample {highstock} stock/chart/margintop/
		         *         100px top margin
		         * @sample {highmaps} maps/chart/margin/
		         *         100px margins
		         * @default null
		         * @since 2.0
		         * @apioption chart.marginTop
		         */

		        /**
		         * Allows setting a key to switch between zooming and panning. Can be
		         * one of `alt`, `ctrl`, `meta` (the command key on Mac and Windows
		         * key on Windows) or `shift`. The keys are mapped directly to the key
		         * properties of the click event argument (`event.altKey`,
		         * `event.ctrlKey`, `event.metaKey` and `event.shiftKey`).
		         *
		         * @validvalue [null, "alt", "ctrl", "meta", "shift"]
		         * @type {String}
		         * @since 4.0.3
		         * @product highcharts
		         * @apioption chart.panKey
		         */

		        /**
		         * Allow panning in a chart. Best used with [panKey](#chart.panKey)
		         * to combine zooming and panning.
		         *
		         * On touch devices, when the [tooltip.followTouchMove](
		         * #tooltip.followTouchMove) option is `true` (default), panning
		         * requires two fingers. To allow panning with one finger, set
		         * `followTouchMove` to `false`.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/chart/pankey/ Zooming and panning
		         * @default {highcharts} false
		         * @default {highstock} true
		         * @since 4.0.3
		         * @product highcharts highstock
		         * @apioption chart.panning
		         */


		        /**
		         * Equivalent to [zoomType](#chart.zoomType), but for multitouch
		         * gestures only. By default, the `pinchType` is the same as the
		         * `zoomType` setting. However, pinching can be enabled separately in
		         * some cases, for example in stock charts where a mouse drag pans the
		         * chart, while pinching is enabled. When [tooltip.followTouchMove](
		         * #tooltip.followTouchMove) is true, pinchType only applies to
		         * two-finger touches.
		         *
		         * @validvalue [null, "x", "y", "xy"]
		         * @type {String}
		         * @default {highcharts} null
		         * @default {highstock} x
		         * @since 3.0
		         * @product highcharts highstock
		         * @apioption chart.pinchType
		         */

		        /**
		         * The corner radius of the outer chart border.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/borderradius/ 20px radius
		         * @sample {highstock} stock/chart/border/ 10px radius
		         * @sample {highmaps} maps/chart/border/ Border options
		         * @default 0
		         */
		        borderRadius: 0,
        

		        /**
		         * In styled mode, this sets how many colors the class names
		         * should rotate between. With ten colors, series (or points) are
		         * given class names like `highcharts-color-0`, `highcharts-color-0`
		         * [...] `highcharts-color-9`. The equivalent in non-styled mode
		         * is to set colors using the [colors](#colors) setting.
		         *
		         * @type {Number}
		         * @default 10
		         * @since 5.0.0
		         */
		        colorCount: 10,
        

		        /**
		         * Alias of `type`.
		         *
		         * @validvalue ["line", "spline", "column", "area", "areaspline", "pie"]
		         * @type {String}
		         * @deprecated
		         * @sample {highcharts} highcharts/chart/defaultseriestype/ Bar
		         * @default line
		         * @product highcharts
		         */
		        defaultSeriesType: 'line',

		        /**
		         * If true, the axes will scale to the remaining visible series once
		         * one series is hidden. If false, hiding and showing a series will
		         * not affect the axes or the other series. For stacks, once one series
		         * within the stack is hidden, the rest of the stack will close in
		         * around it even if the axis is not affected.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/chart/ignorehiddenseries-true/
		         *         True by default
		         * @sample {highcharts} highcharts/chart/ignorehiddenseries-false/
		         *         False
		         * @sample {highcharts} highcharts/chart/ignorehiddenseries-true-stacked/
		         *         True with stack
		         * @sample {highstock} stock/chart/ignorehiddenseries-true/
		         *         True by default
		         * @sample {highstock} stock/chart/ignorehiddenseries-false/
		         *         False
		         * @default true
		         * @since 1.2.0
		         * @product highcharts highstock
		         */
		        ignoreHiddenSeries: true,


		        /**
		         * Whether to invert the axes so that the x axis is vertical and y axis
		         * is horizontal. When `true`, the x axis is [reversed](#xAxis.reversed)
		         * by default.
		         *
		         * @productdesc {highcharts}
		         * If a bar series is present in the chart, it will be inverted
		         * automatically. Inverting the chart doesn't have an effect if there
		         * are no cartesian series in the chart, or if the chart is
		         * [polar](#chart.polar).
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/chart/inverted/
		         *         Inverted line
		         * @sample {highstock} stock/navigator/inverted/
		         *         Inverted stock chart
		         * @default false
		         * @product highcharts highstock
		         * @apioption chart.inverted
		         */

		        /**
		         * The distance between the outer edge of the chart and the content,
		         * like title or legend, or axis title and labels if present. The
		         * numbers in the array designate top, right, bottom and left
		         * respectively. Use the options spacingTop, spacingRight, spacingBottom
		         * and spacingLeft options for shorthand setting of one option.
		         *
		         * @type {Array<Number>}
		         * @see [chart.margin](#chart.margin)
		         * @default [10, 10, 15, 10]
		         * @since 3.0.6
		         */
		        spacing: [10, 10, 15, 10],

		        /**
		         * The button that appears after a selection zoom, allowing the user
		         * to reset zoom.
		         *
		         */
		        resetZoomButton: {

		            /**
		             * What frame the button should be placed related to. Can be either
		             * `plot` or `chart`
		             *
		             * @validvalue ["plot", "chart"]
		             * @type {String}
		             * @sample {highcharts} highcharts/chart/resetzoombutton-relativeto/
		             *         Relative to the chart
		             * @sample {highstock} highcharts/chart/resetzoombutton-relativeto/
		             *         Relative to the chart
		             * @default plot
		             * @since 2.2
		             * @apioption chart.resetZoomButton.relativeTo
		             */

		            /**
		             * A collection of attributes for the button. The object takes SVG
		             * attributes like `fill`, `stroke`, `stroke-width` or `r`, the
		             * border radius. The theme also supports `style`, a collection of
		             * CSS properties for the text. Equivalent attributes for the hover
		             * state are given in `theme.states.hover`.
		             *
		             * @type {Object}
		             * @sample {highcharts} highcharts/chart/resetzoombutton-theme/
		             *         Theming the button
		             * @sample {highstock} highcharts/chart/resetzoombutton-theme/
		             *         Theming the button
		             * @since 2.2
		             */
		            theme: {

		                /**
		                 * The Z index for the reset zoom button. The default value
		                 * places it below the tooltip that has Z index 7.
		                 */
		                zIndex: 6
		            },

		            /**
		             * The position of the button.
		             *
		             * @type {Object}
		             * @sample {highcharts} highcharts/chart/resetzoombutton-position/
		             *         Above the plot area
		             * @sample {highstock} highcharts/chart/resetzoombutton-position/
		             *         Above the plot area
		             * @sample {highmaps} highcharts/chart/resetzoombutton-position/
		             *         Above the plot area
		             * @since 2.2
		             */
		            position: {

		                /**
		                 * The horizontal alignment of the button.
		                 *
		                 * @type {String}
		                 */
		                align: 'right',

		                /**
		                 * The horizontal offset of the button.
		                 *
		                 * @type {Number}
		                 */
		                x: -10,

		                /**
		                 * The vertical alignment of the button.
		                 *
		                 * @validvalue ["top", "middle", "bottom"]
		                 * @type {String}
		                 * @default top
		                 * @apioption chart.resetZoomButton.position.verticalAlign
		                 */

		                /**
		                 * The vertical offset of the button.
		                 *
		                 * @type {Number}
		                 */
		                y: 10
		            }
		        },

		        /**
		         * The pixel width of the plot area border.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/plotborderwidth/ 1px border
		         * @sample {highstock} stock/chart/plotborder/
		         *         2px border
		         * @sample {highmaps} maps/chart/plotborder/
		         *         Plot border options
		         * @default 0
		         * @apioption chart.plotBorderWidth
		         */

		        /**
		         * Whether to apply a drop shadow to the plot area. Requires that
		         * plotBackgroundColor be set. The shadow can be an object configuration
		         * containing `color`, `offsetX`, `offsetY`, `opacity` and `width`.
		         *
		         * @type {Boolean|Object}
		         * @sample {highcharts} highcharts/chart/plotshadow/ Plot shadow
		         * @sample {highstock} stock/chart/plotshadow/
		         *         Plot shadow
		         * @sample {highmaps} maps/chart/plotborder/
		         *         Plot border options
		         * @default false
		         * @apioption chart.plotShadow
		         */

		        /**
		         * When true, cartesian charts like line, spline, area and column are
		         * transformed into the polar coordinate system. Requires
		         * `highcharts-more.js`.
		         *
		         * @sample {highcharts} highcharts/demo/polar/
		         *         Polar chart
		         * @sample {highcharts} highcharts/demo/polar-wind-rose/
		         *         Wind rose, stacked polar column chart
		         * @sample {highcharts} highcharts/demo/polar-spider/
		         *         Spider web chart
		         * @sample {highcharts} highcharts/parallel-coordinates/polar/
		         *         Star plot, multivariate data in a polar chart
		         *
		         * @type {Boolean}
		         * @default false
		         * @since 2.3.0
		         * @product highcharts
		         * @apioption chart.polar
		         */

		        /**
		         * Whether to reflow the chart to fit the width of the container div
		         * on resizing the window.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/chart/reflow-true/ True by default
		         * @sample {highcharts} highcharts/chart/reflow-false/ False
		         * @sample {highstock} stock/chart/reflow-true/
		         *         True by default
		         * @sample {highstock} stock/chart/reflow-false/
		         *         False
		         * @sample {highmaps} maps/chart/reflow-true/
		         *         True by default
		         * @sample {highmaps} maps/chart/reflow-false/
		         *         False
		         * @default true
		         * @since 2.1
		         * @apioption chart.reflow
		         */

		        /**
		         * The HTML element where the chart will be rendered. If it is a string,
		         * the element by that id is used. The HTML element can also be passed
		         * by direct reference, or as the first argument of the chart
		         * constructor, in which case the option is not needed.
		         *
		         * @type {String|Object}
		         * @sample {highcharts} highcharts/chart/reflow-true/
		         *         String
		         * @sample {highcharts} highcharts/chart/renderto-object/
		         *         Object reference
		         * @sample {highcharts} highcharts/chart/renderto-jquery/
		         *         Object reference through jQuery
		         * @sample {highstock} stock/chart/renderto-string/
		         *         String
		         * @sample {highstock} stock/chart/renderto-object/
		         *         Object reference
		         * @sample {highstock} stock/chart/renderto-jquery/
		         *         Object reference through jQuery
		         * @apioption chart.renderTo
		         */

		        /**
		         * The background color of the marker square when selecting (zooming
		         * in on) an area of the chart.
		         *
		         * @type {Color}
		         * @see In styled mode, the selection marker fill is set with the
		         * `.highcharts-selection-marker` class.
		         * @default rgba(51,92,173,0.25)
		         * @since 2.1.7
		         * @apioption chart.selectionMarkerFill
		         */

		        /**
		         * Whether to apply a drop shadow to the outer chart area. Requires
		         * that backgroundColor be set. The shadow can be an object
		         * configuration containing `color`, `offsetX`, `offsetY`, `opacity` and
		         * `width`.
		         *
		         * @type {Boolean|Object}
		         * @sample {highcharts} highcharts/chart/shadow/ Shadow
		         * @sample {highstock} stock/chart/shadow/
		         *         Shadow
		         * @sample {highmaps} maps/chart/border/
		         *         Chart border and shadow
		         * @default false
		         * @apioption chart.shadow
		         */

		        /**
		         * Whether to show the axes initially. This only applies to empty charts
		         * where series are added dynamically, as axes are automatically added
		         * to cartesian series.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/chart/showaxes-false/ False by default
		         * @sample {highcharts} highcharts/chart/showaxes-true/ True
		         * @since 1.2.5
		         * @product highcharts
		         * @apioption chart.showAxes
		         */

		        /**
		         * The space between the bottom edge of the chart and the content (plot
		         * area, axis title and labels, title, subtitle or legend in top
		         * position).
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/spacingbottom/
		         *         Spacing bottom set to 100
		         * @sample {highstock} stock/chart/spacingbottom/
		         *         Spacing bottom set to 100
		         * @sample {highmaps} maps/chart/spacing/
		         *         Spacing 100 all around
		         * @default 15
		         * @since 2.1
		         * @apioption chart.spacingBottom
		         */

		        /**
		         * The space between the left edge of the chart and the content (plot
		         * area, axis title and labels, title, subtitle or legend in top
		         * position).
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/spacingleft/
		         *         Spacing left set to 100
		         * @sample {highstock} stock/chart/spacingleft/
		         *         Spacing left set to 100
		         * @sample {highmaps} maps/chart/spacing/
		         *         Spacing 100 all around
		         * @default 10
		         * @since 2.1
		         * @apioption chart.spacingLeft
		         */

		        /**
		         * The space between the right edge of the chart and the content (plot
		         * area, axis title and labels, title, subtitle or legend in top
		         * position).
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/spacingright-100/
		         *         Spacing set to 100
		         * @sample {highcharts} highcharts/chart/spacingright-legend/
		         *         Legend in right position with default spacing
		         * @sample {highstock} stock/chart/spacingright/
		         *         Spacing set to 100
		         * @sample {highmaps} maps/chart/spacing/
		         *         Spacing 100 all around
		         * @default 10
		         * @since 2.1
		         * @apioption chart.spacingRight
		         */

		        /**
		         * The space between the top edge of the chart and the content (plot
		         * area, axis title and labels, title, subtitle or legend in top
		         * position).
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/spacingtop-100/
		         *         A top spacing of 100
		         * @sample {highcharts} highcharts/chart/spacingtop-10/
		         *         Floating chart title makes the plot area align to the default
		         *         spacingTop of 10.
		         * @sample {highstock} stock/chart/spacingtop/
		         *         A top spacing of 100
		         * @sample {highmaps} maps/chart/spacing/
		         *         Spacing 100 all around
		         * @default 10
		         * @since 2.1
		         * @apioption chart.spacingTop
		         */

		        /**
		         * Additional CSS styles to apply inline to the container `div`. Note
		         * that since the default font styles are applied in the renderer, it
		         * is ignorant of the individual chart options and must be set globally.
		         *
		         * @type {CSSObject}
		         * @see    In styled mode, general chart styles can be set with the
		         *         `.highcharts-root` class.
		         * @sample {highcharts} highcharts/chart/style-serif-font/
		         *         Using a serif type font
		         * @sample {highcharts} highcharts/css/em/
		         *         Styled mode with relative font sizes
		         * @sample {highstock} stock/chart/style/
		         *         Using a serif type font
		         * @sample {highmaps} maps/chart/style-serif-font/
		         *         Using a serif type font
		         * @default {"fontFamily":"\"Lucida Grande\", \"Lucida Sans Unicode\", Verdana, Arial, Helvetica, sans-serif","fontSize":"12px"}
		         * @apioption chart.style
		         */

		        /**
		         * The default series type for the chart. Can be any of the chart types
		         * listed under [plotOptions](#plotOptions).
		         *
		         * @validvalue ["line", "spline", "column", "bar", "area", "areaspline", "pie", "arearange", "areasplinerange", "boxplot", "bubble", "columnrange", "errorbar", "funnel", "gauge", "heatmap", "polygon", "pyramid", "scatter", "solidgauge", "treemap", "waterfall"]
		         * @type {String}
		         * @sample {highcharts} highcharts/chart/type-bar/ Bar
		         * @sample {highstock} stock/chart/type/
		         *         Areaspline
		         * @sample {highmaps} maps/chart/type-mapline/
		         *         Mapline
		         * @default {highcharts} line
		         * @default {highstock} line
		         * @default {highmaps} map
		         * @since 2.1.0
		         * @apioption chart.type
		         */

		        /**
		         * Decides in what dimensions the user can zoom by dragging the mouse.
		         * Can be one of `x`, `y` or `xy`.
		         *
		         * @validvalue [null, "x", "y", "xy"]
		         * @type {String}
		         * @see [panKey](#chart.panKey)
		         * @default  null
		         * @sample {highcharts} highcharts/chart/zoomtype-none/ None by default
		         * @sample {highcharts} highcharts/chart/zoomtype-x/ X
		         * @sample {highcharts} highcharts/chart/zoomtype-y/ Y
		         * @sample {highcharts} highcharts/chart/zoomtype-xy/ Xy
		         * @sample {highstock} stock/demo/basic-line/ None by default
		         * @sample {highstock} stock/chart/zoomtype-x/ X
		         * @sample {highstock} stock/chart/zoomtype-y/ Y
		         * @sample {highstock} stock/chart/zoomtype-xy/ Xy
		         * @product highcharts highstock
		         * @apioption chart.zoomType
		         */

		        /**
		         * An explicit width for the chart. By default (when `null`) the width
		         * is calculated from the offset width of the containing element.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/chart/width/ 800px wide
		         * @sample {highstock} stock/chart/width/ 800px wide
		         * @sample {highmaps} maps/chart/size/ Chart with explicit size
		         * @default null
		         */
		        width: null,

		        /**
		         * An explicit height for the chart. If a _number_, the height is
		         * given in pixels. If given a _percentage string_ (for example
		         * `'56%'`), the height is given as the percentage of the actual chart
		         * width. This allows for preserving the aspect ratio across responsive
		         * sizes.
		         *
		         * By default (when `null`) the height is calculated from the offset
		         * height of the containing element, or 400 pixels if the containing
		         * element's height is 0.
		         *
		         * @type {Number|String}
		         * @sample {highcharts} highcharts/chart/height/
		         *         500px height
		         * @sample {highstock} stock/chart/height/
		         *         300px height
		         * @sample {highmaps} maps/chart/size/
		         *         Chart with explicit size
		         * @sample highcharts/chart/height-percent/
		         *         Highcharts with percentage height
		         * @default null
		         */
		        height: null

        

		    },

		    /**
		     * The chart's main title.
		     *
		     * @sample {highmaps} maps/title/title/ Title options demonstrated
		     */
		    title: {

		        /**
		         * When the title is floating, the plot area will not move to make space
		         * for it.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/chart/zoomtype-none/ False by default
		         * @sample {highcharts} highcharts/title/floating/
		         *         True - title on top of the plot area
		         * @sample {highstock} stock/chart/title-floating/
		         *         True - title on top of the plot area
		         * @default false
		         * @since 2.1
		         * @apioption title.floating
		         */

		        /**
		         * CSS styles for the title. Use this for font styling, but use `align`,
		         * `x` and `y` for text alignment.
		         *
		         * In styled mode, the title style is given in the `.highcharts-title`
		         * class.
		         *
		         * @type {CSSObject}
		         * @sample {highcharts} highcharts/title/style/ Custom color and weight
		         * @sample {highstock} stock/chart/title-style/ Custom color and weight
		         * @sample highcharts/css/titles/ Styled mode
		         * @default {highcharts|highmaps} { "color": "#333333", "fontSize": "18px" }
		         * @default {highstock} { "color": "#333333", "fontSize": "16px" }
		         * @apioption title.style
		         */

		        /**
		         * Whether to [use HTML](http://www.highcharts.com/docs/chart-concepts/labels-
		         * and-string-formatting#html) to render the text.
		         *
		         * @type {Boolean}
		         * @default false
		         * @apioption title.useHTML
		         */

		        /**
		         * The vertical alignment of the title. Can be one of `"top"`,
		         * `"middle"` and `"bottom"`. When a value is given, the title behaves
		         * as if [floating](#title.floating) were `true`.
		         *
		         * @validvalue ["top", "middle", "bottom"]
		         * @type {String}
		         * @sample {highcharts} highcharts/title/verticalalign/
		         *         Chart title in bottom right corner
		         * @sample {highstock} stock/chart/title-verticalalign/
		         *         Chart title in bottom right corner
		         * @since 2.1
		         * @apioption title.verticalAlign
		         */

		        /**
		         * The x position of the title relative to the alignment within
		         * `chart.spacingLeft` and `chart.spacingRight`.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/title/align/
		         *         Aligned to the plot area (x = 70px = margin left - spacing
		         *         left)
		         * @sample {highstock} stock/chart/title-align/
		         *         Aligned to the plot area (x = 50px = margin left - spacing
		         *         left)
		         * @default 0
		         * @since 2.0
		         * @apioption title.x
		         */

		        /**
		         * The y position of the title relative to the alignment within
		         * [chart.spacingTop](#chart.spacingTop) and [chart.spacingBottom](
		         * #chart.spacingBottom). By default it depends on the font size.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/title/y/
		         *         Title inside the plot area
		         * @sample {highstock} stock/chart/title-verticalalign/
		         *         Chart title in bottom right corner
		         * @since 2.0
		         * @apioption title.y
		         */

		        /**
		         * The title of the chart. To disable the title, set the `text` to
		         * `null`.
		         *
		         * @type {String}
		         * @sample {highcharts} highcharts/title/text/ Custom title
		         * @sample {highstock} stock/chart/title-text/ Custom title
		         * @default {highcharts|highmaps} Chart title
		         * @default {highstock} null
		         */
		        text: 'Chart title',

		        /**
		         * The horizontal alignment of the title. Can be one of "left", "center"
		         * and "right".
		         *
		         * @validvalue ["left", "center", "right"]
		         * @type {String}
		         * @sample {highcharts} highcharts/title/align/
		         *         Aligned to the plot area (x = 70px = margin left - spacing
		         *         left)
		         * @sample {highstock} stock/chart/title-align/
		         *         Aligned to the plot area (x = 50px = margin left - spacing
		         *         left)
		         * @default center
		         * @since 2.0
		         */
		        align: 'center',

		        /**
		         * The margin between the title and the plot area, or if a subtitle
		         * is present, the margin between the subtitle and the plot area.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/title/margin-50/
		         *         A chart title margin of 50
		         * @sample {highcharts} highcharts/title/margin-subtitle/
		         *         The same margin applied with a subtitle
		         * @sample {highstock} stock/chart/title-margin/
		         *         A chart title margin of 50
		         * @default 15
		         * @since 2.1
		         */
		        margin: 15,

		        /**
		         * Adjustment made to the title width, normally to reserve space for
		         * the exporting burger menu.
		         *
		         * @type {Number}
		         * @sample highcharts/title/widthadjust/
		         *         Wider menu, greater padding
		         * @default -44
		         * @since 4.2.5
		         */
		        widthAdjust: -44

		    },

		    /**
		     * The chart's subtitle. This can be used both to display a subtitle below
		     * the main title, and to display random text anywhere in the chart. The
		     * subtitle can be updated after chart initialization through the
		     * `Chart.setTitle` method.
		     *
		     * @sample {highmaps} maps/title/subtitle/ Subtitle options demonstrated
		     */
		    subtitle: {

		        /**
		         * When the subtitle is floating, the plot area will not move to make
		         * space for it.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/subtitle/floating/
		         *         Floating title and subtitle
		         * @sample {highstock} stock/chart/subtitle-footnote
		         *         Footnote floating at bottom right of plot area
		         * @default false
		         * @since 2.1
		         * @apioption subtitle.floating
		         */

		        /**
		         * CSS styles for the title.
		         *
		         * In styled mode, the subtitle style is given in the
		         * `.highcharts-subtitle` class.
		         *
		         * @type {CSSObject}
		         * @sample {highcharts} highcharts/subtitle/style/
		         *         Custom color and weight
		         * @sample {highcharts} highcharts/css/titles/
		         *         Styled mode
		         * @sample {highstock} stock/chart/subtitle-style
		         *         Custom color and weight
		         * @sample {highstock} highcharts/css/titles/
		         *         Styled mode
		         * @sample {highmaps} highcharts/css/titles/
		         *         Styled mode
		         * @default { "color": "#666666" }
		         * @apioption subtitle.style
		         */

		        /**
		         * Whether to [use HTML](http://www.highcharts.com/docs/chart-concepts/labels-
		         * and-string-formatting#html) to render the text.
		         *
		         * @type {Boolean}
		         * @default false
		         * @apioption subtitle.useHTML
		         */

		        /**
		         * The vertical alignment of the title. Can be one of "top", "middle"
		         * and "bottom". When a value is given, the title behaves as floating.
		         *
		         * @validvalue ["top", "middle", "bottom"]
		         * @type {String}
		         * @sample {highcharts} highcharts/subtitle/verticalalign/
		         *         Footnote at the bottom right of plot area
		         * @sample {highstock} stock/chart/subtitle-footnote
		         *         Footnote at the bottom right of plot area
		         * @default
		         * @since 2.1
		         * @apioption subtitle.verticalAlign
		         */

		        /**
		         * The x position of the subtitle relative to the alignment within
		         * `chart.spacingLeft` and `chart.spacingRight`.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/subtitle/align/
		         *         Footnote at right of plot area
		         * @sample {highstock} stock/chart/subtitle-footnote
		         *         Footnote at the bottom right of plot area
		         * @default 0
		         * @since 2.0
		         * @apioption subtitle.x
		         */

		        /**
		         * The y position of the subtitle relative to the alignment within
		         * `chart.spacingTop` and `chart.spacingBottom`. By default the subtitle
		         * is laid out below the title unless the title is floating.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/subtitle/verticalalign/
		         *         Footnote at the bottom right of plot area
		         * @sample {highstock} stock/chart/subtitle-footnote
		         *         Footnote at the bottom right of plot area
		         * @default {highcharts}  null
		         * @default {highstock}  null
		         * @default {highmaps}
		         * @since 2.0
		         * @apioption subtitle.y
		         */

		        /**
		         * The subtitle of the chart.
		         *
		         * @type {String}
		         * @sample {highcharts|highstock} highcharts/subtitle/text/
		         *         Custom subtitle
		         * @sample {highcharts|highstock} highcharts/subtitle/text-formatted/
		         *         Formatted and linked text.
		         */
		        text: '',

		        /**
		         * The horizontal alignment of the subtitle. Can be one of "left",
		         *  "center" and "right".
		         *
		         * @validvalue ["left", "center", "right"]
		         * @type {String}
		         * @sample {highcharts} highcharts/subtitle/align/
		         *         Footnote at right of plot area
		         * @sample {highstock} stock/chart/subtitle-footnote
		         *         Footnote at bottom right of plot area
		         * @default center
		         * @since 2.0
		         */
		        align: 'center',

		        /**
		         * Adjustment made to the subtitle width, normally to reserve space
		         * for the exporting burger menu.
		         *
		         * @type {Number}
		         * @see [title.widthAdjust](#title.widthAdjust)
		         * @sample highcharts/title/widthadjust/
		         *         Wider menu, greater padding
		         * @default -44
		         * @since 4.2.5
		         */
		        widthAdjust: -44
		    },

		    /**
		     * The plotOptions is a wrapper object for config objects for each series
		     * type. The config objects for each series can also be overridden for
		     * each series item as given in the series array.
		     *
		     * Configuration options for the series are given in three levels. Options
		     * for all series in a chart are given in the [plotOptions.series](
		     * #plotOptions.series) object. Then options for all series of a specific
		     * type are given in the plotOptions of that type, for example
		     * `plotOptions.line`. Next, options for one single series are given in
		     * [the series array](#series).
		     *
		     */
		    plotOptions: {},

		    /**
		     * HTML labels that can be positioned anywhere in the chart area.
		     *
		     */
		    labels: {

		        /**
		         * A HTML label that can be positioned anywhere in the chart area.
		         *
		         * @type {Array<Object>}
		         * @apioption labels.items
		         */

		        /**
		         * Inner HTML or text for the label.
		         *
		         * @type {String}
		         * @apioption labels.items.html
		         */

		        /**
		         * CSS styles for each label. To position the label, use left and top
		         * like this:
		         *
		         * <pre>style: {
		         *     left: '100px',
		         *     top: '100px'
		         * }</pre>
		         *
		         * @type {CSSObject}
		         * @apioption labels.items.style
		         */

		        /**
		         * Shared CSS styles for all labels.
		         *
		         * @type {CSSObject}
		         * @default { "color": "#333333" }
		         */
		        style: {
		            position: 'absolute',
		            color: '#333333'
		        }
		    },

		    /**
		     * The legend is a box containing a symbol and name for each series
		     * item or point item in the chart. Each series (or points in case
		     * of pie charts) is represented by a symbol and its name in the legend.
		     *
		     * It is possible to override the symbol creator function and
		     * create [custom legend symbols](http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/studies/legend-
		     * custom-symbol/).
		     *
		     * @productdesc {highmaps}
		     * A Highmaps legend by default contains one legend item per series, but if
		     * a `colorAxis` is defined, the axis will be displayed in the legend.
		     * Either as a gradient, or as multiple legend items for `dataClasses`.
		     */
		    legend: {

		        /**
		         * The background color of the legend.
		         *
		         * @type {Color}
		         * @see In styled mode, the legend background fill can be applied with
		         * the `.highcharts-legend-box` class.
		         * @sample {highcharts} highcharts/legend/backgroundcolor/
		         *         Yellowish background
		         * @sample {highstock} stock/legend/align/ Various legend options
		         * @sample {highmaps} maps/legend/border-background/
		         *         Border and background options
		         * @apioption legend.backgroundColor
		         */

		        /**
		         * The width of the drawn border around the legend.
		         *
		         * @type {Number}
		         * @see In styled mode, the legend border stroke width can be applied
		         * with the `.highcharts-legend-box` class.
		         * @sample {highcharts} highcharts/legend/borderwidth/ 2px border width
		         * @sample {highstock} stock/legend/align/ Various legend options
		         * @sample {highmaps} maps/legend/border-background/
		         *         Border and background options
		         * @default 0
		         * @apioption legend.borderWidth
		         */

		        /**
		         * Enable or disable the legend.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/legend/enabled-false/ Legend disabled
		         * @sample {highstock} stock/legend/align/ Various legend options
		         * @sample {highmaps} maps/legend/enabled-false/ Legend disabled
		         * @default {highstock} false
		         * @default {highmaps} true
		         */
		        enabled: true,

		        /**
		         * The horizontal alignment of the legend box within the chart area.
		         * Valid values are `left`, `center` and `right`.
		         *
		         * In the case that the legend is aligned in a corner position, the
		         * `layout` option will determine whether to place it above/below
		         * or on the side of the plot area.
		         *
		         * @validvalue ["left", "center", "right"]
		         * @type {String}
		         * @sample {highcharts} highcharts/legend/align/
		         *         Legend at the right of the chart
		         * @sample {highstock} stock/legend/align/
		         *         Various legend options
		         * @sample {highmaps} maps/legend/alignment/
		         *         Legend alignment
		         * @since 2.0
		         */
		        align: 'center',

		        /**
		         * If the [layout](legend.layout) is `horizontal` and the legend items
		         * span over two lines or more, whether to align the items into vertical
		         * columns. Setting this to `false` makes room for more items, but will
		         * look more messy.
		         *
		         * @since 6.1.0
		         */
		        alignColumns: true,

		        /**
		         * When the legend is floating, the plot area ignores it and is allowed
		         * to be placed below it.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/legend/floating-false/ False by default
		         * @sample {highcharts} highcharts/legend/floating-true/ True
		         * @sample {highmaps} maps/legend/alignment/ Floating legend
		         * @default false
		         * @since 2.1
		         * @apioption legend.floating
		         */

		        /**
		         * The layout of the legend items. Can be one of "horizontal" or
		         * "vertical".
		         *
		         * @validvalue ["horizontal", "vertical"]
		         * @type {String}
		         * @sample {highcharts} highcharts/legend/layout-horizontal/
		         *         Horizontal by default
		         * @sample {highcharts} highcharts/legend/layout-vertical/
		         *         Vertical
		         * @sample {highstock} stock/legend/layout-horizontal/
		         *         Horizontal by default
		         * @sample {highmaps} maps/legend/padding-itemmargin/
		         *         Vertical with data classes
		         * @sample {highmaps} maps/legend/layout-vertical/
		         *         Vertical with color axis gradient
		         * @default horizontal
		         */
		        layout: 'horizontal',

		        /**
		         * In a legend with horizontal layout, the itemDistance defines the
		         * pixel distance between each item.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/layout-horizontal/ 50px item distance
		         * @sample {highstock} highcharts/legend/layout-horizontal/ 50px item distance
		         * @default {highcharts} 20
		         * @default {highstock} 20
		         * @default {highmaps} 8
		         * @since 3.0.3
		         * @apioption legend.itemDistance
		         */

		        /**
		         * The pixel bottom margin for each legend item.
		         *
		         * @type {Number}
		         * @sample {highcharts|highstock} highcharts/legend/padding-itemmargin/
		         *         Padding and item margins demonstrated
		         * @sample {highmaps} maps/legend/padding-itemmargin/
		         *         Padding and item margins demonstrated
		         * @default 0
		         * @since 2.2.0
		         * @apioption legend.itemMarginBottom
		         */

		        /**
		         * The pixel top margin for each legend item.
		         *
		         * @type {Number}
		         * @sample {highcharts|highstock} highcharts/legend/padding-itemmargin/
		         *         Padding and item margins demonstrated
		         * @sample {highmaps} maps/legend/padding-itemmargin/
		         *         Padding and item margins demonstrated
		         * @default 0
		         * @since 2.2.0
		         * @apioption legend.itemMarginTop
		         */

		        /**
		         * The width for each legend item. By default the items are laid out
		         * successively. In a [horizontal layout](legend.layout), if the items
		         * are laid out across two rows or more, they will be vertically aligned
		         * depending on the [legend.alignColumns](legend.alignColumns) option.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/itemwidth-default/
		         *         Null by default
		         * @sample {highcharts} highcharts/legend/itemwidth-80/
		         *         80 for aligned legend items
		         * @default null
		         * @since 2.0
		         * @apioption legend.itemWidth
		         */

		        /**
		         * A [format string](
		         * https://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting)
		         * for each legend label. Available variables relates to properties on
		         * the series, or the point in case of pies.
		         *
		         * @type {String}
		         * @default {name}
		         * @since 1.3
		         * @apioption legend.labelFormat
		         */

		        /**
		         * Callback function to format each of the series' labels. The `this`
		         * keyword refers to the series object, or the point object in case
		         * of pie charts. By default the series or point name is printed.
		         *
		         * @productdesc {highmaps}
		         *              In Highmaps the context can also be a data class in case
		         *              of a `colorAxis`.
		         *
		         * @type    {Function}
		         * @sample  {highcharts} highcharts/legend/labelformatter/ Add text
		         * @sample  {highmaps} maps/legend/labelformatter/
		         *          Data classes with label formatter
		         * @context {Series|Point}
		         */
		        labelFormatter: function () {
		            return this.name;
		        },

		        /**
		         * Line height for the legend items. Deprecated as of 2.1\. Instead,
		         * the line height for each item can be set using itemStyle.lineHeight,
		         * and the padding between items using `itemMarginTop` and
		         * `itemMarginBottom`.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/lineheight/ Setting padding
		         * @default 16
		         * @since 2.0
		         * @product highcharts
		         * @apioption legend.lineHeight
		         */

		        /**
		         * If the plot area sized is calculated automatically and the legend
		         * is not floating, the legend margin is the space between the legend
		         * and the axis labels or plot area.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/margin-default/
		         *         12 pixels by default
		         * @sample {highcharts} highcharts/legend/margin-30/ 30 pixels
		         * @default 12
		         * @since 2.1
		         * @apioption legend.margin
		         */

		        /**
		         * Maximum pixel height for the legend. When the maximum height is
		         * extended, navigation will show.
		         *
		         * @type {Number}
		         * @default undefined
		         * @since 2.3.0
		         * @apioption legend.maxHeight
		         */

		        /**
		         * The color of the drawn border around the legend.
		         *
		         * @type {Color}
		         * @see In styled mode, the legend border stroke can be applied with
		         * the `.highcharts-legend-box` class.
		         * @sample {highcharts} highcharts/legend/bordercolor/ Brown border
		         * @sample {highstock} stock/legend/align/ Various legend options
		         * @sample {highmaps} maps/legend/border-background/
		         *         Border and background options
		         * @default #999999
		         */
		        borderColor: '#999999',

		        /**
		         * The border corner radius of the legend.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/borderradius-default/ Square by default
		         * @sample {highcharts} highcharts/legend/borderradius-round/ 5px rounded
		         * @sample {highmaps} maps/legend/border-background/
		         *         Border and background options
		         * @default 0
		         */
		        borderRadius: 0,

		        /**
		         * Options for the paging or navigation appearing when the legend
		         * is overflown. Navigation works well on screen, but not in static
		         * exported images. One way of working around that is to [increase
		         * the chart height in export](http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/legend/navigation-
		         * enabled-false/).
		         *
		         */
		        navigation: {

		            /**
		             * How to animate the pages when navigating up or down. A value of
		             * `true` applies the default navigation given in the
		             * `chart.animation` option. Additional options can be given as an
		             * object containing values for easing and duration.
		             *
		             * @type {Boolean|Object}
		             * @sample {highcharts} highcharts/legend/navigation/
		             *         Legend page navigation demonstrated
		             * @sample {highstock} highcharts/legend/navigation/
		             *         Legend page navigation demonstrated
		             * @default true
		             * @since 2.2.4
		             * @apioption legend.navigation.animation
		             */

		            /**
		             * The pixel size of the up and down arrows in the legend paging
		             * navigation.
		             *
		             * @type {Number}
		             * @sample {highcharts} highcharts/legend/navigation/
		             *         Legend page navigation demonstrated
		             * @sample {highstock} highcharts/legend/navigation/
		             *         Legend page navigation demonstrated
		             * @default 12
		             * @since 2.2.4
		             * @apioption legend.navigation.arrowSize
		             */

		            /**
		             * Whether to enable the legend navigation. In most cases, disabling
		             * the navigation results in an unwanted overflow.
		             *
		             * See also the [adapt chart to legend](
		             * https://www.highcharts.com/plugin-registry/single/8/Adapt-Chart-To-Legend)
		             * plugin for a solution to extend the chart height to make room for
		             * the legend, optionally in exported charts only.
		             *
		             * @type {Boolean}
		             * @default true
		             * @since 4.2.4
		             * @apioption legend.navigation.enabled
		             */

		            /**
		             * Text styles for the legend page navigation.
		             *
		             * @type {CSSObject}
		             * @see In styled mode, the navigation items are styled with the
		             * `.highcharts-legend-navigation` class.
		             * @sample {highcharts} highcharts/legend/navigation/
		             *         Legend page navigation demonstrated
		             * @sample {highstock} highcharts/legend/navigation/
		             *         Legend page navigation demonstrated
		             * @since 2.2.4
		             * @apioption legend.navigation.style
		             */

            
		        },

		        /**
		         * The inner padding of the legend box.
		         *
		         * @type {Number}
		         * @sample {highcharts|highstock} highcharts/legend/padding-itemmargin/
		         *         Padding and item margins demonstrated
		         * @sample {highmaps} maps/legend/padding-itemmargin/
		         *         Padding and item margins demonstrated
		         * @default 8
		         * @since 2.2.0
		         * @apioption legend.padding
		         */

		        /**
		         * Whether to reverse the order of the legend items compared to the
		         * order of the series or points as defined in the configuration object.
		         *
		         * @type {Boolean}
		         * @see [yAxis.reversedStacks](#yAxis.reversedStacks),
		         *      [series.legendIndex](#series.legendIndex)
		         * @sample {highcharts} highcharts/legend/reversed/
		         *         Stacked bar with reversed legend
		         * @default false
		         * @since 1.2.5
		         * @apioption legend.reversed
		         */

		        /**
		         * Whether to show the symbol on the right side of the text rather than
		         * the left side. This is common in Arabic and Hebraic.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/legend/rtl/ Symbol to the right
		         * @default false
		         * @since 2.2
		         * @apioption legend.rtl
		         */

		        /**
		         * CSS styles for the legend area. In the 1.x versions the position
		         * of the legend area was determined by CSS. In 2.x, the position is
		         * determined by properties like `align`, `verticalAlign`, `x` and `y`,
		         *  but the styles are still parsed for backwards compatibility.
		         *
		         * @type {CSSObject}
		         * @deprecated
		         * @product highcharts highstock
		         * @apioption legend.style
		         */

        

		        /**
		         * Default styling for the checkbox next to a legend item when
		         * `showCheckbox` is true.
		         */
		        itemCheckboxStyle: {
		            position: 'absolute',
		            width: '13px', // for IE precision
		            height: '13px'
		        },
		        // itemWidth: undefined,

		        /**
		         * When this is true, the legend symbol width will be the same as
		         * the symbol height, which in turn defaults to the font size of the
		         * legend items.
		         *
		         * @type {Boolean}
		         * @default true
		         * @since 5.0.0
		         */
		        squareSymbol: true,

		        /**
		         * The pixel height of the symbol for series types that use a rectangle
		         * in the legend. Defaults to the font size of legend items.
		         *
		         * @productdesc {highmaps}
		         * In Highmaps, when the symbol is the gradient of a vertical color
		         * axis, the height defaults to 200.
		         *
		         * @type {Number}
		         * @sample {highmaps} maps/legend/layout-vertical-sized/
		         *         Sized vertical gradient
		         * @sample {highmaps} maps/legend/padding-itemmargin/
		         *         No distance between data classes
		         * @since 3.0.8
		         * @apioption legend.symbolHeight
		         */

		        /**
		         * The border radius of the symbol for series types that use a rectangle
		         * in the legend. Defaults to half the `symbolHeight`.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/symbolradius/ Round symbols
		         * @sample {highstock} highcharts/legend/symbolradius/ Round symbols
		         * @sample {highmaps} highcharts/legend/symbolradius/ Round symbols
		         * @since 3.0.8
		         * @apioption legend.symbolRadius
		         */

		        /**
		         * The pixel width of the legend item symbol. When the `squareSymbol`
		         * option is set, this defaults to the `symbolHeight`, otherwise 16.
		         *
		         * @productdesc {highmaps}
		         * In Highmaps, when the symbol is the gradient of a horizontal color
		         * axis, the width defaults to 200.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/symbolwidth/
		         *         Greater symbol width and padding
		         * @sample {highmaps} maps/legend/padding-itemmargin/
		         *         Padding and item margins demonstrated
		         * @sample {highmaps} maps/legend/layout-vertical-sized/
		         *         Sized vertical gradient
		         * @apioption legend.symbolWidth
		         */

		        /**
		         * Whether to [use HTML](http://www.highcharts.com/docs/chart-concepts/labels-
		         * and-string-formatting#html) to render the legend item texts. Prior
		         * to 4.1.7, when using HTML, [legend.navigation](#legend.navigation)
		         * was disabled.
		         *
		         * @type {Boolean}
		         * @default false
		         * @apioption legend.useHTML
		         */

		        /**
		         * The width of the legend box.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/width/ Aligned to the plot area
		         * @default null
		         * @since 2.0
		         * @apioption legend.width
		         */

		        /**
		         * The pixel padding between the legend item symbol and the legend
		         * item text.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/symbolpadding/ Greater symbol width and padding
		         * @default 5
		         */
		        symbolPadding: 5,

		        /**
		         * The vertical alignment of the legend box. Can be one of `top`,
		         * `middle` or `bottom`. Vertical position can be further determined
		         * by the `y` option.
		         *
		         * In the case that the legend is aligned in a corner position, the
		         * `layout` option will determine whether to place it above/below
		         * or on the side of the plot area.
		         *
		         * @validvalue ["top", "middle", "bottom"]
		         * @type {String}
		         * @sample {highcharts} highcharts/legend/verticalalign/ Legend 100px from the top of the chart
		         * @sample {highstock} stock/legend/align/ Various legend options
		         * @sample {highmaps} maps/legend/alignment/ Legend alignment
		         * @default bottom
		         * @since 2.0
		         */
		        verticalAlign: 'bottom',
		        // width: undefined,

		        /**
		         * The x offset of the legend relative to its horizontal alignment
		         * `align` within chart.spacingLeft and chart.spacingRight. Negative
		         * x moves it to the left, positive x moves it to the right.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/width/ Aligned to the plot area
		         * @default 0
		         * @since 2.0
		         */
		        x: 0,

		        /**
		         * The vertical offset of the legend relative to it's vertical alignment
		         * `verticalAlign` within chart.spacingTop and chart.spacingBottom.
		         *  Negative y moves it up, positive y moves it down.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/legend/verticalalign/ Legend 100px from the top of the chart
		         * @sample {highstock} stock/legend/align/ Various legend options
		         * @sample {highmaps} maps/legend/alignment/ Legend alignment
		         * @default 0
		         * @since 2.0
		         */
		        y: 0,

		        /**
		         * A title to be added on top of the legend.
		         *
		         * @sample {highcharts} highcharts/legend/title/ Legend title
		         * @sample {highmaps} maps/legend/alignment/ Legend with title
		         * @since 3.0
		         */
		        title: {
		            /**
		             * A text or HTML string for the title.
		             *
		             * @type {String}
		             * @default null
		             * @since 3.0
		             * @apioption legend.title.text
		             */

            
		        }
		    },


		    /**
		     * The loading options control the appearance of the loading screen
		     * that covers the plot area on chart operations. This screen only
		     * appears after an explicit call to `chart.showLoading()`. It is a
		     * utility for developers to communicate to the end user that something
		     * is going on, for example while retrieving new data via an XHR connection.
		     * The "Loading..." text itself is not part of this configuration
		     * object, but part of the `lang` object.
		     *
		     */
		    loading: {

		        /**
		         * The duration in milliseconds of the fade out effect.
		         *
		         * @type {Number}
		         * @sample highcharts/loading/hideduration/ Fade in and out over a second
		         * @default 100
		         * @since 1.2.0
		         * @apioption loading.hideDuration
		         */

		        /**
		         * The duration in milliseconds of the fade in effect.
		         *
		         * @type {Number}
		         * @sample highcharts/loading/hideduration/ Fade in and out over a second
		         * @default 100
		         * @since 1.2.0
		         * @apioption loading.showDuration
		         */
        
		    },


		    /**
		     * Options for the tooltip that appears when the user hovers over a
		     * series or point.
		     *
		     */
		    tooltip: {


		        /**
		         * The color of the tooltip border. When `null`, the border takes the
		         * color of the corresponding series or point.
		         *
		         * @type {Color}
		         * @sample {highcharts} highcharts/tooltip/bordercolor-default/
		         *         Follow series by default
		         * @sample {highcharts} highcharts/tooltip/bordercolor-black/
		         *         Black border
		         * @sample {highstock} stock/tooltip/general/
		         *         Styled tooltip
		         * @sample {highmaps} maps/tooltip/background-border/
		         *         Background and border demo
		         * @default null
		         * @apioption tooltip.borderColor
		         */

		        /**
		         * Since 4.1, the crosshair definitions are moved to the Axis object
		         * in order for a better separation from the tooltip. See
		         * [xAxis.crosshair](#xAxis.crosshair)<a>.</a>
		         *
		         * @type {Mixed}
		         * @deprecated
		         * @sample {highcharts} highcharts/tooltip/crosshairs-x/
		         *         Enable a crosshair for the x value
		         * @default true
		         * @apioption tooltip.crosshairs
		         */

		        /**
		         * Whether the tooltip should follow the mouse as it moves across
		         * columns, pie slices and other point types with an extent. By default
		         * it behaves this way for scatter, bubble and pie series by override
		         * in the `plotOptions` for those series types.
		         *
		         * For touch moves to behave the same way, [followTouchMove](
		         * #tooltip.followTouchMove) must be `true` also.
		         *
		         * @type {Boolean}
		         * @default {highcharts} false
		         * @default {highstock} false
		         * @default {highmaps} true
		         * @since 3.0
		         * @apioption tooltip.followPointer
		         */

		        /**
		         * Whether the tooltip should follow the finger as it moves on a touch
		         * device. If this is `true` and [chart.panning](#chart.panning) is
		         * set,`followTouchMove` will take over one-finger touches, so the user
		         * needs to use two fingers for zooming and panning.
		         *
		         * @type {Boolean}
		         * @default {highcharts} true
		         * @default {highstock} true
		         * @default {highmaps} false
		         * @since 3.0.1
		         * @apioption tooltip.followTouchMove
		         */

		        /**
		         * Callback function to format the text of the tooltip from scratch.
		         * Return `false` to disable tooltip for a specific point on series.
		         *
		         * A subset of HTML is supported. Unless `useHTML` is true, the HTML of
		         * the tooltip is parsed and converted to SVG, therefore this isn't a
		         * complete HTML renderer. The following tags are supported: `<b>`,
		         * `<strong>`, `<i>`, `<em>`, `<br/>`, `<span>`. Spans can be styled
		         * with a `style` attribute, but only text-related CSS that is shared
		         * with SVG is handled.
		         *
		         * Since version 2.1 the tooltip can be shared between multiple series
		         * through the `shared` option. The available data in the formatter
		         * differ a bit depending on whether the tooltip is shared or not. In
		         * a shared tooltip, all properties except `x`, which is common for
		         * all points, are kept in an array, `this.points`.
		         *
		         * Available data are:
		         *
		         * <dl>
		         *
		         * <dt>this.percentage (not shared) / this.points[i].percentage (shared)
		         * </dt>
		         *
		         * <dd>Stacked series and pies only. The point's percentage of the
		         * total.
		         * </dd>
		         *
		         * <dt>this.point (not shared) / this.points[i].point (shared)</dt>
		         *
		         * <dd>The point object. The point name, if defined, is available
		         * through `this.point.name`.</dd>
		         *
		         * <dt>this.points</dt>
		         *
		         * <dd>In a shared tooltip, this is an array containing all other
		         * properties for each point.</dd>
		         *
		         * <dt>this.series (not shared) / this.points[i].series (shared)</dt>
		         *
		         * <dd>The series object. The series name is available through
		         * `this.series.name`.</dd>
		         *
		         * <dt>this.total (not shared) / this.points[i].total (shared)</dt>
		         *
		         * <dd>Stacked series only. The total value at this point's x value.
		         * </dd>
		         *
		         * <dt>this.x</dt>
		         *
		         * <dd>The x value. This property is the same regardless of the tooltip
		         * being shared or not.</dd>
		         *
		         * <dt>this.y (not shared) / this.points[i].y (shared)</dt>
		         *
		         * <dd>The y value.</dd>
		         *
		         * </dl>
		         *
		         * @type {Function}
		         * @sample {highcharts} highcharts/tooltip/formatter-simple/
		         *         Simple string formatting
		         * @sample {highcharts} highcharts/tooltip/formatter-shared/
		         *         Formatting with shared tooltip
		         * @sample {highstock} stock/tooltip/formatter/
		         *         Formatting with shared tooltip
		         * @sample {highmaps} maps/tooltip/formatter/
		         *         String formatting
		         * @apioption tooltip.formatter
		         */

		        /**
		         * The number of milliseconds to wait until the tooltip is hidden when
		         * mouse out from a point or chart.
		         *
		         * @type {Number}
		         * @default 500
		         * @since 3.0
		         * @apioption tooltip.hideDelay
		         */

		        /**
		         * A callback function for formatting the HTML output for a single point
		         * in the tooltip. Like the `pointFormat` string, but with more
		         * flexibility.
		         *
		         * @type {Function}
		         * @context Point
		         * @since 4.1.0
		         * @apioption tooltip.pointFormatter
		         */

		        /**
		         * A callback function to place the tooltip in a default position. The
		         * callback receives three parameters: `labelWidth`, `labelHeight` and
		         * `point`, where point contains values for `plotX` and `plotY` telling
		         * where the reference point is in the plot area. Add `chart.plotLeft`
		         * and `chart.plotTop` to get the full coordinates.
		         *
		         * The return should be an object containing x and y values, for example
		         * `{ x: 100, y: 100 }`.
		         *
		         * @type {Function}
		         * @sample {highcharts} highcharts/tooltip/positioner/
		         *         A fixed tooltip position
		         * @sample {highstock} stock/tooltip/positioner/
		         *         A fixed tooltip position on top of the chart
		         * @sample {highmaps} maps/tooltip/positioner/
		         *         A fixed tooltip position
		         * @since 2.2.4
		         * @apioption tooltip.positioner
		         */

		        /**
		         * The name of a symbol to use for the border around the tooltip.
		         *
		         * @type {String}
		         * @default callout
		         * @validvalue ["callout", "square"]
		         * @since 4.0
		         * @apioption tooltip.shape
		         */

		        /**
		         * When the tooltip is shared, the entire plot area will capture mouse
		         * movement or touch events. Tooltip texts for series types with ordered
		         * data (not pie, scatter, flags etc) will be shown in a single bubble.
		         * This is recommended for single series charts and for tablet/mobile
		         * optimized charts.
		         *
		         * See also [tooltip.split](#tooltip.split), that is better suited for
		         * charts with many series, especially line-type series. The
		         * `tooltip.split` option takes precedence over `tooltip.shared`.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/tooltip/shared-false/
		         *         False by default
		         * @sample {highcharts} highcharts/tooltip/shared-true/ True
		         * @sample {highcharts} highcharts/tooltip/shared-x-crosshair/
		         *         True with x axis crosshair
		         * @sample {highcharts} highcharts/tooltip/shared-true-mixed-types/
		         *         True with mixed series types
		         * @default false
		         * @since 2.1
		         * @product highcharts highstock
		         * @apioption tooltip.shared
		         */

		        /**
		         * Split the tooltip into one label per series, with the header close
		         * to the axis. This is recommended over [shared](#tooltip.shared)
		         * tooltips for charts with multiple line series, generally making them
		         * easier to read. This option takes precedence over `tooltip.shared`.
		         *
		         * @productdesc {highstock} In Highstock, tooltips are split by default
		         * since v6.0.0. Stock charts typically contain multi-dimension points
		         * and multiple panes, making split tooltips the preferred layout over
		         * the previous `shared` tooltip.
		         *
		         * @type {Boolean}
		         * @sample highcharts/tooltip/split/ Split tooltip
		         * @default {highcharts} false
		         * @default {highstock} true
		         * @product highcharts highstock
		         * @since 5.0.0
		         * @apioption tooltip.split
		         */

		        /**
		         * Use HTML to render the contents of the tooltip instead of SVG. Using
		         * HTML allows advanced formatting like tables and images in the
		         * tooltip. It is also recommended for rtl languages as it works around
		         * rtl bugs in early Firefox.
		         *
		         * @type {Boolean}
		         * @sample {highcharts|highstock} highcharts/tooltip/footerformat/
		         *         A table for value alignment
		         * @sample {highcharts|highstock} highcharts/tooltip/fullhtml/
		         *         Full HTML tooltip
		         * @sample {highmaps} maps/tooltip/usehtml/ Pure HTML tooltip
		         * @default false
		         * @since 2.2
		         * @apioption tooltip.useHTML
		         */

		        /**
		         * How many decimals to show in each series' y value. This is
		         * overridable in each series' tooltip options object. The default is to
		         * preserve all decimals.
		         *
		         * @type {Number}
		         * @sample {highcharts|highstock} highcharts/tooltip/valuedecimals/
		         *         Set decimals, prefix and suffix for the value
		         * @sample {highmaps} maps/tooltip/valuedecimals/
		         *         Set decimals, prefix and suffix for the value
		         * @since 2.2
		         * @apioption tooltip.valueDecimals
		         */

		        /**
		         * A string to prepend to each series' y value. Overridable in each
		         * series' tooltip options object.
		         *
		         * @type {String}
		         * @sample {highcharts|highstock} highcharts/tooltip/valuedecimals/
		         *         Set decimals, prefix and suffix for the value
		         * @sample {highmaps} maps/tooltip/valuedecimals/
		         *         Set decimals, prefix and suffix for the value
		         * @since 2.2
		         * @apioption tooltip.valuePrefix
		         */

		        /**
		         * A string to append to each series' y value. Overridable in each
		         * series' tooltip options object.
		         *
		         * @type {String}
		         * @sample {highcharts|highstock} highcharts/tooltip/valuedecimals/
		         *         Set decimals, prefix and suffix for the value
		         * @sample {highmaps} maps/tooltip/valuedecimals/
		         *         Set decimals, prefix and suffix for the value
		         * @since 2.2
		         * @apioption tooltip.valueSuffix
		         */

		        /**
		         * The format for the date in the tooltip header if the X axis is a
		         * datetime axis. The default is a best guess based on the smallest
		         * distance between points in the chart.
		         *
		         * @type {String}
		         * @sample {highcharts} highcharts/tooltip/xdateformat/ A different format
		         * @product highcharts highstock
		         * @apioption tooltip.xDateFormat
		         */

		        /**
		         * Enable or disable the tooltip.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/tooltip/enabled/ Disabled
		         * @sample {highcharts}
		         *         highcharts/plotoptions/series-point-events-mouseover/
		         *         Disable tooltip and show values on chart instead
		         * @default true
		         */
		        enabled: true,

		        /**
		         * Enable or disable animation of the tooltip.
		         *
		         * @type {Boolean}
		         * @default true
		         * @since 2.3.0
		         */
		        animation: svg,

		        /**
		         * The radius of the rounded border corners.
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/tooltip/bordercolor-default/
		         *         5px by default
		         * @sample {highcharts} highcharts/tooltip/borderradius-0/
		         *         Square borders
		         * @sample {highmaps} maps/tooltip/background-border/
		         *         Background and border demo
		         * @default 3
		         */
		        borderRadius: 3,

		        /**
		         * For series on a datetime axes, the date format in the tooltip's
		         * header will by default be guessed based on the closest data points.
		         * This member gives the default string representations used for
		         * each unit. For an overview of the replacement codes, see
		         * [dateFormat](/class-reference/Highcharts#dateFormat).
		         *
		         * Defaults to:
		         *
		         * <pre>{
		         *     millisecond:"%A, %b %e, %H:%M:%S.%L",
		         *     second:"%A, %b %e, %H:%M:%S",
		         *     minute:"%A, %b %e, %H:%M",
		         *     hour:"%A, %b %e, %H:%M",
		         *     day:"%A, %b %e, %Y",
		         *     week:"Week from %A, %b %e, %Y",
		         *     month:"%B %Y",
		         *     year:"%Y"
		         * }</pre>
		         *
		         * @type {Object}
		         * @see [xAxis.dateTimeLabelFormats](#xAxis.dateTimeLabelFormats)
		         * @product highcharts highstock
		         */
		        dateTimeLabelFormats: {
		            millisecond: '%A, %b %e, %H:%M:%S.%L',
		            second: '%A, %b %e, %H:%M:%S',
		            minute: '%A, %b %e, %H:%M',
		            hour: '%A, %b %e, %H:%M',
		            day: '%A, %b %e, %Y',
		            week: 'Week from %A, %b %e, %Y',
		            month: '%B %Y',
		            year: '%Y'
		        },

		        /**
		         * A string to append to the tooltip format.
		         *
		         * @sample {highcharts} highcharts/tooltip/footerformat/
		         *         A table for value alignment
		         * @sample {highmaps} maps/tooltip/format/ Format demo
		         * @since 2.2
		         */
		        footerFormat: '',

		        /**
		         * Padding inside the tooltip, in pixels.
		         *
		         * @type {Number}
		         * @default 8
		         * @since 5.0.0
		         */
		        padding: 8,

		        /**
		         * Proximity snap for graphs or single points. It defaults to 10 for
		         * mouse-powered devices and 25 for touch devices.
		         *
		         * Note that in most cases the whole plot area captures the mouse
		         * movement, and in these cases `tooltip.snap` doesn't make sense. This
		         * applies when [stickyTracking](#plotOptions.series.stickyTracking)
		         * is `true` (default) and when the tooltip is [shared](#tooltip.shared)
		         * or [split](#tooltip.split).
		         *
		         * @type {Number}
		         * @sample {highcharts} highcharts/tooltip/bordercolor-default/
		         *         10 px by default
		         * @sample {highcharts} highcharts/tooltip/snap-50/ 50 px on graph
		         * @default 10/25
		         * @since 1.2.0
		         * @product highcharts highstock
		         */
		        snap: isTouchDevice ? 25 : 10,
        
		        headerFormat: '<span class="highcharts-header">{point.key}</span><br/>',
		        pointFormat: '<span class="highcharts-color-{point.colorIndex}">' +
		            '\u25CF</span> {series.name}: <span class="highcharts-strong">' +
		            '{point.y}</span><br/>'
        
		    },


		    /**
		     * Highchart by default puts a credits label in the lower right corner
		     * of the chart. This can be changed using these options.
		     */
		    credits: {

		        /**
		         * Whether to show the credits text.
		         *
		         * @type {Boolean}
		         * @sample {highcharts} highcharts/credits/enabled-false/ Credits disabled
		         * @sample {highstock} stock/credits/enabled/ Credits disabled
		         * @sample {highmaps} maps/credits/enabled-false/ Credits disabled
		         * @default true
		         */
		        enabled: true,

		        /**
		         * The URL for the credits label.
		         *
		         * @type {String}
		         * @sample {highcharts} highcharts/credits/href/ Custom URL and text
		         * @sample {highmaps} maps/credits/customized/ Custom URL and text
		         * @default {highcharts} http://www.highcharts.com
		         * @default {highstock} "http://www.highcharts.com"
		         * @default {highmaps} http://www.highcharts.com
		         */
		        href: 'http://www.highcharts.com',

		        /**
		         * Position configuration for the credits label.
		         *
		         * @type {Object}
		         * @sample {highcharts} highcharts/credits/position-left/ Left aligned
		         * @sample {highcharts} highcharts/credits/position-left/ Left aligned
		         * @sample {highmaps} maps/credits/customized/ Left aligned
		         * @sample {highmaps} maps/credits/customized/ Left aligned
		         * @since 2.1
		         */
		        position: {

		            /**
		             * Horizontal alignment of the credits.
		             *
		             * @validvalue ["left", "center", "right"]
		             * @type {String}
		             * @default right
		             */
		            align: 'right',

		            /**
		             * Horizontal pixel offset of the credits.
		             *
		             * @type {Number}
		             * @default -10
		             */
		            x: -10,

		            /**
		             * Vertical alignment of the credits.
		             *
		             * @validvalue ["top", "middle", "bottom"]
		             * @type {String}
		             * @default bottom
		             */
		            verticalAlign: 'bottom',

		            /**
		             * Vertical pixel offset of the credits.
		             *
		             * @type {Number}
		             * @default -5
		             */
		            y: -5
		        },
        

		        /**
		         * The text for the credits label.
		         *
		         * @productdesc {highmaps}
		         * If a map is loaded as GeoJSON, the text defaults to
		         * `Highcharts @ {map-credits}`. Otherwise, it defaults to
		         * `Highcharts.com`.
		         *
		         * @type {String}
		         * @sample {highcharts} highcharts/credits/href/ Custom URL and text
		         * @sample {highmaps} maps/credits/customized/ Custom URL and text
		         * @default {highcharts|highstock} Highcharts.com
		         */
		        text: 'Highcharts.com'
		    }
		};

		/**
		 * Merge the default options with custom options and return the new options
		 * structure. Commonly used for defining reusable templates.
		 *
		 * @function #setOptions
		 * @memberOf  Highcharts
		 * @sample highcharts/global/useutc-false Setting a global option
		 * @sample highcharts/members/setoptions Applying a global theme
		 * @param {Object} options The new custom chart options.
		 * @returns {Object} Updated options.
		 */
		H.setOptions = function (options) {

		    // Copy in the default options
		    H.defaultOptions = merge(true, H.defaultOptions, options);

		    // Update the time object
		    H.time.update(
		        merge(H.defaultOptions.global, H.defaultOptions.time),
		        false
		    );

		    return H.defaultOptions;
		};

		/**
		 * Get the updated default options. Until 3.0.7, merely exposing defaultOptions
		 * for outside modules wasn't enough because the setOptions method created a new
		 * object.
		 */
		H.getOptions = function () {
		    return H.defaultOptions;
		};


		// Series defaults
		H.defaultPlotOptions = H.defaultOptions.plotOptions;


		// Time utilities
		H.time = new H.Time(merge(H.defaultOptions.global, H.defaultOptions.time));

		/**
		 * Formats a JavaScript date timestamp (milliseconds since Jan 1st 1970) into a
		 * human readable date string. The format is a subset of the formats for PHP's
		 * [strftime]{@link
		 * http://www.php.net/manual/en/function.strftime.php} function. Additional
		 * formats can be given in the {@link Highcharts.dateFormats} hook.
		 *
		 * Since v6.0.5, all internal dates are formatted through the
		 * [Chart.time](Chart#time) instance to respect chart-level time settings. The
		 * `Highcharts.dateFormat` function only reflects global time settings set with
		 * `setOptions`.
		 *
		 * @function #dateFormat
		 * @memberOf Highcharts
		 * @param {String} format - The desired format where various time
		 *        representations are prefixed with %.
		 * @param {Number} timestamp - The JavaScript timestamp.
		 * @param {Boolean} [capitalize=false] - Upper case first letter in the return.
		 * @returns {String} The formatted date.
		 */
		H.dateFormat = function (format, timestamp, capitalize) {
		    return H.time.dateFormat(format, timestamp, capitalize);
		};

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */

		var SVGElement,
		    SVGRenderer,

		    addEvent = H.addEvent,
		    animate = H.animate,
		    attr = H.attr,
		    charts = H.charts,
		    color = H.color,
		    css = H.css,
		    createElement = H.createElement,
		    defined = H.defined,
		    deg2rad = H.deg2rad,
		    destroyObjectProperties = H.destroyObjectProperties,
		    doc = H.doc,
		    each = H.each,
		    extend = H.extend,
		    erase = H.erase,
		    grep = H.grep,
		    hasTouch = H.hasTouch,
		    inArray = H.inArray,
		    isArray = H.isArray,
		    isFirefox = H.isFirefox,
		    isMS = H.isMS,
		    isObject = H.isObject,
		    isString = H.isString,
		    isWebKit = H.isWebKit,
		    merge = H.merge,
		    noop = H.noop,
		    objectEach = H.objectEach,
		    pick = H.pick,
		    pInt = H.pInt,
		    removeEvent = H.removeEvent,
		    splat = H.splat,
		    stop = H.stop,
		    svg = H.svg,
		    SVG_NS = H.SVG_NS,
		    symbolSizes = H.symbolSizes,
		    win = H.win;

		/**
		 * @typedef {Object} SVGDOMElement - An SVG DOM element.
		 */
		/**
		 * The SVGElement prototype is a JavaScript wrapper for SVG elements used in the
		 * rendering layer of Highcharts. Combined with the {@link
		 * Highcharts.SVGRenderer} object, these prototypes allow freeform annotation
		 * in the charts or even in HTML pages without instanciating a chart. The
		 * SVGElement can also wrap HTML labels, when `text` or `label` elements are
		 * created with the `useHTML` parameter.
		 *
		 * The SVGElement instances are created through factory functions on the
		 * {@link Highcharts.SVGRenderer} object, like
		 * [rect]{@link Highcharts.SVGRenderer#rect}, [path]{@link
		 * Highcharts.SVGRenderer#path}, [text]{@link Highcharts.SVGRenderer#text},
		 * [label]{@link Highcharts.SVGRenderer#label}, [g]{@link
		 * Highcharts.SVGRenderer#g} and more.
		 *
		 * @class Highcharts.SVGElement
		 */
		SVGElement = H.SVGElement = function () {
		    return this;
		};
		extend(SVGElement.prototype, /** @lends Highcharts.SVGElement.prototype */ {

		    // Default base for animation
		    opacity: 1,
		    SVG_NS: SVG_NS,

		    /**
		     * For labels, these CSS properties are applied to the `text` node directly.
		     *
		     * @private
		     * @type {Array<String>}
		     */
		    textProps: ['direction', 'fontSize', 'fontWeight', 'fontFamily',
		        'fontStyle', 'color', 'lineHeight', 'width', 'textAlign',
		        'textDecoration', 'textOverflow', 'textOutline'],

		    /**
		     * Initialize the SVG element. This function only exists to make the
		     * initiation process overridable. It should not be called directly.
		     *
		     * @param  {SVGRenderer} renderer
		     *         The SVGRenderer instance to initialize to.
		     * @param  {String} nodeName
		     *         The SVG node name.
		     *
		     */
		    init: function (renderer, nodeName) {

		        /**
		         * The primary DOM node. Each `SVGElement` instance wraps a main DOM
		         * node, but may also represent more nodes.
		         *
		         * @name  element
		         * @memberOf SVGElement
		         * @type {SVGDOMNode|HTMLDOMNode}
		         */
		        this.element = nodeName === 'span' ?
		            createElement(nodeName) :
		            doc.createElementNS(this.SVG_NS, nodeName);

		        /**
		         * The renderer that the SVGElement belongs to.
		         *
		         * @name renderer
		         * @memberOf SVGElement
		         * @type {SVGRenderer}
		         */
		        this.renderer = renderer;
		    },

		    /**
		     * Animate to given attributes or CSS properties.
		     *
		     * @param {SVGAttributes} params SVG attributes or CSS to animate.
		     * @param {AnimationOptions} [options] Animation options.
		     * @param {Function} [complete] Function to perform at the end of animation.
		     *
		     * @sample highcharts/members/element-on/
		     *         Setting some attributes by animation
		     *
		     * @returns {SVGElement} Returns the SVGElement for chaining.
		     */
		    animate: function (params, options, complete) {
		        var animOptions = H.animObject(
		            pick(options, this.renderer.globalAnimation, true)
		        );
		        if (animOptions.duration !== 0) {
		            // allows using a callback with the global animation without
		            // overwriting it
		            if (complete) {
		                animOptions.complete = complete;
		            }
		            animate(this, params, animOptions);
		        } else {
		            this.attr(params, null, complete);
		            if (animOptions.step) {
		                animOptions.step.call(this);
		            }
		        }
		        return this;
		    },

		    /**
		     * @typedef {Object} GradientOptions
		     * @property {Object} linearGradient Holds an object that defines the start
		     *    position and the end position relative to the shape.
		     * @property {Number} linearGradient.x1 Start horizontal position of the
		     *    gradient. Ranges 0-1.
		     * @property {Number} linearGradient.x2 End horizontal position of the
		     *    gradient. Ranges 0-1.
		     * @property {Number} linearGradient.y1 Start vertical position of the
		     *    gradient. Ranges 0-1.
		     * @property {Number} linearGradient.y2 End vertical position of the
		     *    gradient. Ranges 0-1.
		     * @property {Object} radialGradient Holds an object that defines the center
		     *    position and the radius.
		     * @property {Number} radialGradient.cx Center horizontal position relative
		     *    to the shape. Ranges 0-1.
		     * @property {Number} radialGradient.cy Center vertical position relative
		     *    to the shape. Ranges 0-1.
		     * @property {Number} radialGradient.r Radius relative to the shape. Ranges
		     *    0-1.
		     * @property {Array<Array<Number|String>>} stops The first item in each
		     *    tuple is the position in the gradient, where 0 is the start of the
		     *    gradient and 1 is the end of the gradient. Multiple stops can be
		     *    applied. The second item is the color for each stop. This color can
		     *    also be given in the rgba format.
		     *
		     * @example
		     * // Linear gradient used as a color option
		     * color: {
		     *     linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
		     *         stops: [
		     *             [0, '#003399'], // start
		     *             [0.5, '#ffffff'], // middle
		     *             [1, '#3366AA'] // end
		     *         ]
		     *     }
		     * }
		     */
		    /**
		     * Build and apply an SVG gradient out of a common JavaScript configuration
		     * object. This function is called from the attribute setters. An event
		     * hook is added for supporting other complex color types.
		     *
		     * @private
		     * @param {GradientOptions} color The gradient options structure.
		     * @param {string} prop The property to apply, can either be `fill` or
		     * `stroke`.
		     * @param {SVGDOMElement} elem SVG DOM element to apply the gradient on.
		     */
		    complexColor: function (color, prop, elem) {
		        var renderer = this.renderer,
		            colorObject,
		            gradName,
		            gradAttr,
		            radAttr,
		            gradients,
		            gradientObject,
		            stops,
		            stopColor,
		            stopOpacity,
		            radialReference,
		            id,
		            key = [],
		            value;

		        H.fireEvent(this.renderer, 'complexColor', {
		            args: arguments
		        }, function () {
		            // Apply linear or radial gradients
		            if (color.radialGradient) {
		                gradName = 'radialGradient';
		            } else if (color.linearGradient) {
		                gradName = 'linearGradient';
		            }

		            if (gradName) {
		                gradAttr = color[gradName];
		                gradients = renderer.gradients;
		                stops = color.stops;
		                radialReference = elem.radialReference;

		                // Keep < 2.2 kompatibility
		                if (isArray(gradAttr)) {
		                    color[gradName] = gradAttr = {
		                        x1: gradAttr[0],
		                        y1: gradAttr[1],
		                        x2: gradAttr[2],
		                        y2: gradAttr[3],
		                        gradientUnits: 'userSpaceOnUse'
		                    };
		                }

		                // Correct the radial gradient for the radial reference system
		                if (
		                    gradName === 'radialGradient' &&
		                    radialReference &&
		                    !defined(gradAttr.gradientUnits)
		                ) {
		                    // Save the radial attributes for updating
		                    radAttr = gradAttr;
		                    gradAttr = merge(
		                        gradAttr,
		                        renderer.getRadialAttr(radialReference, radAttr),
		                        { gradientUnits: 'userSpaceOnUse' }
		                    );
		                }

		                // Build the unique key to detect whether we need to create a
		                // new element (#1282)
		                objectEach(gradAttr, function (val, n) {
		                    if (n !== 'id') {
		                        key.push(n, val);
		                    }
		                });
		                objectEach(stops, function (val) {
		                    key.push(val);
		                });
		                key = key.join(',');

		                // Check if a gradient object with the same config object is
		                // created within this renderer
		                if (gradients[key]) {
		                    id = gradients[key].attr('id');

		                } else {

		                    // Set the id and create the element
		                    gradAttr.id = id = H.uniqueKey();
		                    gradients[key] = gradientObject =
		                        renderer.createElement(gradName)
		                            .attr(gradAttr)
		                            .add(renderer.defs);

		                    gradientObject.radAttr = radAttr;

		                    // The gradient needs to keep a list of stops to be able to
		                    // destroy them
		                    gradientObject.stops = [];
		                    each(stops, function (stop) {
		                        var stopObject;
		                        if (stop[1].indexOf('rgba') === 0) {
		                            colorObject = H.color(stop[1]);
		                            stopColor = colorObject.get('rgb');
		                            stopOpacity = colorObject.get('a');
		                        } else {
		                            stopColor = stop[1];
		                            stopOpacity = 1;
		                        }
		                        stopObject = renderer.createElement('stop').attr({
		                            offset: stop[0],
		                            'stop-color': stopColor,
		                            'stop-opacity': stopOpacity
		                        }).add(gradientObject);

		                        // Add the stop element to the gradient
		                        gradientObject.stops.push(stopObject);
		                    });
		                }

		                // Set the reference to the gradient object
		                value = 'url(' + renderer.url + '#' + id + ')';
		                elem.setAttribute(prop, value);
		                elem.gradient = key;

		                // Allow the color to be concatenated into tooltips formatters
		                // etc. (#2995)
		                color.toString = function () {
		                    return value;
		                };
		            }
		        });
		    },

		    /**
		     * Apply a text outline through a custom CSS property, by copying the text
		     * element and apply stroke to the copy. Used internally. Contrast checks
		     * at http://jsfiddle.net/highcharts/43soe9m1/2/ .
		     *
		     * @private
		     * @param {String} textOutline A custom CSS `text-outline` setting, defined
		     *    by `width color`.
		     * @example
		     * // Specific color
		     * text.css({
		     *    textOutline: '1px black'
		     * });
		     * // Automatic contrast
		     * text.css({
		     *    color: '#000000', // black text
		     *    textOutline: '1px contrast' // => white outline
		     * });
		     */
		    applyTextOutline: function (textOutline) {
		        var elem = this.element,
		            tspans,
		            tspan,
		            hasContrast = textOutline.indexOf('contrast') !== -1,
		            styles = {},
		            color,
		            strokeWidth,
		            firstRealChild,
		            i;

		        // When the text shadow is set to contrast, use dark stroke for light
		        // text and vice versa.
		        if (hasContrast) {
		            styles.textOutline = textOutline = textOutline.replace(
		                /contrast/g,
		                this.renderer.getContrast(elem.style.fill)
		            );
		        }

		        // Extract the stroke width and color
		        textOutline = textOutline.split(' ');
		        color = textOutline[textOutline.length - 1];
		        strokeWidth = textOutline[0];

		        if (strokeWidth && strokeWidth !== 'none' && H.svg) {

		            this.fakeTS = true; // Fake text shadow

		            tspans = [].slice.call(elem.getElementsByTagName('tspan'));

		            // In order to get the right y position of the clone,
		            // copy over the y setter
		            this.ySetter = this.xSetter;

		            // Since the stroke is applied on center of the actual outline, we
		            // need to double it to get the correct stroke-width outside the
		            // glyphs.
		            strokeWidth = strokeWidth.replace(
		                /(^[\d\.]+)(.*?)$/g,
		                function (match, digit, unit) {
		                    return (2 * digit) + unit;
		                }
		            );

		            // Remove shadows from previous runs. Iterate from the end to
		            // support removing items inside the cycle (#6472).
		            i = tspans.length;
		            while (i--) {
		                tspan = tspans[i];
		                if (tspan.getAttribute('class') === 'highcharts-text-outline') {
		                    // Remove then erase
		                    erase(tspans, elem.removeChild(tspan));
		                }
		            }

		            // For each of the tspans, create a stroked copy behind it.
		            firstRealChild = elem.firstChild;
		            each(tspans, function (tspan, y) {
		                var clone;

		                // Let the first line start at the correct X position
		                if (y === 0) {
		                    tspan.setAttribute('x', elem.getAttribute('x'));
		                    y = elem.getAttribute('y');
		                    tspan.setAttribute('y', y || 0);
		                    if (y === null) {
		                        elem.setAttribute('y', 0);
		                    }
		                }

		                // Create the clone and apply outline properties
		                clone = tspan.cloneNode(1);
		                attr(clone, {
		                    'class': 'highcharts-text-outline',
		                    'fill': color,
		                    'stroke': color,
		                    'stroke-width': strokeWidth,
		                    'stroke-linejoin': 'round'
		                });
		                elem.insertBefore(clone, firstRealChild);
		            });
		        }
		    },

		    /**
		     *
		     * @typedef {Object} SVGAttributes An object of key-value pairs for SVG
		     *   attributes. Attributes in Highcharts elements for the most parts
		     *   correspond to SVG, but some are specific to Highcharts, like `zIndex`,
		     *   `rotation`, `rotationOriginX`, `rotationOriginY`, `translateX`,
		     *   `translateY`, `scaleX` and `scaleY`. SVG attributes containing a hyphen
		     *   are _not_ camel-cased, they should be quoted to preserve the hyphen.
		     *
		     * @example
		     * {
		     *     'stroke': '#ff0000', // basic
		     *     'stroke-width': 2, // hyphenated
		     *     'rotation': 45 // custom
		     *     'd': ['M', 10, 10, 'L', 30, 30, 'z'] // path definition, note format
		     * }
		     */
		    /**
		     * Apply native and custom attributes to the SVG elements.
		     *
		     * In order to set the rotation center for rotation, set x and y to 0 and
		     * use `translateX` and `translateY` attributes to position the element
		     * instead.
		     *
		     * Attributes frequently used in Highcharts are `fill`, `stroke`,
		     * `stroke-width`.
		     *
		     * @param {SVGAttributes|String} hash - The native and custom SVG
		     *    attributes.
		     * @param {string} [val] - If the type of the first argument is `string`,
		     *    the second can be a value, which will serve as a single attribute
		     *    setter. If the first argument is a string and the second is undefined,
		     *    the function serves as a getter and the current value of the property
		     *    is returned.
		     * @param {Function} [complete] - A callback function to execute after
		     *    setting the attributes. This makes the function compliant and
		     *    interchangeable with the {@link SVGElement#animate} function.
		     * @param {boolean} [continueAnimation=true] Used internally when `.attr` is
		     *    called as part of an animation step. Otherwise, calling `.attr` for an
		     *    attribute will stop animation for that attribute.
		     *
		     * @returns {SVGElement|string|number} If used as a setter, it returns the
		     *    current {@link SVGElement} so the calls can be chained. If used as a
		     *    getter, the current value of the attribute is returned.
		     *
		     * @sample highcharts/members/renderer-rect/
		     *         Setting some attributes
		     *
		     * @example
		     * // Set multiple attributes
		     * element.attr({
		     *     stroke: 'red',
		     *     fill: 'blue',
		     *     x: 10,
		     *     y: 10
		     * });
		     *
		     * // Set a single attribute
		     * element.attr('stroke', 'red');
		     *
		     * // Get an attribute
		     * element.attr('stroke'); // => 'red'
		     *
		     */
		    attr: function (hash, val, complete, continueAnimation) {
		        var key,
		            element = this.element,
		            hasSetSymbolSize,
		            ret = this,
		            skipAttr,
		            setter;

		        // single key-value pair
		        if (typeof hash === 'string' && val !== undefined) {
		            key = hash;
		            hash = {};
		            hash[key] = val;
		        }

		        // used as a getter: first argument is a string, second is undefined
		        if (typeof hash === 'string') {
		            ret = (this[hash + 'Getter'] || this._defaultGetter).call(
		                this,
		                hash,
		                element
		            );

		        // setter
		        } else {

		            objectEach(hash, function eachAttribute(val, key) {
		                skipAttr = false;

		                // Unless .attr is from the animator update, stop current
		                // running animation of this property
		                if (!continueAnimation) {
		                    stop(this, key);
		                }

		                // Special handling of symbol attributes
		                if (
		                    this.symbolName &&
		                    /^(x|y|width|height|r|start|end|innerR|anchorX|anchorY)$/
		                    .test(key)
		                ) {
		                    if (!hasSetSymbolSize) {
		                        this.symbolAttr(hash);
		                        hasSetSymbolSize = true;
		                    }
		                    skipAttr = true;
		                }

		                if (this.rotation && (key === 'x' || key === 'y')) {
		                    this.doTransform = true;
		                }

		                if (!skipAttr) {
		                    setter = this[key + 'Setter'] || this._defaultSetter;
		                    setter.call(this, val, key, element);

                    
		                }
		            }, this);

		            this.afterSetters();
		        }

		        // In accordance with animate, run a complete callback
		        if (complete) {
		            complete.call(this);
		        }

		        return ret;
		    },

		    /**
		     * This method is executed in the end of `attr()`, after setting all
		     * attributes in the hash. In can be used to efficiently consolidate
		     * multiple attributes in one SVG property -- e.g., translate, rotate and
		     * scale are merged in one "transform" attribute in the SVG node.
		     *
		     * @private
		     */
		    afterSetters: function () {
		        // Update transform. Do this outside the loop to prevent redundant
		        // updating for batch setting of attributes.
		        if (this.doTransform) {
		            this.updateTransform();
		            this.doTransform = false;
		        }
		    },

    

		    /**
		     * Add a class name to an element.
		     *
		     * @param {string} className - The new class name to add.
		     * @param {boolean} [replace=false] - When true, the existing class name(s)
		     *    will be overwritten with the new one. When false, the new one is
		     *    added.
		     * @returns {SVGElement} Return the SVG element for chainability.
		     */
		    addClass: function (className, replace) {
		        var currentClassName = this.attr('class') || '';
		        if (currentClassName.indexOf(className) === -1) {
		            if (!replace) {
		                className =
		                    (currentClassName + (currentClassName ? ' ' : '') +
		                    className).replace('  ', ' ');
		            }
		            this.attr('class', className);
		        }

		        return this;
		    },

		    /**
		     * Check if an element has the given class name.
		     * @param  {string} className
		     *         The class name to check for.
		     * @return {Boolean}
		     *         Whether the class name is found.
		     */
		    hasClass: function (className) {
		        return inArray(
		            className,
		            (this.attr('class') || '').split(' ')
		        ) !== -1;
		    },

		    /**
		     * Remove a class name from the element.
		     * @param  {String|RegExp} className The class name to remove.
		     * @return {SVGElement} Returns the SVG element for chainability.
		     */
		    removeClass: function (className) {
		        return this.attr(
		            'class',
		            (this.attr('class') || '').replace(className, '')
		        );
		    },

		    /**
		     * If one of the symbol size affecting parameters are changed,
		     * check all the others only once for each call to an element's
		     * .attr() method
		     * @param {Object} hash - The attributes to set.
		     * @private
		     */
		    symbolAttr: function (hash) {
		        var wrapper = this;

		        each([
		            'x',
		            'y',
		            'r',
		            'start',
		            'end',
		            'width',
		            'height',
		            'innerR',
		            'anchorX',
		            'anchorY'
		        ], function (key) {
		            wrapper[key] = pick(hash[key], wrapper[key]);
		        });

		        wrapper.attr({
		            d: wrapper.renderer.symbols[wrapper.symbolName](
		                wrapper.x,
		                wrapper.y,
		                wrapper.width,
		                wrapper.height,
		                wrapper
		            )
		        });
		    },

		    /**
		     * Apply a clipping rectangle to this element.
		     *
		     * @param {ClipRect} [clipRect] - The clipping rectangle. If skipped, the
		     *    current clip is removed.
		     * @returns {SVGElement} Returns the SVG element to allow chaining.
		     */
		    clip: function (clipRect) {
		        return this.attr(
		            'clip-path',
		            clipRect ?
		                'url(' + this.renderer.url + '#' + clipRect.id + ')' :
		                'none'
		        );
		    },

		    /**
		     * Calculate the coordinates needed for drawing a rectangle crisply and
		     * return the calculated attributes.
		     *
		     * @param {Object} rect - A rectangle.
		     * @param {number} rect.x - The x position.
		     * @param {number} rect.y - The y position.
		     * @param {number} rect.width - The width.
		     * @param {number} rect.height - The height.
		     * @param {number} [strokeWidth] - The stroke width to consider when
		     *    computing crisp positioning. It can also be set directly on the rect
		     *    parameter.
		     *
		     * @returns {{x: Number, y: Number, width: Number, height: Number}} The
		     *    modified rectangle arguments.
		     */
		    crisp: function (rect, strokeWidth) {

		        var wrapper = this,
		            normalizer;

		        strokeWidth = strokeWidth || rect.strokeWidth || 0;
		        // Math.round because strokeWidth can sometimes have roundoff errors
		        normalizer = Math.round(strokeWidth) % 2 / 2;

		        // normalize for crisp edges
		        rect.x = Math.floor(rect.x || wrapper.x || 0) + normalizer;
		        rect.y = Math.floor(rect.y || wrapper.y || 0) + normalizer;
		        rect.width = Math.floor(
		            (rect.width || wrapper.width || 0) - 2 * normalizer
		        );
		        rect.height = Math.floor(
		            (rect.height || wrapper.height || 0) - 2 * normalizer
		        );
		        if (defined(rect.strokeWidth)) {
		            rect.strokeWidth = strokeWidth;
		        }
		        return rect;
		    },

		    /**
		     * Set styles for the element. In addition to CSS styles supported by
		     * native SVG and HTML elements, there are also some custom made for
		     * Highcharts, like `width`, `ellipsis` and `textOverflow` for SVG text
		     * elements.
		     * @param {CSSObject} styles The new CSS styles.
		     * @returns {SVGElement} Return the SVG element for chaining.
		     *
		     * @sample highcharts/members/renderer-text-on-chart/
		     *         Styled text
		     */
		    css: function (styles) {
		        var oldStyles = this.styles,
		            newStyles = {},
		            elem = this.element,
		            textWidth,
		            serializedCss = '',
		            hyphenate,
		            hasNew = !oldStyles,
		            // These CSS properties are interpreted internally by the SVG
		            // renderer, but are not supported by SVG and should not be added to
		            // the DOM. In styled mode, no CSS should find its way to the DOM
		            // whatsoever (#6173, #6474).
		            svgPseudoProps = ['textOutline', 'textOverflow', 'width'];

		        // convert legacy
		        if (styles && styles.color) {
		            styles.fill = styles.color;
		        }

		        // Filter out existing styles to increase performance (#2640)
		        if (oldStyles) {
		            objectEach(styles, function (style, n) {
		                if (style !== oldStyles[n]) {
		                    newStyles[n] = style;
		                    hasNew = true;
		                }
		            });
		        }
		        if (hasNew) {

		            // Merge the new styles with the old ones
		            if (oldStyles) {
		                styles = extend(
		                    oldStyles,
		                    newStyles
		                );
		            }

		            // Get the text width from style
		            if (styles) {
		                // Previously set, unset it (#8234)
		                if (styles.width === null || styles.width === 'auto') {
		                    delete this.textWidth;

		                // Apply new
		                } else if (
		                    elem.nodeName.toLowerCase() === 'text' &&
		                    styles.width
		                ) {
		                    textWidth = this.textWidth = pInt(styles.width);
		                }
		            }

		            // store object
		            this.styles = styles;

		            if (textWidth && (!svg && this.renderer.forExport)) {
		                delete styles.width;
		            }

		            // Serialize and set style attribute
		            if (elem.namespaceURI === this.SVG_NS) { // #7633
		                hyphenate = function (a, b) {
		                    return '-' + b.toLowerCase();
		                };
		                objectEach(styles, function (style, n) {
		                    if (inArray(n, svgPseudoProps) === -1) {
		                        serializedCss +=
		                        n.replace(/([A-Z])/g, hyphenate) + ':' +
		                        style + ';';
		                    }
		                });
		                if (serializedCss) {
		                    attr(elem, 'style', serializedCss); // #1881
		                }
		            } else {
		                css(elem, styles);
		            }


		            if (this.added) {

		                // Rebuild text after added. Cache mechanisms in the buildText
		                // will prevent building if there are no significant changes.
		                if (this.element.nodeName === 'text') {
		                    this.renderer.buildText(this);
		                }

		                // Apply text outline after added
		                if (styles && styles.textOutline) {
		                    this.applyTextOutline(styles.textOutline);
		                }
		            }
		        }

		        return this;
		    },

    
		    /**
		     * Get the computed style. Only in styled mode.
		     * @param {string} prop - The property name to check for.
		     * @returns {string} The current computed value.
		     * @example
		     * chart.series[0].points[0].graphic.getStyle('stroke-width'); // => '1px'
		     */
		    getStyle: function (prop) {
		        return win.getComputedStyle(this.element || this, '')
		            .getPropertyValue(prop);
		    },

		    /**
		     * Get the computed stroke width in pixel values. This is used extensively
		     * when drawing shapes to ensure the shapes are rendered crisp and
		     * positioned correctly relative to each other. Using
		     * `shape-rendering: crispEdges` leaves us less control over positioning,
		     * for example when we want to stack columns next to each other, or position
		     * things pixel-perfectly within the plot box.
		     *
		     * The common pattern when placing a shape is:
		     * * Create the SVGElement and add it to the DOM. In styled mode, it will
		     *   now receive a stroke width from the style sheet. In classic mode we
		     *   will add the `stroke-width` attribute.
		     * * Read the computed `elem.strokeWidth()`.
		     * * Place it based on the stroke width.
		     *
		     * @returns {Number} The stroke width in pixels. Even if the given stroke
		     * widtch (in CSS or by attributes) is based on `em` or other units, the
		     * pixel size is returned.
		     */
		    strokeWidth: function () {
		        var val = this.getStyle('stroke-width'),
		            ret,
		            dummy;

		        // Read pixel values directly
		        if (val.indexOf('px') === val.length - 2) {
		            ret = pInt(val);

		        // Other values like em, pt etc need to be measured
		        } else {
		            dummy = doc.createElementNS(SVG_NS, 'rect');
		            attr(dummy, {
		                'width': val,
		                'stroke-width': 0
		            });
		            this.element.parentNode.appendChild(dummy);
		            ret = dummy.getBBox().width;
		            dummy.parentNode.removeChild(dummy);
		        }
		        return ret;
		    },
    
		    /**
		     * Add an event listener. This is a simple setter that replaces all other
		     * events of the same type, opposed to the {@link Highcharts#addEvent}
		     * function.
		     * @param {string} eventType - The event type. If the type is `click`,
		     *    Highcharts will internally translate it to a `touchstart` event on
		     *    touch devices, to prevent the browser from waiting for a click event
		     *    from firing.
		     * @param {Function} handler - The handler callback.
		     * @returns {SVGElement} The SVGElement for chaining.
		     *
		     * @sample highcharts/members/element-on/
		     *         A clickable rectangle
		     */
		    on: function (eventType, handler) {
		        var svgElement = this,
		            element = svgElement.element;

		        // touch
		        if (hasTouch && eventType === 'click') {
		            element.ontouchstart = function (e) {
		                svgElement.touchEventFired = Date.now(); // #2269
		                e.preventDefault();
		                handler.call(element, e);
		            };
		            element.onclick = function (e) {
		                if (win.navigator.userAgent.indexOf('Android') === -1 ||
		                        Date.now() - (svgElement.touchEventFired || 0) > 1100) {
		                    handler.call(element, e);
		                }
		            };
		        } else {
		            // simplest possible event model for internal use
		            element['on' + eventType] = handler;
		        }
		        return this;
		    },

		    /**
		     * Set the coordinates needed to draw a consistent radial gradient across
		     * a shape regardless of positioning inside the chart. Used on pie slices
		     * to make all the slices have the same radial reference point.
		     *
		     * @param {Array} coordinates The center reference. The format is
		     *    `[centerX, centerY, diameter]` in pixels.
		     * @returns {SVGElement} Returns the SVGElement for chaining.
		     */
		    setRadialReference: function (coordinates) {
		        var existingGradient = this.renderer.gradients[this.element.gradient];

		        this.element.radialReference = coordinates;

		        // On redrawing objects with an existing gradient, the gradient needs
		        // to be repositioned (#3801)
		        if (existingGradient && existingGradient.radAttr) {
		            existingGradient.animate(
		                this.renderer.getRadialAttr(
		                    coordinates,
		                    existingGradient.radAttr
		                )
		            );
		        }

		        return this;
		    },

		    /**
		     * Move an object and its children by x and y values.
		     *
		     * @param {number} x - The x value.
		     * @param {number} y - The y value.
		     */
		    translate: function (x, y) {
		        return this.attr({
		            translateX: x,
		            translateY: y
		        });
		    },

		    /**
		     * Invert a group, rotate and flip. This is used internally on inverted
		     * charts, where the points and graphs are drawn as if not inverted, then
		     * the series group elements are inverted.
		     *
		     * @param  {boolean} inverted
		     *         Whether to invert or not. An inverted shape can be un-inverted by
		     *         setting it to false.
		     * @return {SVGElement}
		     *         Return the SVGElement for chaining.
		     */
		    invert: function (inverted) {
		        var wrapper = this;
		        wrapper.inverted = inverted;
		        wrapper.updateTransform();
		        return wrapper;
		    },

		    /**
		     * Update the transform attribute based on internal properties. Deals with
		     * the custom `translateX`, `translateY`, `rotation`, `scaleX` and `scaleY`
		     * attributes and updates the SVG `transform` attribute.
		     * @private
		     *
		     */
		    updateTransform: function () {
		        var wrapper = this,
		            translateX = wrapper.translateX || 0,
		            translateY = wrapper.translateY || 0,
		            scaleX = wrapper.scaleX,
		            scaleY = wrapper.scaleY,
		            inverted = wrapper.inverted,
		            rotation = wrapper.rotation,
		            matrix = wrapper.matrix,
		            element = wrapper.element,
		            transform;

		        // Flipping affects translate as adjustment for flipping around the
		        // group's axis
		        if (inverted) {
		            translateX += wrapper.width;
		            translateY += wrapper.height;
		        }

		        // Apply translate. Nearly all transformed elements have translation,
		        // so instead of checking for translate = 0, do it always (#1767,
		        // #1846).
		        transform = ['translate(' + translateX + ',' + translateY + ')'];

		        // apply matrix
		        if (defined(matrix)) {
		            transform.push(
		                'matrix(' + matrix.join(',') + ')'
		            );
		        }

		        // apply rotation
		        if (inverted) {
		            transform.push('rotate(90) scale(-1,1)');
		        } else if (rotation) { // text rotation
		            transform.push(
		                'rotate(' + rotation + ' ' +
		                pick(this.rotationOriginX, element.getAttribute('x'), 0) +
		                ' ' +
		                pick(this.rotationOriginY, element.getAttribute('y') || 0) + ')'
		            );
		        }

		        // apply scale
		        if (defined(scaleX) || defined(scaleY)) {
		            transform.push(
		                'scale(' + pick(scaleX, 1) + ' ' + pick(scaleY, 1) + ')'
		            );
		        }

		        if (transform.length) {
		            element.setAttribute('transform', transform.join(' '));
		        }
		    },

		    /**
		     * Bring the element to the front. Alternatively, a new zIndex can be set.
		     *
		     * @returns {SVGElement} Returns the SVGElement for chaining.
		     *
		     * @sample highcharts/members/element-tofront/
		     *         Click an element to bring it to front
		     */
		    toFront: function () {
		        var element = this.element;
		        element.parentNode.appendChild(element);
		        return this;
		    },


		    /**
		     * Align the element relative to the chart or another box.
		     *
		     * @param {Object} [alignOptions] The alignment options. The function can be
		     *   called without this parameter in order to re-align an element after the
		     *   box has been updated.
		     * @param {string} [alignOptions.align=left] Horizontal alignment. Can be
		     *   one of `left`, `center` and `right`.
		     * @param {string} [alignOptions.verticalAlign=top] Vertical alignment. Can
		     *   be one of `top`, `middle` and `bottom`.
		     * @param {number} [alignOptions.x=0] Horizontal pixel offset from
		     *   alignment.
		     * @param {number} [alignOptions.y=0] Vertical pixel offset from alignment.
		     * @param {Boolean} [alignByTranslate=false] Use the `transform` attribute
		     *   with translateX and translateY custom attributes to align this elements
		     *   rather than `x` and `y` attributes.
		     * @param {String|Object} box The box to align to, needs a width and height.
		     *   When the box is a string, it refers to an object in the Renderer. For
		     *   example, when box is `spacingBox`, it refers to `Renderer.spacingBox`
		     *   which holds `width`, `height`, `x` and `y` properties.
		     * @returns {SVGElement} Returns the SVGElement for chaining.
		     */
		    align: function (alignOptions, alignByTranslate, box) {
		        var align,
		            vAlign,
		            x,
		            y,
		            attribs = {},
		            alignTo,
		            renderer = this.renderer,
		            alignedObjects = renderer.alignedObjects,
		            alignFactor,
		            vAlignFactor;

		        // First call on instanciate
		        if (alignOptions) {
		            this.alignOptions = alignOptions;
		            this.alignByTranslate = alignByTranslate;
		            if (!box || isString(box)) {
		                this.alignTo = alignTo = box || 'renderer';
		                // prevent duplicates, like legendGroup after resize
		                erase(alignedObjects, this);
		                alignedObjects.push(this);
		                box = null; // reassign it below
		            }

		        // When called on resize, no arguments are supplied
		        } else {
		            alignOptions = this.alignOptions;
		            alignByTranslate = this.alignByTranslate;
		            alignTo = this.alignTo;
		        }

		        box = pick(box, renderer[alignTo], renderer);

		        // Assign variables
		        align = alignOptions.align;
		        vAlign = alignOptions.verticalAlign;
		        x = (box.x || 0) + (alignOptions.x || 0); // default: left align
		        y = (box.y || 0) + (alignOptions.y || 0); // default: top align

		        // Align
		        if (align === 'right') {
		            alignFactor = 1;
		        } else if (align === 'center') {
		            alignFactor = 2;
		        }
		        if (alignFactor) {
		            x += (box.width - (alignOptions.width || 0)) / alignFactor;
		        }
		        attribs[alignByTranslate ? 'translateX' : 'x'] = Math.round(x);


		        // Vertical align
		        if (vAlign === 'bottom') {
		            vAlignFactor = 1;
		        } else if (vAlign === 'middle') {
		            vAlignFactor = 2;
		        }
		        if (vAlignFactor) {
		            y += (box.height - (alignOptions.height || 0)) / vAlignFactor;
		        }
		        attribs[alignByTranslate ? 'translateY' : 'y'] = Math.round(y);

		        // Animate only if already placed
		        this[this.placed ? 'animate' : 'attr'](attribs);
		        this.placed = true;
		        this.alignAttr = attribs;

		        return this;
		    },

		    /**
		     * Get the bounding box (width, height, x and y) for the element. Generally
		     * used to get rendered text size. Since this is called a lot in charts,
		     * the results are cached based on text properties, in order to save DOM
		     * traffic. The returned bounding box includes the rotation, so for example
		     * a single text line of rotation 90 will report a greater height, and a
		     * width corresponding to the line-height.
		     *
		     * @param {boolean} [reload] Skip the cache and get the updated DOM bouding
		     *   box.
		     * @param {number} [rot] Override the element's rotation. This is internally
		     *   used on axis labels with a value of 0 to find out what the bounding box
		     *   would be have been if it were not rotated.
		     * @returns {Object} The bounding box with `x`, `y`, `width` and `height`
		     * properties.
		     *
		     * @sample highcharts/members/renderer-on-chart/
		     *         Draw a rectangle based on a text's bounding box
		     */
		    getBBox: function (reload, rot) {
		        var wrapper = this,
		            bBox, // = wrapper.bBox,
		            renderer = wrapper.renderer,
		            width,
		            height,
		            rotation,
		            rad,
		            element = wrapper.element,
		            styles = wrapper.styles,
		            fontSize,
		            textStr = wrapper.textStr,
		            toggleTextShadowShim,
		            cache = renderer.cache,
		            cacheKeys = renderer.cacheKeys,
		            cacheKey;

		        rotation = pick(rot, wrapper.rotation);
		        rad = rotation * deg2rad;

        
		        fontSize = element &&
		            SVGElement.prototype.getStyle.call(element, 'font-size');
        

		        // Avoid undefined and null (#7316)
		        if (defined(textStr)) {

		            cacheKey = textStr.toString();

		            // Since numbers are monospaced, and numerical labels appear a lot
		            // in a chart, we assume that a label of n characters has the same
		            // bounding box as others of the same length. Unless there is inner
		            // HTML in the label. In that case, leave the numbers as is (#5899).
		            if (cacheKey.indexOf('<') === -1) {
		                cacheKey = cacheKey.replace(/[0-9]/g, '0');
		            }

		            // Properties that affect bounding box
		            cacheKey += [
		                '',
		                rotation || 0,
		                fontSize,
		                wrapper.textWidth, // #7874, also useHTML
		                styles && styles.textOverflow // #5968
		            ]
		            .join(',');

		        }

		        if (cacheKey && !reload) {
		            bBox = cache[cacheKey];
		        }

		        // No cache found
		        if (!bBox) {

		            // SVG elements
		            if (element.namespaceURI === wrapper.SVG_NS || renderer.forExport) {
		                try { // Fails in Firefox if the container has display: none.

		                    // When the text shadow shim is used, we need to hide the
		                    // fake shadows to get the correct bounding box (#3872)
		                    toggleTextShadowShim = this.fakeTS && function (display) {
		                        each(
		                            element.querySelectorAll(
		                                '.highcharts-text-outline'
		                            ),
		                            function (tspan) {
		                                tspan.style.display = display;
		                            }
		                        );
		                    };

		                    // Workaround for #3842, Firefox reporting wrong bounding
		                    // box for shadows
		                    if (toggleTextShadowShim) {
		                        toggleTextShadowShim('none');
		                    }

		                    bBox = element.getBBox ?
		                        // SVG: use extend because IE9 is not allowed to change
		                        // width and height in case of rotation (below)
		                        extend({}, element.getBBox()) : {

		                            // Legacy IE in export mode
		                            width: element.offsetWidth,
		                            height: element.offsetHeight
		                        };

		                    // #3842
		                    if (toggleTextShadowShim) {
		                        toggleTextShadowShim('');
		                    }
		                } catch (e) {}

		                // If the bBox is not set, the try-catch block above failed. The
		                // other condition is for Opera that returns a width of
		                // -Infinity on hidden elements.
		                if (!bBox || bBox.width < 0) {
		                    bBox = { width: 0, height: 0 };
		                }


		            // VML Renderer or useHTML within SVG
		            } else {

		                bBox = wrapper.htmlGetBBox();

		            }

		            // True SVG elements as well as HTML elements in modern browsers
		            // using the .useHTML option need to compensated for rotation
		            if (renderer.isSVG) {
		                width = bBox.width;
		                height = bBox.height;

		                // Workaround for wrong bounding box in IE, Edge and Chrome on
		                // Windows. With Highcharts' default font, IE and Edge report
		                // a box height of 16.899 and Chrome rounds it to 17. If this
		                // stands uncorrected, it results in more padding added below
		                // the text than above when adding a label border or background.
		                // Also vertical positioning is affected.
		                // http://jsfiddle.net/highcharts/em37nvuj/
		                // (#1101, #1505, #1669, #2568, #6213).
		                if (
		                    styles &&
		                    styles.fontSize === '11px' &&
		                    Math.round(height) === 17
		                ) {
		                    bBox.height = height = 14;
		                }

		                // Adjust for rotated text
		                if (rotation) {
		                    bBox.width = Math.abs(height * Math.sin(rad)) +
		                        Math.abs(width * Math.cos(rad));
		                    bBox.height = Math.abs(height * Math.cos(rad)) +
		                        Math.abs(width * Math.sin(rad));
		                }
		            }

		            // Cache it. When loading a chart in a hidden iframe in Firefox and
		            // IE/Edge, the bounding box height is 0, so don't cache it (#5620).
		            if (cacheKey && bBox.height > 0) {

		                // Rotate (#4681)
		                while (cacheKeys.length > 250) {
		                    delete cache[cacheKeys.shift()];
		                }

		                if (!cache[cacheKey]) {
		                    cacheKeys.push(cacheKey);
		                }
		                cache[cacheKey] = bBox;
		            }
		        }
		        return bBox;
		    },

		    /**
		     * Show the element after it has been hidden.
		     *
		     * @param {boolean} [inherit=false] Set the visibility attribute to
		     * `inherit` rather than `visible`. The difference is that an element with
		     * `visibility="visible"` will be visible even if the parent is hidden.
		     *
		     * @returns {SVGElement} Returns the SVGElement for chaining.
		     */
		    show: function (inherit) {
		        return this.attr({ visibility: inherit ? 'inherit' : 'visible' });
		    },

		    /**
		     * Hide the element, equivalent to setting the `visibility` attribute to
		     * `hidden`.
		     *
		     * @returns {SVGElement} Returns the SVGElement for chaining.
		     */
		    hide: function () {
		        return this.attr({ visibility: 'hidden' });
		    },

		    /**
		     * Fade out an element by animating its opacity down to 0, and hide it on
		     * complete. Used internally for the tooltip.
		     *
		     * @param {number} [duration=150] The fade duration in milliseconds.
		     */
		    fadeOut: function (duration) {
		        var elemWrapper = this;
		        elemWrapper.animate({
		            opacity: 0
		        }, {
		            duration: duration || 150,
		            complete: function () {
		                // #3088, assuming we're only using this for tooltips
		                elemWrapper.attr({ y: -9999 });
		            }
		        });
		    },

		    /**
		     * Add the element to the DOM. All elements must be added this way.
		     *
		     * @param {SVGElement|SVGDOMElement} [parent] The parent item to add it to.
		     *   If undefined, the element is added to the {@link
		     *   Highcharts.SVGRenderer.box}.
		     *
		     * @returns {SVGElement} Returns the SVGElement for chaining.
		     *
		     * @sample highcharts/members/renderer-g - Elements added to a group
		     */
		    add: function (parent) {

		        var renderer = this.renderer,
		            element = this.element,
		            inserted;

		        if (parent) {
		            this.parentGroup = parent;
		        }

		        // mark as inverted
		        this.parentInverted = parent && parent.inverted;

		        // build formatted text
		        if (this.textStr !== undefined) {
		            renderer.buildText(this);
		        }

		        // Mark as added
		        this.added = true;

		        // If we're adding to renderer root, or other elements in the group
		        // have a z index, we need to handle it
		        if (!parent || parent.handleZ || this.zIndex) {
		            inserted = this.zIndexSetter();
		        }

		        // If zIndex is not handled, append at the end
		        if (!inserted) {
		            (parent ? parent.element : renderer.box).appendChild(element);
		        }

		        // fire an event for internal hooks
		        if (this.onAdd) {
		            this.onAdd();
		        }

		        return this;
		    },

		    /**
		     * Removes an element from the DOM.
		     *
		     * @private
		     * @param {SVGDOMElement|HTMLDOMElement} element The DOM node to remove.
		     */
		    safeRemoveChild: function (element) {
		        var parentNode = element.parentNode;
		        if (parentNode) {
		            parentNode.removeChild(element);
		        }
		    },

		    /**
		     * Destroy the element and element wrapper and clear up the DOM and event
		     * hooks.
		     *
		     *
		     */
		    destroy: function () {
		        var wrapper = this,
		            element = wrapper.element || {},
		            parentToClean =
		                wrapper.renderer.isSVG &&
		                element.nodeName === 'SPAN' &&
		                wrapper.parentGroup,
		            grandParent,
		            ownerSVGElement = element.ownerSVGElement,
		            i,
		            clipPath = wrapper.clipPath;

		        // remove events
		        element.onclick = element.onmouseout = element.onmouseover =
		            element.onmousemove = element.point = null;
		        stop(wrapper); // stop running animations

		        if (clipPath && ownerSVGElement) {
		            // Look for existing references to this clipPath and remove them
		            // before destroying the element (#6196).
		            each(
		                // The upper case version is for Edge
		                ownerSVGElement.querySelectorAll('[clip-path],[CLIP-PATH]'),
		                function (el) {
		                    var clipPathAttr = el.getAttribute('clip-path'),
		                        clipPathId = clipPath.element.id;
		                    // Include the closing paranthesis in the test to rule out
		                    // id's from 10 and above (#6550). Edge puts quotes inside
		                    // the url, others not.
		                    if (
		                        clipPathAttr.indexOf('(#' + clipPathId + ')') > -1 ||
		                        clipPathAttr.indexOf('("#' + clipPathId + '")') > -1
		                    ) {
		                        el.removeAttribute('clip-path');
		                    }
		                }
		            );
		            wrapper.clipPath = clipPath.destroy();
		        }

		        // Destroy stops in case this is a gradient object
		        if (wrapper.stops) {
		            for (i = 0; i < wrapper.stops.length; i++) {
		                wrapper.stops[i] = wrapper.stops[i].destroy();
		            }
		            wrapper.stops = null;
		        }

		        // remove element
		        wrapper.safeRemoveChild(element);

        

		        // In case of useHTML, clean up empty containers emulating SVG groups
		        // (#1960, #2393, #2697).
		        while (
		            parentToClean &&
		            parentToClean.div &&
		            parentToClean.div.childNodes.length === 0
		        ) {
		            grandParent = parentToClean.parentGroup;
		            wrapper.safeRemoveChild(parentToClean.div);
		            delete parentToClean.div;
		            parentToClean = grandParent;
		        }

		        // remove from alignObjects
		        if (wrapper.alignTo) {
		            erase(wrapper.renderer.alignedObjects, wrapper);
		        }

		        objectEach(wrapper, function (val, key) {
		            delete wrapper[key];
		        });

		        return null;
		    },

    

		    xGetter: function