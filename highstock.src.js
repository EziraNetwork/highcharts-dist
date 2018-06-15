/**
 * @license Highstock JS v6.1.0-modified (2018-06-15)
 *
 * (c) 2009-2016 Torstein Honsi
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
		    product: 'Highstock',
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

                    
		                    // Let the shadow follow the main element
		                    if (
		                        this.shadows &&
		                        /^(width|height|visibility|x|y|d|transform|cx|cy|r)$/
		                            .test(key)
		                    ) {
		                        this.updateShadows(key, val, setter);
		                    }
                    
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
		     * Update the shadow elements with new attributes.
		     *
		     * @private
		     * @param {String} key - The attribute name.
		     * @param {String|Number} value - The value of the attribute.
		     * @param {Function} setter - The setter function, inherited from the
		     *   parent wrapper
		     *
		     */
		    updateShadows: function (key, value, setter) {
		        var shadows = this.shadows,
		            i = shadows.length;

		        while (i--) {
		            setter.call(
		                shadows[i],
		                key === 'height' ?
		                    Math.max(value - (shadows[i].cutHeight || 0), 0) :
		                    key === 'd' ? this.d : value,
		                key,
		                shadows[i]
		            );
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
		     * Get the current stroke width. In classic mode, the setter registers it
		     * directly on the element.
		     * @returns {number} The stroke width in pixels.
		     * @ignore
		     */
		    strokeWidth: function () {
		        return this['stroke-width'] || 0;
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

        
		        fontSize = styles && styles.fontSize;
        

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

        
		        wrapper.destroyShadows();
        

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

    
		    /**
		     * @typedef {Object} ShadowOptions
		     * @property {string} [color=#000000] The shadow color.
		     * @property {number} [offsetX=1] The horizontal offset from the element.
		     * @property {number} [offsetY=1] The vertical offset from the element.
		     * @property {number} [opacity=0.15] The shadow opacity.
		     * @property {number} [width=3] The shadow width or distance from the
		     *    element.
		     */
		    /**
		     * Add a shadow to the element. Must be called after the element is added to
		     * the DOM. In styled mode, this method is not used, instead use `defs` and
		     * filters.
		     *
		     * @param {boolean|ShadowOptions} shadowOptions The shadow options. If
		     *    `true`, the default options are applied. If `false`, the current
		     *    shadow will be removed.
		     * @param {SVGElement} [group] The SVG group element where the shadows will
		     *    be applied. The default is to add it to the same parent as the current
		     *    element. Internally, this is ised for pie slices, where all the
		     *    shadows are added to an element behind all the slices.
		     * @param {boolean} [cutOff] Used internally for column shadows.
		     *
		     * @returns {SVGElement} Returns the SVGElement for chaining.
		     *
		     * @example
		     * renderer.rect(10, 100, 100, 100)
		     *     .attr({ fill: 'red' })
		     *     .shadow(true);
		     */
		    shadow: function (shadowOptions, group, cutOff) {
		        var shadows = [],
		            i,
		            shadow,
		            element = this.element,
		            strokeWidth,
		            shadowWidth,
		            shadowElementOpacity,

		            // compensate for inverted plot area
		            transform;

		        if (!shadowOptions) {
		            this.destroyShadows();

		        } else if (!this.shadows) {
		            shadowWidth = pick(shadowOptions.width, 3);
		            shadowElementOpacity = (shadowOptions.opacity || 0.15) /
		                shadowWidth;
		            transform = this.parentInverted ?
		                    '(-1,-1)' :
		                    '(' + pick(shadowOptions.offsetX, 1) + ', ' +
		                        pick(shadowOptions.offsetY, 1) + ')';
		            for (i = 1; i <= shadowWidth; i++) {
		                shadow = element.cloneNode(0);
		                strokeWidth = (shadowWidth * 2) + 1 - (2 * i);
		                attr(shadow, {
		                    'isShadow': 'true',
		                    'stroke':
		                        shadowOptions.color || '#000000',
		                    'stroke-opacity': shadowElementOpacity * i,
		                    'stroke-width': strokeWidth,
		                    'transform': 'translate' + transform,
		                    'fill': 'none'
		                });
		                if (cutOff) {
		                    attr(
		                        shadow,
		                        'height',
		                        Math.max(attr(shadow, 'height') - strokeWidth, 0)
		                    );
		                    shadow.cutHeight = strokeWidth;
		                }

		                if (group) {
		                    group.element.appendChild(shadow);
		                } else if (element.parentNode) {
		                    element.parentNode.insertBefore(shadow, element);
		                }

		                shadows.push(shadow);
		            }

		            this.shadows = shadows;
		        }
		        return this;

		    },

		    /**
		     * Destroy shadows on the element.
		     * @private
		     */
		    destroyShadows: function () {
		        each(this.shadows || [], function (shadow) {
		            this.safeRemoveChild(shadow);
		        }, this);
		        this.shadows = undefined;
		    },

    

		    xGetter: function (key) {
		        if (this.element.nodeName === 'circle') {
		            if (key === 'x') {
		                key = 'cx';
		            } else if (key === 'y') {
		                key = 'cy';
		            }
		        }
		        return this._defaultGetter(key);
		    },

		    /**
		     * Get the current value of an attribute or pseudo attribute, used mainly
		     * for animation. Called internally from the {@link
		     * Highcharts.SVGRenderer#attr}
		     * function.
		     *
		     * @private
		     */
		    _defaultGetter: function (key) {
		        var ret = pick(
		            this[key + 'Value'], // align getter
		            this[key],
		            this.element ? this.element.getAttribute(key) : null,
		            0
		        );

		        if (/^[\-0-9\.]+$/.test(ret)) { // is numerical
		            ret = parseFloat(ret);
		        }
		        return ret;
		    },


		    dSetter: function (value, key, element) {
		        if (value && value.join) { // join path
		            value = value.join(' ');
		        }
		        if (/(NaN| {2}|^$)/.test(value)) {
		            value = 'M 0 0';
		        }

		        // Check for cache before resetting. Resetting causes disturbance in the
		        // DOM, causing flickering in some cases in Edge/IE (#6747). Also
		        // possible performance gain.
		        if (this[key] !== value) {
		            element.setAttribute(key, value);
		            this[key] = value;
		        }

		    },
    
		    dashstyleSetter: function (value) {
		        var i,
		            strokeWidth = this['stroke-width'];

		        // If "inherit", like maps in IE, assume 1 (#4981). With HC5 and the new
		        // strokeWidth function, we should be able to use that instead.
		        if (strokeWidth === 'inherit') {
		            strokeWidth = 1;
		        }
		        value = value && value.toLowerCase();
		        if (value) {
		            value = value
		                .replace('shortdashdotdot', '3,1,1,1,1,1,')
		                .replace('shortdashdot', '3,1,1,1')
		                .replace('shortdot', '1,1,')
		                .replace('shortdash', '3,1,')
		                .replace('longdash', '8,3,')
		                .replace(/dot/g, '1,3,')
		                .replace('dash', '4,3,')
		                .replace(/,$/, '')
		                .split(','); // ending comma

		            i = value.length;
		            while (i--) {
		                value[i] = pInt(value[i]) * strokeWidth;
		            }
		            value = value.join(',')
		                .replace(/NaN/g, 'none'); // #3226
		            this.element.setAttribute('stroke-dasharray', value);
		        }
		    },
    
		    alignSetter: function (value) {
		        var convert = { left: 'start', center: 'middle', right: 'end' };
		        this.alignValue = value;
		        this.element.setAttribute('text-anchor', convert[value]);
		    },
		    opacitySetter: function (value, key, element) {
		        this[key] = value;
		        element.setAttribute(key, value);
		    },
		    titleSetter: function (value) {
		        var titleNode = this.element.getElementsByTagName('title')[0];
		        if (!titleNode) {
		            titleNode = doc.createElementNS(this.SVG_NS, 'title');
		            this.element.appendChild(titleNode);
		        }

		        // Remove text content if it exists
		        if (titleNode.firstChild) {
		            titleNode.removeChild(titleNode.firstChild);
		        }

		        titleNode.appendChild(
		            doc.createTextNode(
		                // #3276, #3895
		                (String(pick(value), ''))
		                    .replace(/<[^>]*>/g, '')
		                    .replace(/&lt;/g, '<')
		                    .replace(/&gt;/g, '>')
		            )
		        );
		    },
		    textSetter: function (value) {
		        if (value !== this.textStr) {
		            // Delete bBox memo when the text changes
		            delete this.bBox;

		            this.textStr = value;
		            if (this.added) {
		                this.renderer.buildText(this);
		            }
		        }
		    },
		    fillSetter: function (value, key, element) {
		        if (typeof value === 'string') {
		            element.setAttribute(key, value);
		        } else if (value) {
		            this.complexColor(value, key, element);
		        }
		    },
		    visibilitySetter: function (value, key, element) {
		        // IE9-11 doesn't handle visibilty:inherit well, so we remove the
		        // attribute instead (#2881, #3909)
		        if (value === 'inherit') {
		            element.removeAttribute(key);
		        } else if (this[key] !== value) { // #6747
		            element.setAttribute(key, value);
		        }
		        this[key] = value;
		    },
		    zIndexSetter: function (value, key) {
		        var renderer = this.renderer,
		            parentGroup = this.parentGroup,
		            parentWrapper = parentGroup || renderer,
		            parentNode = parentWrapper.element || renderer.box,
		            childNodes,
		            otherElement,
		            otherZIndex,
		            element = this.element,
		            inserted,
		            undefinedOtherZIndex,
		            svgParent = parentNode === renderer.box,
		            run = this.added,
		            i;

		        if (defined(value)) {
		            // So we can read it for other elements in the group
		            element.setAttribute('data-z-index', value);

		            value = +value;
		            if (this[key] === value) { // Only update when needed (#3865)
		                run = false;
		            }
		        } else if (defined(this[key])) {
		            element.removeAttribute('data-z-index');
		        }

		        this[key] = value;

		        // Insert according to this and other elements' zIndex. Before .add() is
		        // called, nothing is done. Then on add, or by later calls to
		        // zIndexSetter, the node is placed on the right place in the DOM.
		        if (run) {
		            value = this.zIndex;

		            if (value && parentGroup) {
		                parentGroup.handleZ = true;
		            }

		            childNodes = parentNode.childNodes;
		            for (i = childNodes.length - 1; i >= 0 && !inserted; i--) {
		                otherElement = childNodes[i];
		                otherZIndex = otherElement.getAttribute('data-z-index');
		                undefinedOtherZIndex = !defined(otherZIndex);

		                if (otherElement !== element) {
		                    if (
		                        // Negative zIndex versus no zIndex:
		                        // On all levels except the highest. If the parent is
		                        // <svg>, then we don't want to put items before <desc>
		                        // or <defs>
		                        (value < 0 && undefinedOtherZIndex && !svgParent && !i)
		                    ) {
		                        parentNode.insertBefore(element, childNodes[i]);
		                        inserted = true;
		                    } else if (
		                        // Insert after the first element with a lower zIndex
		                        pInt(otherZIndex) <= value ||
		                        // If negative zIndex, add this before first undefined
		                        // zIndex element
		                        (
		                            undefinedOtherZIndex &&
		                            (!defined(value) || value >= 0)
		                        )
		                    ) {
		                        parentNode.insertBefore(
		                            element,
		                            childNodes[i + 1] || null // null for oldIE export
		                        );
		                        inserted = true;
		                    }
		                }
		            }

		            if (!inserted) {
		                parentNode.insertBefore(
		                    element,
		                    childNodes[svgParent ? 3 : 0] || null // null for oldIE
		                );
		                inserted = true;
		            }
		        }
		        return inserted;
		    },
		    _defaultSetter: function (value, key, element) {
		        element.setAttribute(key, value);
		    }
		});

		// Some shared setters and getters
		SVGElement.prototype.yGetter =
		SVGElement.prototype.xGetter;
		SVGElement.prototype.translateXSetter =
		SVGElement.prototype.translateYSetter =
		SVGElement.prototype.rotationSetter =
		SVGElement.prototype.verticalAlignSetter =
		SVGElement.prototype.rotationOriginXSetter =
		SVGElement.prototype.rotationOriginYSetter =
		SVGElement.prototype.scaleXSetter =
		SVGElement.prototype.scaleYSetter =
		SVGElement.prototype.matrixSetter = function (value, key) {
		    this[key] = value;
		    this.doTransform = true;
		};


		// WebKit and Batik have problems with a stroke-width of zero, so in this case
		// we remove the stroke attribute altogether. #1270, #1369, #3065, #3072.
		SVGElement.prototype['stroke-widthSetter'] =
		SVGElement.prototype.strokeSetter = function (value, key, element) {
		    this[key] = value;
		    // Only apply the stroke attribute if the stroke width is defined and larger
		    // than 0
		    if (this.stroke && this['stroke-width']) {
		        // Use prototype as instance may be overridden
		        SVGElement.prototype.fillSetter.call(
		            this,
		            this.stroke,
		            'stroke',
		            element
		        );

		        element.setAttribute('stroke-width', this['stroke-width']);
		        this.hasStroke = true;
		    } else if (key === 'stroke-width' && value === 0 && this.hasStroke) {
		        element.removeAttribute('stroke');
		        this.hasStroke = false;
		    }
		};


		/**
		 * Allows direct access to the Highcharts rendering layer in order to draw
		 * primitive shapes like circles, rectangles, paths or text directly on a chart,
		 * or independent from any chart. The SVGRenderer represents a wrapper object
		 * for SVG in modern browsers. Through the VMLRenderer, part of the `oldie.js`
		 * module, it also brings vector graphics to IE <= 8.
		 *
		 * An existing chart's renderer can be accessed through {@link Chart.renderer}.
		 * The renderer can also be used completely decoupled from a chart.
		 *
		 * @param {HTMLDOMElement} container - Where to put the SVG in the web page.
		 * @param {number} width - The width of the SVG.
		 * @param {number} height - The height of the SVG.
		 * @param {boolean} [forExport=false] - Whether the rendered content is intended
		 *   for export.
		 * @param {boolean} [allowHTML=true] - Whether the renderer is allowed to
		 *   include HTML text, which will be projected on top of the SVG.
		 *
		 * @example
		 * // Use directly without a chart object.
		 * var renderer = new Highcharts.Renderer(parentNode, 600, 400);
		 *
		 * @sample highcharts/members/renderer-on-chart
		 *         Annotating a chart programmatically.
		 * @sample highcharts/members/renderer-basic
		 *         Independent SVG drawing.
		 *
		 * @class Highcharts.SVGRenderer
		 */
		SVGRenderer = H.SVGRenderer = function () {
		    this.init.apply(this, arguments);
		};
		extend(SVGRenderer.prototype, /** @lends Highcharts.SVGRenderer.prototype */ {
		    /**
		     * A pointer to the renderer's associated Element class. The VMLRenderer
		     * will have a pointer to VMLElement here.
		     * @type {SVGElement}
		     */
		    Element: SVGElement,
		    SVG_NS: SVG_NS,
		    /**
		     * Initialize the SVGRenderer. Overridable initiator function that takes
		     * the same parameters as the constructor.
		     */
		    init: function (container, width, height, style, forExport, allowHTML) {
		        var renderer = this,
		            boxWrapper,
		            element,
		            desc;

		        boxWrapper = renderer.createElement('svg')
		            .attr({
		                'version': '1.1',
		                'class': 'highcharts-root'
		            })
            
		            .css(this.getStyle(style))
		            ;
		        element = boxWrapper.element;
		        container.appendChild(element);

		        // Always use ltr on the container, otherwise text-anchor will be
		        // flipped and text appear outside labels, buttons, tooltip etc (#3482)
		        attr(container, 'dir', 'ltr');

		        // For browsers other than IE, add the namespace attribute (#1978)
		        if (container.innerHTML.indexOf('xmlns') === -1) {
		            attr(element, 'xmlns', this.SVG_NS);
		        }

		        // object properties
		        renderer.isSVG = true;

		        /**
		         * The root `svg` node of the renderer.
		         * @name box
		         * @memberOf SVGRenderer
		         * @type {SVGDOMElement}
		         */
		        this.box = element;
		        /**
		         * The wrapper for the root `svg` node of the renderer.
		         *
		         * @name boxWrapper
		         * @memberOf SVGRenderer
		         * @type {SVGElement}
		         */
		        this.boxWrapper = boxWrapper;
		        renderer.alignedObjects = [];

		        /**
		         * Page url used for internal references.
		         * @type {string}
		         */
		        // #24, #672, #1070
		        this.url = (
		                (isFirefox || isWebKit) &&
		                doc.getElementsByTagName('base').length
		            ) ?
		                win.location.href
		                    .replace(/#.*?$/, '') // remove the hash
		                    .replace(/<[^>]*>/g, '') // wing cut HTML
		                    // escape parantheses and quotes
		                    .replace(/([\('\)])/g, '\\$1')
		                    // replace spaces (needed for Safari only)
		                    .replace(/ /g, '%20') :
		                '';

		        // Add description
		        desc = this.createElement('desc').add();
		        desc.element.appendChild(
		            doc.createTextNode('Created with Highstock 6.1.0-modified')
		        );

		        /**
		         * A pointer to the `defs` node of the root SVG.
		         * @type {SVGElement}
		         * @name defs
		         * @memberOf SVGRenderer
		         */
		        renderer.defs = this.createElement('defs').add();
		        renderer.allowHTML = allowHTML;
		        renderer.forExport = forExport;
		        renderer.gradients = {}; // Object where gradient SvgElements are stored
		        renderer.cache = {}; // Cache for numerical bounding boxes
		        renderer.cacheKeys = [];
		        renderer.imgCount = 0;

		        renderer.setSize(width, height, false);



		        // Issue 110 workaround:
		        // In Firefox, if a div is positioned by percentage, its pixel position
		        // may land between pixels. The container itself doesn't display this,
		        // but an SVG element inside this container will be drawn at subpixel
		        // precision. In order to draw sharp lines, this must be compensated
		        // for. This doesn't seem to work inside iframes though (like in
		        // jsFiddle).
		        var subPixelFix, rect;
		        if (isFirefox && container.getBoundingClientRect) {
		            subPixelFix = function () {
		                css(container, { left: 0, top: 0 });
		                rect = container.getBoundingClientRect();
		                css(container, {
		                    left: (Math.ceil(rect.left) - rect.left) + 'px',
		                    top: (Math.ceil(rect.top) - rect.top) + 'px'
		                });
		            };

		            // run the fix now
		            subPixelFix();

		            // run it on resize
		            renderer.unSubPixelFix = addEvent(win, 'resize', subPixelFix);
		        }
		    },
    

    
		    /**
		     * Get the global style setting for the renderer.
		     * @private
		     * @param  {CSSObject} style - Style settings.
		     * @return {CSSObject} The style settings mixed with defaults.
		     */
		    getStyle: function (style) {
		        this.style = extend({

		            fontFamily: '"Lucida Grande", "Lucida Sans Unicode", ' +
		                'Arial, Helvetica, sans-serif',
		            fontSize: '12px'

		        }, style);
		        return this.style;
		    },
		    /**
		     * Apply the global style on the renderer, mixed with the default styles.
		     *
		     * @param {CSSObject} style - CSS to apply.
		     */
		    setStyle: function (style) {
		        this.boxWrapper.css(this.getStyle(style));
		    },
    

		    /**
		     * Detect whether the renderer is hidden. This happens when one of the
		     * parent elements has `display: none`. Used internally to detect when we
		     * needto render preliminarily in another div to get the text bounding boxes
		     * right.
		     *
		     * @returns {boolean} True if it is hidden.
		     */
		    isHidden: function () { // #608
		        return !this.boxWrapper.getBBox().width;
		    },

		    /**
		     * Destroys the renderer and its allocated members.
		     */
		    destroy: function () {
		        var renderer = this,
		            rendererDefs = renderer.defs;
		        renderer.box = null;
		        renderer.boxWrapper = renderer.boxWrapper.destroy();

		        // Call destroy on all gradient elements
		        destroyObjectProperties(renderer.gradients || {});
		        renderer.gradients = null;

		        // Defs are null in VMLRenderer
		        // Otherwise, destroy them here.
		        if (rendererDefs) {
		            renderer.defs = rendererDefs.destroy();
		        }

		        // Remove sub pixel fix handler (#982)
		        if (renderer.unSubPixelFix) {
		            renderer.unSubPixelFix();
		        }

		        renderer.alignedObjects = null;

		        return null;
		    },

		    /**
		     * Create a wrapper for an SVG element. Serves as a factory for
		     * {@link SVGElement}, but this function is itself mostly called from
		     * primitive factories like {@link SVGRenderer#path}, {@link
		     * SVGRenderer#rect} or {@link SVGRenderer#text}.
		     *
		     * @param {string} nodeName - The node name, for example `rect`, `g` etc.
		     * @returns {SVGElement} The generated SVGElement.
		     */
		    createElement: function (nodeName) {
		        var wrapper = new this.Element();
		        wrapper.init(this, nodeName);
		        return wrapper;
		    },

		    /**
		     * Dummy function for plugins, called every time the renderer is updated.
		     * Prior to Highcharts 5, this was used for the canvg renderer.
		     * @function
		     */
		    draw: noop,

		    /**
		     * Get converted radial gradient attributes according to the radial
		     * reference. Used internally from the {@link SVGElement#colorGradient}
		     * function.
		     *
		     * @private
		     */
		    getRadialAttr: function (radialReference, gradAttr) {
		        return {
		            cx: (radialReference[0] - radialReference[2] / 2) +
		                gradAttr.cx * radialReference[2],
		            cy: (radialReference[1] - radialReference[2] / 2) +
		                gradAttr.cy * radialReference[2],
		            r: gradAttr.r * radialReference[2]
		        };
		    },

		    /**
		     * Extendable function to measure the tspan width.
		     *
		     * @private
		     */
		    getSpanWidth: function (wrapper) {
		        return wrapper.getBBox(true).width;
		    },

		    applyEllipsis: function (wrapper, tspan, text, width) {
		        var renderer = this,
		            rotation = wrapper.rotation,
		            str = text,
		            currentIndex,
		            minIndex = 0,
		            maxIndex = text.length,
		            updateTSpan = function (s) {
		                tspan.removeChild(tspan.firstChild);
		                if (s) {
		                    tspan.appendChild(doc.createTextNode(s));
		                }
		            },
		            actualWidth,
		            wasTooLong;
		        wrapper.rotation = 0; // discard rotation when computing box
		        actualWidth = renderer.getSpanWidth(wrapper, tspan);
		        wasTooLong = actualWidth > width;
		        if (wasTooLong) {
		            while (minIndex <= maxIndex) {
		                currentIndex = Math.ceil((minIndex + maxIndex) / 2);
		                str = text.substring(0, currentIndex) + '\u2026';
		                updateTSpan(str);
		                actualWidth = renderer.getSpanWidth(wrapper, tspan);
		                if (minIndex === maxIndex) {
		                    // Complete
		                    minIndex = maxIndex + 1;
		                } else if (actualWidth > width) {
		                    // Too large. Set max index to current.
		                    maxIndex = currentIndex - 1;
		                } else {
		                    // Within width. Set min index to current.
		                    minIndex = currentIndex;
		                }
		            }
		            // If max index was 0 it means just ellipsis was also to large.
		            if (maxIndex === 0) {
		                // Remove ellipses.
		                updateTSpan('');
		            }
		        }
		        wrapper.rotation = rotation; // Apply rotation again.
		        return wasTooLong;
		    },

		    /**
		     * A collection of characters mapped to HTML entities. When `useHTML` on an
		     * element is true, these entities will be rendered correctly by HTML. In
		     * the SVG pseudo-HTML, they need to be unescaped back to simple characters,
		     * so for example `&lt;` will render as `<`.
		     *
		     * @example
		     * // Add support for unescaping quotes
		     * Highcharts.SVGRenderer.prototype.escapes['"'] = '&quot;';
		     *
		     * @type {Object}
		     */
		    escapes: {
		        '&': '&amp;',
		        '<': '&lt;',
		        '>': '&gt;',
		        "'": '&#39;', // eslint-disable-line quotes
		        '"': '&quot;'
		    },

		    /**
		     * Parse a simple HTML string into SVG tspans. Called internally when text
		     *   is set on an SVGElement. The function supports a subset of HTML tags,
		     *   CSS text features like `width`, `text-overflow`, `white-space`, and
		     *   also attributes like `href` and `style`.
		     * @private
		     * @param {SVGElement} wrapper The parent SVGElement.
		     */
		    buildText: function (wrapper) {
		        var textNode = wrapper.element,
		            renderer = this,
		            forExport = renderer.forExport,
		            textStr = pick(wrapper.textStr, '').toString(),
		            hasMarkup = textStr.indexOf('<') !== -1,
		            lines,
		            childNodes = textNode.childNodes,
		            wasTooLong,
		            parentX = attr(textNode, 'x'),
		            textStyles = wrapper.styles,
		            width = wrapper.textWidth,
		            textLineHeight = textStyles && textStyles.lineHeight,
		            textOutline = textStyles && textStyles.textOutline,
		            ellipsis = textStyles && textStyles.textOverflow === 'ellipsis',
		            noWrap = textStyles && textStyles.whiteSpace === 'nowrap',
		            fontSize = textStyles && textStyles.fontSize,
		            textCache,
		            isSubsequentLine,
		            i = childNodes.length,
		            tempParent = width && !wrapper.added && this.box,
		            getLineHeight = function (tspan) {
		                var fontSizeStyle;
                
		                fontSizeStyle = /(px|em)$/.test(tspan && tspan.style.fontSize) ?
		                    tspan.style.fontSize :
		                    (fontSize || renderer.style.fontSize || 12);
                

		                return textLineHeight ?
		                    pInt(textLineHeight) :
		                    renderer.fontMetrics(
		                        fontSizeStyle,
		                        // Get the computed size from parent if not explicit
		                        tspan.getAttribute('style') ? tspan : textNode
		                    ).h;
		            },
		            unescapeEntities = function (inputStr, except) {
		                objectEach(renderer.escapes, function (value, key) {
		                    if (!except || inArray(value, except) === -1) {
		                        inputStr = inputStr.toString().replace(
		                            new RegExp(value, 'g'), // eslint-disable-line security/detect-non-literal-regexp
		                            key
		                        );
		                    }
		                });
		                return inputStr;
		            },
		            parseAttribute = function (s, attr) {
		                var start,
		                    delimiter;

		                start = s.indexOf('<');
		                s = s.substring(start, s.indexOf('>') - start);

		                start = s.indexOf(attr + '=');
		                if (start !== -1) {
		                    start = start + attr.length + 1;
		                    delimiter = s.charAt(start);
		                    if (delimiter === '"' || delimiter === "'") { // eslint-disable-line quotes
		                        s = s.substring(start + 1);
		                        return s.substring(0, s.indexOf(delimiter));
		                    }
		                }
		            };

		        // The buildText code is quite heavy, so if we're not changing something
		        // that affects the text, skip it (#6113).
		        textCache = [
		            textStr,
		            ellipsis,
		            noWrap,
		            textLineHeight,
		            textOutline,
		            fontSize,
		            width
		        ].join(',');
		        if (textCache === wrapper.textCache) {
		            return;
		        }
		        wrapper.textCache = textCache;

		        // Remove old text
		        while (i--) {
		            textNode.removeChild(childNodes[i]);
		        }

		        // Skip tspans, add text directly to text node. The forceTSpan is a hook
		        // used in text outline hack.
		        if (
		            !hasMarkup &&
		            !textOutline &&
		            !ellipsis &&
		            !width &&
		            textStr.indexOf(' ') === -1
		        ) {
		            textNode.appendChild(doc.createTextNode(unescapeEntities(textStr)));

		        // Complex strings, add more logic
		        } else {

		            if (tempParent) {
		                // attach it to the DOM to read offset width
		                tempParent.appendChild(textNode);
		            }

		            if (hasMarkup) {
		                lines = textStr
                    
		                    .replace(/<(b|strong)>/g, '<span style="font-weight:bold">')
		                    .replace(/<(i|em)>/g, '<span style="font-style:italic">')
                    
		                    .replace(/<a/g, '<span')
		                    .replace(/<\/(b|strong|i|em|a)>/g, '</span>')
		                    .split(/<br.*?>/g);

		            } else {
		                lines = [textStr];
		            }


		            // Trim empty lines (#5261)
		            lines = grep(lines, function (line) {
		                return line !== '';
		            });


		            // build the lines
		            each(lines, function buildTextLines(line, lineNo) {
		                var spans,
		                    spanNo = 0;
		                line = line
		                    // Trim to prevent useless/costly process on the spaces
		                    // (#5258)
		                    .replace(/^\s+|\s+$/g, '')
		                    .replace(/<span/g, '|||<span')
		                    .replace(/<\/span>/g, '</span>|||');
		                spans = line.split('|||');

		                each(spans, function buildTextSpans(span) {
		                    if (span !== '' || spans.length === 1) {
		                        var attributes = {},
		                            tspan = doc.createElementNS(
		                                renderer.SVG_NS,
		                                'tspan'
		                            ),
		                            classAttribute,
		                            styleAttribute, // #390
		                            hrefAttribute;

		                        classAttribute = parseAttribute(span, 'class');
		                        if (classAttribute) {
		                            attr(tspan, 'class', classAttribute);
		                        }

		                        styleAttribute = parseAttribute(span, 'style');
		                        if (styleAttribute) {
		                            styleAttribute = styleAttribute.replace(
		                                /(;| |^)color([ :])/,
		                                '$1fill$2'
		                            );
		                            attr(tspan, 'style', styleAttribute);
		                        }

		                        // Not for export - #1529
		                        hrefAttribute = parseAttribute(span, 'href');
		                        if (hrefAttribute && !forExport) {
		                            attr(
		                                tspan,
		                                'onclick',
		                                'location.href=\"' + hrefAttribute + '\"'
		                            );
		                            attr(tspan, 'class', 'highcharts-anchor');
                            
		                            css(tspan, { cursor: 'pointer' });
                            
		                        }

		                        // Strip away unsupported HTML tags (#7126)
		                        span = unescapeEntities(
		                            span.replace(/<[a-zA-Z\/](.|\n)*?>/g, '') || ' '
		                        );

		                        // Nested tags aren't supported, and cause crash in
		                        // Safari (#1596)
		                        if (span !== ' ') {

		                            // add the text node
		                            tspan.appendChild(doc.createTextNode(span));

		                            // First span in a line, align it to the left
		                            if (!spanNo) {
		                                if (lineNo && parentX !== null) {
		                                    attributes.x = parentX;
		                                }
		                            } else {
		                                attributes.dx = 0; // #16
		                            }

		                            // add attributes
		                            attr(tspan, attributes);

		                            // Append it
		                            textNode.appendChild(tspan);

		                            // first span on subsequent line, add the line
		                            // height
		                            if (!spanNo && isSubsequentLine) {

		                                // allow getting the right offset height in
		                                // exporting in IE
		                                if (!svg && forExport) {
		                                    css(tspan, { display: 'block' });
		                                }

		                                // Set the line height based on the font size of
		                                // either the text element or the tspan element
		                                attr(
		                                    tspan,
		                                    'dy',
		                                    getLineHeight(tspan)
		                                );
		                            }

		                            /*
		                            // Experimental text wrapping based on
		                            // getSubstringLength
		                            if (width) {
		                                var spans = renderer.breakText(wrapper, width);

		                                each(spans, function (span) {

		                                    var dy = getLineHeight(tspan);
		                                    tspan = doc.createElementNS(
		                                        SVG_NS,
		                                        'tspan'
		                                    );
		                                    tspan.appendChild(
		                                        doc.createTextNode(span)
		                                    );
		                                    attr(tspan, {
		                                        dy: dy,
		                                        x: parentX
		                                    });
		                                    if (spanStyle) { // #390
		                                        attr(tspan, 'style', spanStyle);
		                                    }
		                                    textNode.appendChild(tspan);
		                                });

		                            }
		                            // */

		                            // Check width and apply soft breaks or ellipsis
		                            if (width) {
		                                var words = span.replace(
		                                        /([^\^])-/g,
		                                        '$1- '
		                                    ).split(' '), // #1273
		                                    hasWhiteSpace = (
		                                        spans.length > 1 ||
		                                        lineNo ||
		                                        (words.length > 1 && !noWrap)
		                                    ),
		                                    tooLong,
		                                    rest = [],
		                                    actualWidth,
		                                    dy = getLineHeight(tspan),
		                                    rotation = wrapper.rotation;

		                                if (ellipsis) {
		                                    wasTooLong = renderer.applyEllipsis(
		                                        wrapper,
		                                        tspan,
		                                        span,
		                                        width
		                                    );
		                                }

		                                while (
		                                    !ellipsis &&
		                                    hasWhiteSpace &&
		                                    (words.length || rest.length)
		                                ) {
		                                    // discard rotation when computing box
		                                    wrapper.rotation = 0;
		                                    actualWidth = renderer.getSpanWidth(
		                                        wrapper,
		                                        tspan
		                                    );
		                                    tooLong = actualWidth > width;

		                                    // For ellipsis, do a binary search for the
		                                    // correct string length
		                                    if (wasTooLong === undefined) {
		                                        wasTooLong = tooLong; // First time
		                                    }

		                                    // Looping down, this is the first word
		                                    // sequence that is not too long, so we can
		                                    // move on to build the next line.
		                                    if (!tooLong || words.length === 1) {
		                                        words = rest;
		                                        rest = [];

		                                        if (words.length && !noWrap) {
		                                            tspan = doc.createElementNS(
		                                                SVG_NS,
		                                                'tspan'
		                                            );
		                                            attr(tspan, {
		                                                dy: dy,
		                                                x: parentX
		                                            });
		                                            if (styleAttribute) { // #390
		                                                attr(
		                                                    tspan,
		                                                    'style',
		                                                    styleAttribute
		                                                );
		                                            }
		                                            textNode.appendChild(tspan);
		                                        }

		                                        // a single word is pressing it out
		                                        if (actualWidth > width) {
		                                            // one more pixel for Chrome, #3158
		                                            width = actualWidth + 1;
		                                        }
		                                    } else { // append to existing line tspan
		                                        tspan.removeChild(tspan.firstChild);
		                                        rest.unshift(words.pop());
		                                    }
		                                    if (words.length) {
		                                        tspan.appendChild(
		                                            doc.createTextNode(
		                                                words.join(' ')
		                                                    .replace(/- /g, '-')
		                                            )
		                                        );
		                                    }
		                                }
		                                wrapper.rotation = rotation;
		                            }

		                            spanNo++;
		                        }
		                    }
		                });
		                // To avoid beginning lines that doesn't add to the textNode
		                // (#6144)
		                isSubsequentLine = (
		                    isSubsequentLine ||
		                    textNode.childNodes.length
		                );
		            });

		            if (ellipsis && wasTooLong) {
		                wrapper.attr(
		                    'title',
		                    unescapeEntities(wrapper.textStr, ['&lt;', '&gt;']) // #7179
		                );
		            }
		            if (tempParent) {
		                tempParent.removeChild(textNode);
		            }

		            // Apply the text outline
		            if (textOutline && wrapper.applyTextOutline) {
		                wrapper.applyTextOutline(textOutline);
		            }
		        }
		    },



		    /*
		    breakText: function (wrapper, width) {
		        var bBox = wrapper.getBBox(),
		            node = wrapper.element,
		            charnum = node.textContent.length,
		            stringWidth,
		            // try this position first, based on average character width
		            guessedLineCharLength = Math.round(width * charnum / bBox.width),
		            pos = guessedLineCharLength,
		            spans = [],
		            increment = 0,
		            startPos = 0,
		            endPos,
		            safe = 0;

		        if (bBox.width > width) {
		            while (startPos < charnum && safe < 100) {

		                while (endPos === undefined && safe < 100) {
		                    stringWidth = node.getSubStringLength(
		                        startPos,
		                        pos - startPos
		                    );

		                    if (stringWidth <= width) {
		                        if (increment === -1) {
		                            endPos = pos;
		                        } else {
		                            increment = 1;
		                        }
		                    } else {
		                        if (increment === 1) {
		                            endPos = pos - 1;
		                        } else {
		                            increment = -1;
		                        }
		                    }
		                    pos += increment;
		                    safe++;
		                }

		                spans.push(
		                    node.textContent.substr(startPos, endPos - startPos)
		                );

		                startPos = endPos;
		                pos = startPos + guessedLineCharLength;
		                endPos = undefined;
		            }
		        }

		        return spans;
		    },
		    // */

		    /**
		     * Returns white for dark colors and black for bright colors.
		     *
		     * @param {ColorString} rgba - The color to get the contrast for.
		     * @returns {string} The contrast color, either `#000000` or `#FFFFFF`.
		     */
		    getContrast: function (rgba) {
		        rgba = color(rgba).rgba;

		        // The threshold may be discussed. Here's a proposal for adding
		        // different weight to the color channels (#6216)
		        /*
		        rgba[0] *= 1; // red
		        rgba[1] *= 1.2; // green
		        rgba[2] *= 0.7; // blue
		        */

		        return rgba[0] + rgba[1] + rgba[2] > 2 * 255 ? '#000000' : '#FFFFFF';
		    },

		    /**
		     * Create a button with preset states.
		     * @param {string} text - The text or HTML to draw.
		     * @param {number} x - The x position of the button's left side.
		     * @param {number} y - The y position of the button's top side.
		     * @param {Function} callback - The function to execute on button click or
		     *    touch.
		     * @param {SVGAttributes} [normalState] - SVG attributes for the normal
		     *    state.
		     * @param {SVGAttributes} [hoverState] - SVG attributes for the hover state.
		     * @param {SVGAttributes} [pressedState] - SVG attributes for the pressed
		     *    state.
		     * @param {SVGAttributes} [disabledState] - SVG attributes for the disabled
		     *    state.
		     * @param {Symbol} [shape=rect] - The shape type.
		     * @returns {SVGRenderer} The button element.
		     */
		    button: function (
		        text,
		        x,
		        y,
		        callback,
		        normalState,
		        hoverState,
		        pressedState,
		        disabledState,
		        shape
		    ) {
		        var label = this.label(
		                text,
		                x,
		                y,
		                shape,
		                null,
		                null,
		                null,
		                null,
		                'button'
		            ),
		            curState = 0;

		        // Default, non-stylable attributes
		        label.attr(merge({
		            'padding': 8,
		            'r': 2
		        }, normalState));

        
		        // Presentational
		        var normalStyle,
		            hoverStyle,
		            pressedStyle,
		            disabledStyle;

		        // Normal state - prepare the attributes
		        normalState = merge({
		            fill: '#f7f7f7',
		            stroke: '#cccccc',
		            'stroke-width': 1,
		            style: {
		                color: '#333333',
		                cursor: 'pointer',
		                fontWeight: 'normal'
		            }
		        }, normalState);
		        normalStyle = normalState.style;
		        delete normalState.style;

		        // Hover state
		        hoverState = merge(normalState, {
		            fill: '#e6e6e6'
		        }, hoverState);
		        hoverStyle = hoverState.style;
		        delete hoverState.style;

		        // Pressed state
		        pressedState = merge(normalState, {
		            fill: '#e6ebf5',
		            style: {
		                color: '#000000',
		                fontWeight: 'bold'
		            }
		        }, pressedState);
		        pressedStyle = pressedState.style;
		        delete pressedState.style;

		        // Disabled state
		        disabledState = merge(normalState, {
		            style: {
		                color: '#cccccc'
		            }
		        }, disabledState);
		        disabledStyle = disabledState.style;
		        delete disabledState.style;
        

		        // Add the events. IE9 and IE10 need mouseover and mouseout to funciton
		        // (#667).
		        addEvent(label.element, isMS ? 'mouseover' : 'mouseenter', function () {
		            if (curState !== 3) {
		                label.setState(1);
		            }
		        });
		        addEvent(label.element, isMS ? 'mouseout' : 'mouseleave', function () {
		            if (curState !== 3) {
		                label.setState(curState);
		            }
		        });

		        label.setState = function (state) {
		            // Hover state is temporary, don't record it
		            if (state !== 1) {
		                label.state = curState = state;
		            }
		            // Update visuals
		            label.removeClass(
		                    /highcharts-button-(normal|hover|pressed|disabled)/
		                )
		                .addClass(
		                    'highcharts-button-' +
		                    ['normal', 'hover', 'pressed', 'disabled'][state || 0]
		                );

            
		            label.attr([
		                normalState,
		                hoverState,
		                pressedState,
		                disabledState
		            ][state || 0])
		            .css([
		                normalStyle,
		                hoverStyle,
		                pressedStyle,
		                disabledStyle
		            ][state || 0]);
            
		        };


        
		        // Presentational attributes
		        label
		            .attr(normalState)
		            .css(extend({ cursor: 'default' }, normalStyle));
        

		        return label
		            .on('click', function (e) {
		                if (curState !== 3) {
		                    callback.call(label, e);
		                }
		            });
		    },

		    /**
		     * Make a straight line crisper by not spilling out to neighbour pixels.
		     *
		     * @param {Array} points - The original points on the format
		     *                       `['M', 0, 0, 'L', 100, 0]`.
		     * @param {number} width - The width of the line.
		     * @returns {Array} The original points array, but modified to render
		     * crisply.
		     */
		    crispLine: function (points, width) {
		        // normalize to a crisp line
		        if (points[1] === points[4]) {
		            // Substract due to #1129. Now bottom and left axis gridlines behave
		            // the same.
		            points[1] = points[4] = Math.round(points[1]) - (width % 2 / 2);
		        }
		        if (points[2] === points[5]) {
		            points[2] = points[5] = Math.round(points[2]) + (width % 2 / 2);
		        }
		        return points;
		    },


		    /**
		     * Draw a path, wraps the SVG `path` element.
		     *
		     * @param {Array} [path] An SVG path definition in array form.
		     *
		     * @example
		     * var path = renderer.path(['M', 10, 10, 'L', 30, 30, 'z'])
		     *     .attr({ stroke: '#ff00ff' })
		     *     .add();
		     * @returns {SVGElement} The generated wrapper element.
		     *
		     * @sample highcharts/members/renderer-path-on-chart/
		     *         Draw a path in a chart
		     * @sample highcharts/members/renderer-path/
		     *         Draw a path independent from a chart
		     *
		     *//**
		     * Draw a path, wraps the SVG `path` element.
		     *
		     * @param {SVGAttributes} [attribs] The initial attributes.
		     * @returns {SVGElement} The generated wrapper element.
		     */
		    path: function (path) {
		        var attribs = {
            
		            fill: 'none'
            
		        };
		        if (isArray(path)) {
		            attribs.d = path;
		        } else if (isObject(path)) { // attributes
		            extend(attribs, path);
		        }
		        return this.createElement('path').attr(attribs);
		    },

		    /**
		     * Draw a circle, wraps the SVG `circle` element.
		     *
		     * @param {number} [x] The center x position.
		     * @param {number} [y] The center y position.
		     * @param {number} [r] The radius.
		     * @returns {SVGElement} The generated wrapper element.
		     *
		     * @sample highcharts/members/renderer-circle/ Drawing a circle
		     *//**
		     * Draw a circle, wraps the SVG `circle` element.
		     *
		     * @param {SVGAttributes} [attribs] The initial attributes.
		     * @returns {SVGElement} The generated wrapper element.
		     */
		    circle: function (x, y, r) {
		        var attribs = isObject(x) ? x : { x: x, y: y, r: r },
		            wrapper = this.createElement('circle');

		        // Setting x or y translates to cx and cy
		        wrapper.xSetter = wrapper.ySetter = function (value, key, element) {
		            element.setAttribute('c' + key, value);
		        };

		        return wrapper.attr(attribs);
		    },

		    /**
		     * Draw and return an arc.
		     * @param {number} [x=0] Center X position.
		     * @param {number} [y=0] Center Y position.
		     * @param {number} [r=0] The outer radius of the arc.
		     * @param {number} [innerR=0] Inner radius like used in donut charts.
		     * @param {number} [start=0] The starting angle of the arc in radians, where
		     *    0 is to the right and `-Math.PI/2` is up.
		     * @param {number} [end=0] The ending angle of the arc in radians, where 0
		     *    is to the right and `-Math.PI/2` is up.
		     * @returns {SVGElement} The generated wrapper element.
		     *
		     * @sample highcharts/members/renderer-arc/
		     *         Drawing an arc
		     *//**
		     * Draw and return an arc. Overloaded function that takes arguments object.
		     * @param {SVGAttributes} attribs Initial SVG attributes.
		     * @returns {SVGElement} The generated wrapper element.
		     */
		    arc: function (x, y, r, innerR, start, end) {
		        var arc,
		            options;

		        if (isObject(x)) {
		            options = x;
		            y = options.y;
		            r = options.r;
		            innerR = options.innerR;
		            start = options.start;
		            end = options.end;
		            x = options.x;
		        } else {
		            options = {
		                innerR: innerR,
		                start: start,
		                end: end
		            };
		        }

		        // Arcs are defined as symbols for the ability to set
		        // attributes in attr and animate
		        arc = this.symbol('arc', x, y, r, r, options);
		        arc.r = r; // #959
		        return arc;
		    },

		    /**
		     * Draw and return a rectangle.
		     * @param {number} [x] Left position.
		     * @param {number} [y] Top position.
		     * @param {number} [width] Width of the rectangle.
		     * @param {number} [height] Height of the rectangle.
		     * @param {number} [r] Border corner radius.
		     * @param {number} [strokeWidth] A stroke width can be supplied to allow
		     *    crisp drawing.
		     * @returns {SVGElement} The generated wrapper element.
		     *//**
		     * Draw and return a rectangle.
		     * @param  {SVGAttributes} [attributes]
		     *         General SVG attributes for the rectangle.
		     * @return {SVGElement}
		     *         The generated wrapper element.
		     *
		     * @sample highcharts/members/renderer-rect-on-chart/
		     *         Draw a rectangle in a chart
		     * @sample highcharts/members/renderer-rect/
		     *         Draw a rectangle independent from a chart
		     */
		    rect: function (x, y, width, height, r, strokeWidth) {

		        r = isObject(x) ? x.r : r;

		        var wrapper = this.createElement('rect'),
		            attribs = isObject(x) ? x : x === undefined ? {} : {
		                x: x,
		                y: y,
		                width: Math.max(width, 0),
		                height: Math.max(height, 0)
		            };

        
		        if (strokeWidth !== undefined) {
		            attribs.strokeWidth = strokeWidth;
		            attribs = wrapper.crisp(attribs);
		        }
		        attribs.fill = 'none';
        

		        if (r) {
		            attribs.r = r;
		        }

		        wrapper.rSetter = function (value, key, element) {
		            attr(element, {
		                rx: value,
		                ry: value
		            });
		        };

		        return wrapper.attr(attribs);
		    },

		    /**
		     * Resize the {@link SVGRenderer#box} and re-align all aligned child
		     * elements.
		     * @param  {number} width
		     *         The new pixel width.
		     * @param  {number} height
		     *         The new pixel height.
		     * @param  {Boolean|AnimationOptions} [animate=true]
		     *         Whether and how to animate.
		     */
		    setSize: function (width, height, animate) {
		        var renderer = this,
		            alignedObjects = renderer.alignedObjects,
		            i = alignedObjects.length;

		        renderer.width = width;
		        renderer.height = height;

		        renderer.boxWrapper.animate({
		            width: width,
		            height: height
		        }, {
		            step: function () {
		                this.attr({
		                    viewBox: '0 0 ' + this.attr('width') + ' ' +
		                        this.attr('height')
		                });
		            },
		            duration: pick(animate, true) ? undefined : 0
		        });

		        while (i--) {
		            alignedObjects[i].align();
		        }
		    },

		    /**
		     * Create and return an svg group element. Child
		     * {@link Highcharts.SVGElement} objects are added to the group by using the
		     * group as the first parameter
		     * in {@link Highcharts.SVGElement#add|add()}.
		     *
		     * @param {string} [name] The group will be given a class name of
		     * `highcharts-{name}`. This can be used for styling and scripting.
		     * @returns {SVGElement} The generated wrapper element.
		     *
		     * @sample highcharts/members/renderer-g/
		     *         Show and hide grouped objects
		     */
		    g: function (name) {
		        var elem = this.createElement('g');
		        return name ? elem.attr({ 'class': 'highcharts-' + name }) : elem;
		    },

		    /**
		     * Display an image.
		     * @param {string} src The image source.
		     * @param {number} [x] The X position.
		     * @param {number} [y] The Y position.
		     * @param {number} [width] The image width. If omitted, it defaults to the
		     *    image file width.
		     * @param {number} [height] The image height. If omitted it defaults to the
		     *    image file height.
		     * @param {function} [onload] Event handler for image load.
		     * @returns {SVGElement} The generated wrapper element.
		     *
		     * @sample highcharts/members/renderer-image-on-chart/
		     *         Add an image in a chart
		     * @sample highcharts/members/renderer-image/
		     *         Add an image independent of a chart
		     */
		    image: function (src, x, y, width, height, onload) {
		        var attribs = {
		                preserveAspectRatio: 'none'
		            },
		            elemWrapper,
		            dummy,
		            setSVGImageSource = function (el, src) {
		                // Set the href in the xlink namespace
		                if (el.setAttributeNS) {
		                    el.setAttributeNS(
		                        'http://www.w3.org/1999/xlink', 'href', src
		                    );
		                } else {
		                    // could be exporting in IE
		                    // using href throws "not supported" in ie7 and under,
		                    // requries regex shim to fix later
		                    el.setAttribute('hc-svg-href', src);
		                }
		            },
		            onDummyLoad = function (e) {
		                setSVGImageSource(elemWrapper.element, src);
		                onload.call(elemWrapper, e);
		            };

		        // optional properties
		        if (arguments.length > 1) {
		            extend(attribs, {
		                x: x,
		                y: y,
		                width: width,
		                height: height
		            });
		        }

		        elemWrapper = this.createElement('image').attr(attribs);

		        // Add load event if supplied
		        if (onload) {
		            // We have to use a dummy HTML image since IE support for SVG image
		            // load events is very buggy. First set a transparent src, wait for
		            // dummy to load, and then add the real src to the SVG image.
		            setSVGImageSource(
		                elemWrapper.element,
		                'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' /* eslint-disable-line */
		            );
		            dummy = new win.Image();
		            addEvent(dummy, 'load', onDummyLoad);
		            dummy.src = src;
		            if (dummy.complete) {
		                onDummyLoad({});
		            }
		        } else {
		            setSVGImageSource(elemWrapper.element, src);
		        }

		        return elemWrapper;
		    },

		    /**
		     * Draw a symbol out of pre-defined shape paths from
		     * {@link SVGRenderer#symbols}.
		     * It is used in Highcharts for point makers, which cake a `symbol` option,
		     * and label and button backgrounds like in the tooltip and stock flags.
		     *
		     * @param {Symbol} symbol - The symbol name.
		     * @param {number} x - The X coordinate for the top left position.
		     * @param {number} y - The Y coordinate for the top left position.
		     * @param {number} width - The pixel width.
		     * @param {number} height - The pixel height.
		     * @param {Object} [options] - Additional options, depending on the actual
		     *    symbol drawn.
		     * @param {number} [options.anchorX] - The anchor X position for the
		     *    `callout` symbol. This is where the chevron points to.
		     * @param {number} [options.anchorY] - The anchor Y position for the
		     *    `callout` symbol. This is where the chevron points to.
		     * @param {number} [options.end] - The end angle of an `arc` symbol.
		     * @param {boolean} [options.open] - Whether to draw `arc` symbol open or
		     *    closed.
		     * @param {number} [options.r] - The radius of an `arc` symbol, or the
		     *    border radius for the `callout` symbol.
		     * @param {number} [options.start] - The start angle of an `arc` symbol.
		     */
		    symbol: function (symbol, x, y, width, height, options) {

		        var ren = this,
		            obj,
		            imageRegex = /^url\((.*?)\)$/,
		            isImage = imageRegex.test(symbol),
		            sym = !isImage && (this.symbols[symbol] ? symbol : 'circle'),


		            // get the symbol definition function
		            symbolFn = sym && this.symbols[sym],

		            // check if there's a path defined for this symbol
		            path = defined(x) && symbolFn && symbolFn.call(
		                this.symbols,
		                Math.round(x),
		                Math.round(y),
		                width,
		                height,
		                options
		            ),
		            imageSrc,
		            centerImage;

		        if (symbolFn) {
		            obj = this.path(path);

            
		            obj.attr('fill', 'none');
            

		            // expando properties for use in animate and attr
		            extend(obj, {
		                symbolName: sym,
		                x: x,
		                y: y,
		                width: width,
		                height: height
		            });
		            if (options) {
		                extend(obj, options);
		            }


		        // Image symbols
		        } else if (isImage) {


		            imageSrc = symbol.match(imageRegex)[1];

		            // Create the image synchronously, add attribs async
		            obj = this.image(imageSrc);

		            // The image width is not always the same as the symbol width. The
		            // image may be centered within the symbol, as is the case when
		            // image shapes are used as label backgrounds, for example in flags.
		            obj.imgwidth = pick(
		                symbolSizes[imageSrc] && symbolSizes[imageSrc].width,
		                options && options.width
		            );
		            obj.imgheight = pick(
		                symbolSizes[imageSrc] && symbolSizes[imageSrc].height,
		                options && options.height
		            );
		            /**
		             * Set the size and position
		             */
		            centerImage = function () {
		                obj.attr({
		                    width: obj.width,
		                    height: obj.height
		                });
		            };

		            /**
		             * Width and height setters that take both the image's physical size
		             * and the label size into consideration, and translates the image
		             * to center within the label.
		             */
		            each(['width', 'height'], function (key) {
		                obj[key + 'Setter'] = function (value, key) {
		                    var attribs = {},
		                        imgSize = this['img' + key],
		                        trans = key === 'width' ? 'translateX' : 'translateY';
		                    this[key] = value;
		                    if (defined(imgSize)) {
		                        if (this.element) {
		                            this.element.setAttribute(key, imgSize);
		                        }
		                        if (!this.alignByTranslate) {
		                            attribs[trans] = ((this[key] || 0) - imgSize) / 2;
		                            this.attr(attribs);
		                        }
		                    }
		                };
		            });


		            if (defined(x)) {
		                obj.attr({
		                    x: x,
		                    y: y
		                });
		            }
		            obj.isImg = true;

		            if (defined(obj.imgwidth) && defined(obj.imgheight)) {
		                centerImage();
		            } else {
		                // Initialize image to be 0 size so export will still function
		                // if there's no cached sizes.
		 