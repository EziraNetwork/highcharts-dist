/**
 * @license Highmaps JS v6.1.0-modified (2018-06-16)
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
		console.log(Highcharts)

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
		     * An array containing the default colors for the chart's series. When
		     * all colors are used, new colors are pulled from the start again.
		     *
		     * Default colors can also be set on a series or series.type basis,
		     * see [column.colors](#plotOptions.column.colors),
		     * [pie.colors](#plotOptions.pie.colors).
		     *
		     * In styled mode, the colors option doesn't exist. Instead, colors
		     * are defined in CSS and applied either through series or point class
		     * names, or through the [chart.colorCount](#chart.colorCount) option.
		     *
		     *
		     * ### Legacy
		     *
		     * In Highcharts 3.x, the default colors were:
		     *
		     * <pre>colors: ['#2f7ed8', '#0d233a', '#8bbc21', '#910000', '#1aadce',
		     *     '#492970', '#f28f43', '#77a1e5', '#c42525', '#a6c96a']</pre>
		     *
		     * In Highcharts 2.x, the default colors were:
		     *
		     * <pre>colors: ['#4572A7', '#AA4643', '#89A54E', '#80699B', '#3D96AE',
		     *    '#DB843D', '#92A8CD', '#A47D7C', '#B5CA92']</pre>
		     *
		     * @type {Array<Color>}
		     * @sample {highcharts} highcharts/chart/colors/ Assign a global color theme
		     * @default ["#7cb5ec", "#434348", "#90ed7d", "#f7a35c", "#8085e9",
		     *          "#f15c80", "#e4d354", "#2b908f", "#f45b5b", "#91e8e1"]
		     */
		    colors: '#7cb5ec #434348 #90ed7d #f7a35c #8085e9 #f15c80 #e4d354 #2b908f #f45b5b #91e8e1'.split(' '),
    


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
		        height: null,

        

		        /**
		         * The color of the outer chart border.
		         *
		         * @type {Color}
		         * @see    In styled mode, the stroke is set with the
		         *         `.highcharts-background` class.
		         * @sample {highcharts} highcharts/chart/bordercolor/ Brown border
		         * @sample {highstock} stock/chart/border/ Brown border
		         * @sample {highmaps} maps/chart/border/ Border options
		         * @default #335cad
		         */
		        borderColor: '#335cad',

		        /**
		         * The pixel width of the outer chart border.
		         *
		         * @type {Number}
		         * @see    In styled mode, the stroke is set with the
		         *         `.highcharts-background` class.
		         * @sample {highcharts} highcharts/chart/borderwidth/ 5px border
		         * @sample {highstock} stock/chart/border/
		         *         2px border
		         * @sample {highmaps} maps/chart/border/
		         *         Border options
		         * @default 0
		         * @apioption chart.borderWidth
		         */

		        /**
		         * The background color or gradient for the outer chart area.
		         *
		         * @type {Color}
		         * @see    In styled mode, the background is set with the
		         *         `.highcharts-background` class.
		         * @sample {highcharts} highcharts/chart/backgroundcolor-color/ Color
		         * @sample {highcharts} highcharts/chart/backgroundcolor-gradient/ Gradient
		         * @sample {highstock} stock/chart/backgroundcolor-color/
		         *         Color
		         * @sample {highstock} stock/chart/backgroundcolor-gradient/
		         *         Gradient
		         * @sample {highmaps} maps/chart/backgroundcolor-color/
		         *         Color
		         * @sample {highmaps} maps/chart/backgroundcolor-gradient/
		         *         Gradient
		         * @default #FFFFFF
		         */
		        backgroundColor: '#ffffff',

		        /**
		         * The background color or gradient for the plot area.
		         *
		         * @type {Color}
		         * @see    In styled mode, the plot background is set with the
		         *         `.highcharts-plot-background` class.
		         * @sample {highcharts} highcharts/chart/plotbackgroundcolor-color/
		         *         Color
		         * @sample {highcharts} highcharts/chart/plotbackgroundcolor-gradient/
		         *         Gradient
		         * @sample {highstock} stock/chart/plotbackgroundcolor-color/
		         *         Color
		         * @sample {highstock} stock/chart/plotbackgroundcolor-gradient/
		         *         Gradient
		         * @sample {highmaps} maps/chart/plotbackgroundcolor-color/
		         *         Color
		         * @sample {highmaps} maps/chart/plotbackgroundcolor-gradient/
		         *         Gradient
		         * @default null
		         * @apioption chart.plotBackgroundColor
		         */


		        /**
		         * The URL for an image to use as the plot background. To set an image
		         * as the background for the entire chart, set a CSS background image
		         * to the container element. Note that for the image to be applied to
		         * exported charts, its URL needs to be accessible by the export server.
		         *
		         * @type {String}
		         * @see In styled mode, a plot background image can be set with the
		         * `.highcharts-plot-background` class and a [custom pattern](http://www.
		         * highcharts.com/docs/chart-design-and-style/gradients-shadows-and-
		         * patterns).
		         * @sample {highcharts} highcharts/chart/plotbackgroundimage/ Skies
		         * @sample {highstock} stock/chart/plotbackgroundimage/ Skies
		         * @default null
		         * @apioption chart.plotBackgroundImage
		         */

		        /**
		         * The color of the inner chart or plot area border.
		         *
		         * @type {Color}
		         * @see In styled mode, a plot border stroke can be set with the
		         *      `.highcharts-plot-border` class.
		         * @sample {highcharts} highcharts/chart/plotbordercolor/ Blue border
		         * @sample {highstock} stock/chart/plotborder/ Blue border
		         * @sample {highmaps} maps/chart/plotborder/ Plot border options
		         * @default #cccccc
		         */
		        plotBorderColor: '#cccccc'
        

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

            

		            /**
		             * The color for the active up or down arrow in the legend page
		             * navigation.
		             *
		             * @type {Color}
		             * @see     In styled mode, the active arrow be styled with the
		             *          `.highcharts-legend-nav-active` class.
		             * @sample  {highcharts} highcharts/legend/navigation/
		             *          Legend page navigation demonstrated
		             * @sample  {highstock} highcharts/legend/navigation/
		             *          Legend page navigation demonstrated
		             * @default #003399
		             * @since 2.2.4
		             */
		            activeColor: '#003399',

		            /**
		             * The color of the inactive up or down arrow in the legend page
		             * navigation. .
		             *
		             * @type {Color}
		             * @see In styled mode, the inactive arrow be styled with the
		             *      `.highcharts-legend-nav-inactive` class.
		             * @sample {highcharts} highcharts/legend/navigation/
		             *         Legend page navigation demonstrated
		             * @sample {highstock} highcharts/legend/navigation/
		             *         Legend page navigation demonstrated
		             * @default {highcharts} #cccccc
		             * @default {highstock} #cccccc
		             * @default {highmaps} ##cccccc
		             * @since 2.2.4
		             */
		            inactiveColor: '#cccccc'
            
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
		         * CSS styles for each legend item. Only a subset of CSS is supported,
		         * notably those options related to text. The default `textOverflow`
		         * property makes long texts truncate. Set it to `null` to wrap text
		         * instead. A `width` property can be added to control the text width.
		         *
		         * @type {CSSObject}
		         * @see In styled mode, the legend items can be styled with the
		         * `.highcharts-legend-item` class.
		         * @sample {highcharts} highcharts/legend/itemstyle/ Bold black text
		         * @sample {highmaps} maps/legend/itemstyle/ Item text styles
		         * @default { "color": "#333333", "cursor": "pointer", "fontSize": "12px", "fontWeight": "bold", "textOverflow": "ellipsis" }
		         */
		        itemStyle: {
		            color: '#333333',
		            fontSize: '12px',
		            fontWeight: 'bold',
		            textOverflow: 'ellipsis'
		        },

		        /**
		         * CSS styles for each legend item in hover mode. Only a subset of
		         * CSS is supported, notably those options related to text. Properties
		         * are inherited from `style` unless overridden here.
		         *
		         * @type {CSSObject}
		         * @see In styled mode, the hovered legend items can be styled with
		         * the `.highcharts-legend-item:hover` pesudo-class.
		         * @sample {highcharts} highcharts/legend/itemhoverstyle/ Red on hover
		         * @sample {highmaps} maps/legend/itemstyle/ Item text styles
		         * @default { "color": "#000000" }
		         */
		        itemHoverStyle: {
		            color: '#000000'
		        },

		        /**
		         * CSS styles for each legend item when the corresponding series or
		         * point is hidden. Only a subset of CSS is supported, notably those
		         * options related to text. Properties are inherited from `style`
		         * unless overridden here.
		         *
		         * @type {CSSObject}
		         * @see In styled mode, the hidden legend items can be styled with
		         * the `.highcharts-legend-item-hidden` class.
		         * @sample {highcharts} highcharts/legend/itemhiddenstyle/
		         *         Darker gray color
		         * @default { "color": "#cccccc" }
		         */
		        itemHiddenStyle: {
		            color: '#cccccc'
		        },

		        /**
		         * Whether to apply a drop shadow to the legend. A `backgroundColor`
		         * also needs to be applied for this to take effect. The shadow can be
		         * an object configuration containing `color`, `offsetX`, `offsetY`,
		         * `opacity` and `width`.
		         *
		         * @type {Boolean|Object}
		         * @sample {highcharts} highcharts/legend/shadow/
		         *         White background and drop shadow
		         * @sample {highstock} stock/legend/align/
		         *         Various legend options
		         * @sample {highmaps} maps/legend/border-background/
		         *         Border and background options
		         * @default false
		         */
		        shadow: false,
        

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

            

		            /**
		             * Generic CSS styles for the legend title.
		             *
		             * @type {CSSObject}
		             * @see In styled mode, the legend title is styled with the
		             * `.highcharts-legend-title` class.
		             * @default {"fontWeight":"bold"}
		             * @since 3.0
		             */
		            style: {
		                fontWeight: 'bold'
		            }
            
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
        

		        /**
		         * CSS styles for the loading label `span`.
		         *
		         * @type {CSSObject}
		         * @see In styled mode, the loading label is styled with the
		         * `.highcharts-loading-inner` class.
		         * @sample {highcharts|highmaps} highcharts/loading/labelstyle/ Vertically centered
		         * @sample {highstock} stock/loading/general/ Label styles
		         * @default { "fontWeight": "bold", "position": "relative", "top": "45%" }
		         * @since 1.2.0
		         */
		        labelStyle: {
		            fontWeight: 'bold',
		            position: 'relative',
		            top: '45%'
		        },

		        /**
		         * CSS styles for the loading screen that covers the plot area.
		         *
		         * In styled mode, the loading label is styled with the
		         * `.highcharts-loading` class.
		         *
		         * @type    {CSSObject}
		         * @sample  {highcharts|highmaps} highcharts/loading/style/
		         *          Gray plot area, white text
		         * @sample  {highstock} stock/loading/general/
		         *          Gray plot area, white text
		         * @default { "position": "absolute", "backgroundColor": "#ffffff", "opacity": 0.5, "textAlign": "center" }
		         * @since 1.2.0
		         */
		        style: {
		            position: 'absolute',
		            backgroundColor: '#ffffff',
		            opacity: 0.5,
		            textAlign: 'center'
		        }
        
		    },


		    /**
		     * Options for the tooltip that appears when the user hovers over a
		     * series or point.
		     *
		     */
		    tooltip: {


		        /**
		         