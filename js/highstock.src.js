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
		     * General method for adding a definition to the SVG `defs` tag. Can be used
		     *   for gradients, fills, filters etc. Styled mode only. A hook for adding
		     *   general definitions to the SVG's defs tag. Definitions can be
		     *   referenced from the CSS by its `id`. Read more in
		     *   [gradients, shadows and patterns]{@link http://www.highcharts.com/docs/
		     *   chart-design-and-style/gradients-shadows-and-patterns}.
		     *   Styled mode only.
		     *
		     * @param {Object} def - A serialized form of an SVG definition, including
		     *   children
		     *
		     * @return {SVGElement} The inserted node.
		     */
		    definition: function (def) {
		        var ren = this;

		        function recurse(config, parent) {
		            var ret;
		            each(splat(config), function (item) {
		                var node = ren.createElement(item.tagName),
		                    attr = {};

		                // Set attributes
		                objectEach(item, function (val, key) {
		                    if (
		                        key !== 'tagName' &&
		                        key !== 'children' &&
		                        key !== 'textContent'
		                    ) {
		                        attr[key] = val;
		                    }
		                });
		                node.attr(attr);

		                // Add to the tree
		                node.add(parent || ren.defs);

		                // Add text content
		                if (item.textContent) {
		                    node.element.appendChild(
		                        doc.createTextNode(item.textContent)
		                    );
		                }

		                // Recurse
		                recurse(item.children || [], node);

		                ret = node;
		            });

		            // Return last node added (on top level it's the only one)
		            return ret;
		        }
		        return recurse(def);
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
                    
		                    .replace(
		                        /<(b|strong)>/g,
		                        '<span class="highcharts-strong">'
		                    )
		                    .replace(
		                        /<(i|em)>/g,
		                        '<span class="highcharts-emphasized">'
		                    )
                    
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

            
		        };


        

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
		                obj.attr({ width: 0, height: 0 });

		                // Create a dummy JavaScript image to get the width and height.
		                createElement('img', {
		                    onload: function () {

		                        var chart = charts[ren.chartIndex];

		                        // Special case for SVGs on IE11, the width is not
		                        // accessible until the image is part of the DOM
		                        // (#2854).
		                        if (this.width === 0) {
		                            css(this, {
		                                position: 'absolute',
		                                top: '-999em'
		                            });
		                            doc.body.appendChild(this);
		                        }

		                        // Center the image
		                        symbolSizes[imageSrc] = { // Cache for next
		                            width: this.width,
		                            height: this.height
		                        };
		                        obj.imgwidth = this.width;
		                        obj.imgheight = this.height;

		                        if (obj.element) {
		                            centerImage();
		                        }

		                        // Clean up after #2854 workaround.
		                        if (this.parentNode) {
		                            this.parentNode.removeChild(this);
		                        }

		                        // Fire the load event when all external images are
		                        // loaded
		                        ren.imgCount--;
		                        if (!ren.imgCount && chart && chart.onload) {
		                            chart.onload();
		                        }
		                    },
		                    src: imageSrc
		                });
		                this.imgCount++;
		            }
		        }

		        return obj;
		    },

		    /**
		     * @typedef {string} Symbol
		     *
		     * Can be one of `arc`, `callout`, `circle`, `diamond`, `square`,
		     * `triangle`, `triangle-down`. Symbols are used internally for point
		     * markers, button and label borders and backgrounds, or custom shapes.
		     * Extendable by adding to {@link SVGRenderer#symbols}.
		     */
		    /**
		     * An extendable collection of functions for defining symbol paths.
		     */
		    symbols: {
		        'circle': function (x, y, w, h) {
		            // Return a full arc
		            return this.arc(x + w / 2, y + h / 2, w / 2, h / 2, {
		                start: 0,
		                end: Math.PI * 2,
		                open: false
		            });
		        },

		        'square': function (x, y, w, h) {
		            return [
		                'M', x, y,
		                'L', x + w, y,
		                x + w, y + h,
		                x, y + h,
		                'Z'
		            ];
		        },

		        'triangle': function (x, y, w, h) {
		            return [
		                'M', x + w / 2, y,
		                'L', x + w, y + h,
		                x, y + h,
		                'Z'
		            ];
		        },

		        'triangle-down': function (x, y, w, h) {
		            return [
		                'M', x, y,
		                'L', x + w, y,
		                x + w / 2, y + h,
		                'Z'
		            ];
		        },
		        'diamond': function (x, y, w, h) {
		            return [
		                'M', x + w / 2, y,
		                'L', x + w, y + h / 2,
		                x + w / 2, y + h,
		                x, y + h / 2,
		                'Z'
		            ];
		        },
		        'arc': function (x, y, w, h, options) {
		            var start = options.start,
		                rx = options.r || w,
		                ry = options.r || h || w,
		                proximity = 0.001,
		                fullCircle =
		                    Math.abs(options.end - options.start - 2 * Math.PI) <
		                    proximity,
		                // Substract a small number to prevent cos and sin of start and
		                // end from becoming equal on 360 arcs (related: #1561)
		                end = options.end - proximity,
		                innerRadius = options.innerR,
		                open = pick(options.open, fullCircle),
		                cosStart = Math.cos(start),
		                sinStart = Math.sin(start),
		                cosEnd = Math.cos(end),
		                sinEnd = Math.sin(end),
		                // Proximity takes care of rounding errors around PI (#6971)
		                longArc = options.end - start - Math.PI < proximity ? 0 : 1,
		                arc;

		            arc = [
		                'M',
		                x + rx * cosStart,
		                y + ry * sinStart,
		                'A', // arcTo
		                rx, // x radius
		                ry, // y radius
		                0, // slanting
		                longArc, // long or short arc
		                1, // clockwise
		                x + rx * cosEnd,
		                y + ry * sinEnd
		            ];

		            if (defined(innerRadius)) {
		                arc.push(
		                    open ? 'M' : 'L',
		                    x + innerRadius * cosEnd,
		                    y + innerRadius * sinEnd,
		                    'A', // arcTo
		                    innerRadius, // x radius
		                    innerRadius, // y radius
		                    0, // slanting
		                    longArc, // long or short arc
		                    0, // clockwise
		                    x + innerRadius * cosStart,
		                    y + innerRadius * sinStart
		                );
		            }

		            arc.push(open ? '' : 'Z'); // close
		            return arc;
		        },

		        /**
		         * Callout shape used for default tooltips, also used for rounded
		         * rectangles in VML
		         */
		        callout: function (x, y, w, h, options) {
		            var arrowLength = 6,
		                halfDistance = 6,
		                r = Math.min((options && options.r) || 0, w, h),
		                safeDistance = r + halfDistance,
		                anchorX = options && options.anchorX,
		                anchorY = options && options.anchorY,
		                path;

		            path = [
		                'M', x + r, y,
		                'L', x + w - r, y, // top side
		                'C', x + w, y, x + w, y, x + w, y + r, // top-right corner
		                'L', x + w, y + h - r, // right side
		                'C', x + w, y + h, x + w, y + h, x + w - r, y + h, // bottom-rgt
		                'L', x + r, y + h, // bottom side
		                'C', x, y + h, x, y + h, x, y + h - r, // bottom-left corner
		                'L', x, y + r, // left side
		                'C', x, y, x, y, x + r, y // top-left corner
		            ];

		            // Anchor on right side
		            if (anchorX && anchorX > w) {

		                // Chevron
		                if (
		                    anchorY > y + safeDistance &&
		                    anchorY < y + h - safeDistance
		                ) {
		                    path.splice(13, 3,
		                        'L', x + w, anchorY - halfDistance,
		                        x + w + arrowLength, anchorY,
		                        x + w, anchorY + halfDistance,
		                        x + w, y + h - r
		                    );

		                // Simple connector
		                } else {
		                    path.splice(13, 3,
		                        'L', x + w, h / 2,
		                        anchorX, anchorY,
		                        x + w, h / 2,
		                        x + w, y + h - r
		                    );
		                }

		            // Anchor on left side
		            } else if (anchorX && anchorX < 0) {

		                // Chevron
		                if (
		                    anchorY > y + safeDistance &&
		                    anchorY < y + h - safeDistance
		                ) {
		                    path.splice(33, 3,
		                        'L', x, anchorY + halfDistance,
		                        x - arrowLength, anchorY,
		                        x, anchorY - halfDistance,
		                        x, y + r
		                    );

		                // Simple connector
		                } else {
		                    path.splice(33, 3,
		                        'L', x, h / 2,
		                        anchorX, anchorY,
		                        x, h / 2,
		                        x, y + r
		                    );
		                }

		            } else if ( // replace bottom
		                anchorY &&
		                anchorY > h &&
		                anchorX > x + safeDistance &&
		                anchorX < x + w - safeDistance
		            ) {
		                path.splice(23, 3,
		                    'L', anchorX + halfDistance, y + h,
		                    anchorX, y + h + arrowLength,
		                    anchorX - halfDistance, y + h,
		                    x + r, y + h
		                    );

		            } else if ( // replace top
		                anchorY &&
		                anchorY < 0 &&
		                anchorX > x + safeDistance &&
		                anchorX < x + w - safeDistance
		            ) {
		                path.splice(3, 3,
		                    'L', anchorX - halfDistance, y,
		                    anchorX, y - arrowLength,
		                    anchorX + halfDistance, y,
		                    w - r, y
		                );
		            }

		            return path;
		        }
		    },

		    /**
		     * @typedef {SVGElement} ClipRect - A clipping rectangle that can be applied
		     * to one or more {@link SVGElement} instances. It is instanciated with the
		     * {@link SVGRenderer#clipRect} function and applied with the {@link
		     * SVGElement#clip} function.
		     *
		     * @example
		     * var circle = renderer.circle(100, 100, 100)
		     *     .attr({ fill: 'red' })
		     *     .add();
		     * var clipRect = renderer.clipRect(100, 100, 100, 100);
		     *
		     * // Leave only the lower right quarter visible
		     * circle.clip(clipRect);
		     */
		    /**
		     * Define a clipping rectangle. The clipping rectangle is later applied
		     * to {@link SVGElement} objects through the {@link SVGElement#clip}
		     * function.
		     *
		     * @param {String} id
		     * @param {number} x
		     * @param {number} y
		     * @param {number} width
		     * @param {number} height
		     * @returns {ClipRect} A clipping rectangle.
		     *
		     * @example
		     * var circle = renderer.circle(100, 100, 100)
		     *     .attr({ fill: 'red' })
		     *     .add();
		     * var clipRect = renderer.clipRect(100, 100, 100, 100);
		     *
		     * // Leave only the lower right quarter visible
		     * circle.clip(clipRect);
		     */
		    clipRect: function (x, y, width, height) {
		        var wrapper,
		            id = H.uniqueKey(),

		            clipPath = this.createElement('clipPath').attr({
		                id: id
		            }).add(this.defs);

		        wrapper = this.rect(x, y, width, height, 0).add(clipPath);
		        wrapper.id = id;
		        wrapper.clipPath = clipPath;
		        wrapper.count = 0;

		        return wrapper;
		    },





		    /**
		     * Draw text. The text can contain a subset of HTML, like spans and anchors
		     * and some basic text styling of these. For more advanced features like
		     * border and background, use {@link Highcharts.SVGRenderer#label} instead.
		     * To update the text after render, run `text.attr({ text: 'New text' })`.
		     * @param  {String} str
		     *         The text of (subset) HTML to draw.
		     * @param  {number} x
		     *         The x position of the text's lower left corner.
		     * @param  {number} y
		     *         The y position of the text's lower left corner.
		     * @param  {Boolean} [useHTML=false]
		     *         Use HTML to render the text.
		     *
		     * @return {SVGElement} The text object.
		     *
		     * @sample highcharts/members/renderer-text-on-chart/
		     *         Annotate the chart freely
		     * @sample highcharts/members/renderer-on-chart/
		     *         Annotate with a border and in response to the data
		     * @sample highcharts/members/renderer-text/
		     *         Formatted text
		     */
		    text: function (str, x, y, useHTML) {

		        // declare variables
		        var renderer = this,
		            wrapper,
		            attribs = {};

		        if (useHTML && (renderer.allowHTML || !renderer.forExport)) {
		            return renderer.html(str, x, y);
		        }

		        attribs.x = Math.round(x || 0); // X always needed for line-wrap logic
		        if (y) {
		            attribs.y = Math.round(y);
		        }
		        if (str || str === 0) {
		            attribs.text = str;
		        }

		        wrapper = renderer.createElement('text')
		            .attr(attribs);

		        if (!useHTML) {
		            wrapper.xSetter = function (value, key, element) {
		                var tspans = element.getElementsByTagName('tspan'),
		                    tspan,
		                    parentVal = element.getAttribute(key),
		                    i;
		                for (i = 0; i < tspans.length; i++) {
		                    tspan = tspans[i];
		                    // If the x values are equal, the tspan represents a
		                    // linebreak
		                    if (tspan.getAttribute(key) === parentVal) {
		                        tspan.setAttribute(key, value);
		                    }
		                }
		                element.setAttribute(key, value);
		            };
		        }

		        return wrapper;
		    },

		    /**
		     * Utility to return the baseline offset and total line height from the font
		     * size.
		     *
		     * @param {?string} fontSize The current font size to inspect. If not given,
		     *   the font size will be found from the DOM element.
		     * @param {SVGElement|SVGDOMElement} [elem] The element to inspect for a
		     *   current font size.
		     * @returns {Object} An object containing `h`: the line height, `b`: the
		     * baseline relative to the top of the box, and `f`: the font size.
		     */
		    fontMetrics: function (fontSize, elem) {
		        var lineHeight,
		            baseline;

        
		        fontSize = elem && SVGElement.prototype.getStyle.call(
		            elem,
		            'font-size'
		        );
        

		        // Handle different units
		        if (/px/.test(fontSize)) {
		            fontSize = pInt(fontSize);
		        } else if (/em/.test(fontSize)) {
		            // The em unit depends on parent items
		            fontSize = parseFloat(fontSize) *
		                (elem ? this.fontMetrics(null, elem.parentNode).f : 16);
		        } else {
		            fontSize = 12;
		        }

		        // Empirical values found by comparing font size and bounding box
		        // height. Applies to the default font family.
		        // http://jsfiddle.net/highcharts/7xvn7/
		        lineHeight = fontSize < 24 ? fontSize + 3 : Math.round(fontSize * 1.2);
		        baseline = Math.round(lineHeight * 0.8);

		        return {
		            h: lineHeight,
		            b: baseline,
		            f: fontSize
		        };
		    },

		    /**
		     * Correct X and Y positioning of a label for rotation (#1764).
		     *
		     * @private
		     */
		    rotCorr: function (baseline, rotation, alterY) {
		        var y = baseline;
		        if (rotation && alterY) {
		            y = Math.max(y * Math.cos(rotation * deg2rad), 4);
		        }
		        return {
		            x: (-baseline / 3) * Math.sin(rotation * deg2rad),
		            y: y
		        };
		    },

		    /**
		     * Draw a label, which is an extended text element with support for border
		     * and background. Highcharts creates a `g` element with a text and a `path`
		     * or `rect` inside, to make it behave somewhat like a HTML div. Border and
		     * background are set through `stroke`, `stroke-width` and `fill` attributes
		     * using the {@link Highcharts.SVGElement#attr|attr} method. To update the
		     * text after render, run `label.attr({ text: 'New text' })`.
		     *
		     * @param  {string} str
		     *         The initial text string or (subset) HTML to render.
		     * @param  {number} x
		     *         The x position of the label's left side.
		     * @param  {number} y
		     *         The y position of the label's top side or baseline, depending on
		     *         the `baseline` parameter.
		     * @param  {String} shape
		     *         The shape of the label's border/background, if any. Defaults to
		     *         `rect`. Other possible values are `callout` or other shapes
		     *         defined in {@link Highcharts.SVGRenderer#symbols}.
		     * @param  {number} anchorX
		     *         In case the `shape` has a pointer, like a flag, this is the
		     *         coordinates it should be pinned to.
		     * @param  {number} anchorY
		     *         In case the `shape` has a pointer, like a flag, this is the
		     *         coordinates it should be pinned to.
		     * @param  {Boolean} baseline
		     *         Whether to position the label relative to the text baseline,
		     *         like {@link Highcharts.SVGRenderer#text|renderer.text}, or to the
		     *         upper border of the rectangle.
		     * @param  {String} className
		     *         Class name for the group.
		     *
		     * @return {SVGElement}
		     *         The generated label.
		     *
		     * @sample highcharts/members/renderer-label-on-chart/
		     *         A label on the chart
		     */
		    label: function (
		        str,
		        x,
		        y,
		        shape,
		        anchorX,
		        anchorY,
		        useHTML,
		        baseline,
		        className
		    ) {

		        var renderer = this,
		            wrapper = renderer.g(className !== 'button' && 'label'),
		            text = wrapper.text = renderer.text('', 0, 0, useHTML)
		                .attr({
		                    zIndex: 1
		                }),
		            box,
		            bBox,
		            alignFactor = 0,
		            padding = 3,
		            paddingLeft = 0,
		            width,
		            height,
		            wrapperX,
		            wrapperY,
		            textAlign,
		            deferredAttr = {},
		            strokeWidth,
		            baselineOffset,
		            hasBGImage = /^url\((.*?)\)$/.test(shape),
		            needsBox = hasBGImage,
		            getCrispAdjust,
		            updateBoxSize,
		            updateTextPadding,
		            boxAttr;

		        if (className) {
		            wrapper.addClass('highcharts-' + className);
		        }

        
		        needsBox = true; // for styling
		        getCrispAdjust = function () {
		            return box.strokeWidth() % 2 / 2;
		        };
        

		        /**
		         * This function runs after the label is added to the DOM (when the
		         * bounding box is available), and after the text of the label is
		         * updated to detect the new bounding box and reflect it in the border
		         * box.
		         */
		        updateBoxSize = function () {
		            var style = text.element.style,
		                crispAdjust,
		                attribs = {};

		            bBox = (
		                (width === undefined || height === undefined || textAlign) &&
		                defined(text.textStr) &&
		                text.getBBox()
		            ); // #3295 && 3514 box failure when string equals 0

		            wrapper.width = (
		                (width || bBox.width || 0) +
		                2 * padding +
		                paddingLeft
		            );
		            wrapper.height = (height || bBox.height || 0) + 2 * padding;

		            // Update the label-scoped y offset
		            baselineOffset = padding +
		                renderer.fontMetrics(style && style.fontSize, text).b;

		            if (needsBox) {

		                // Create the border box if it is not already present
		                if (!box) {
		                    // Symbol definition exists (#5324)
		                    wrapper.box = box = renderer.symbols[shape] || hasBGImage ?
		                        renderer.symbol(shape) :
		                        renderer.rect();

		                    box.addClass( // Don't use label className for buttons
		                        (className === 'button' ? '' : 'highcharts-label-box') +
		                        (className ? ' highcharts-' + className + '-box' : '')
		                    );

		                    box.add(wrapper);

		                    crispAdjust = getCrispAdjust();
		                    attribs.x = crispAdjust;
		                    attribs.y = (baseline ? -baselineOffset : 0) + crispAdjust;
		                }

		                // Apply the box attributes
		                attribs.width = Math.round(wrapper.width);
		                attribs.height = Math.round(wrapper.height);

		                box.attr(extend(attribs, deferredAttr));
		                deferredAttr = {};
		            }
		        };

		        /**
		         * This function runs after setting text or padding, but only if padding
		         * is changed
		         */
		        updateTextPadding = function () {
		            var textX = paddingLeft + padding,
		                textY;

		            // determin y based on the baseline
		            textY = baseline ? 0 : baselineOffset;

		            // compensate for alignment
		            if (
		                defined(width) &&
		                bBox &&
		                (textAlign === 'center' || textAlign === 'right')
		            ) {
		                textX += { center: 0.5, right: 1 }[textAlign] *
		                    (width - bBox.width);
		            }

		            // update if anything changed
		            if (textX !== text.x || textY !== text.y) {
		                text.attr('x', textX);
		                // #8159 - prevent misplaced data labels in treemap
		                // (useHTML: true)
		                if (text.hasBoxWidthChanged) {
		                    bBox = text.getBBox(true);
		                    updateBoxSize();
		                }
		                if (textY !== undefined) {
		                    text.attr('y', textY);
		                }
		            }

		            // record current values
		            text.x = textX;
		            text.y = textY;
		        };

		        /**
		         * Set a box attribute, or defer it if the box is not yet created
		         * @param {Object} key
		         * @param {Object} value
		         */
		        boxAttr = function (key, value) {
		            if (box) {
		                box.attr(key, value);
		            } else {
		                deferredAttr[key] = value;
		            }
		        };

		        /**
		         * After the text element is added, get the desired size of the border
		         * box and add it before the text in the DOM.
		         */
		        wrapper.onAdd = function () {
		            text.add(wrapper);
		            wrapper.attr({
		                // Alignment is available now  (#3295, 0 not rendered if given
		                // as a value)
		                text: (str || str === 0) ? str : '',
		                x: x,
		                y: y
		            });

		            if (box && defined(anchorX)) {
		                wrapper.attr({
		                    anchorX: anchorX,
		                    anchorY: anchorY
		                });
		            }
		        };

		        /*
		         * Add specific attribute setters.
		         */

		        // only change local variables
		        wrapper.widthSetter = function (value) {
		            width = H.isNumber(value) ? value : null; // width:auto => null
		        };
		        wrapper.heightSetter = function (value) {
		            height = value;
		        };
		        wrapper['text-alignSetter'] = function (value) {
		            textAlign = value;
		        };
		        wrapper.paddingSetter =  function (value) {
		            if (defined(value) && value !== padding) {
		                padding = wrapper.padding = value;
		                updateTextPadding();
		            }
		        };
		        wrapper.paddingLeftSetter =  function (value) {
		            if (defined(value) && value !== paddingLeft) {
		                paddingLeft = value;
		                updateTextPadding();
		            }
		        };


		        // change local variable and prevent setting attribute on the group
		        wrapper.alignSetter = function (value) {
		            value = { left: 0, center: 0.5, right: 1 }[value];
		            if (value !== alignFactor) {
		                alignFactor = value;
		                // Bounding box exists, means we're dynamically changing
		                if (bBox) {
		                    wrapper.attr({ x: wrapperX }); // #5134
		                }
		            }
		        };

		        // apply these to the box and the text alike
		        wrapper.textSetter = function (value) {
		            if (value !== undefined) {
		                text.textSetter(value);
		            }
		            updateBoxSize();
		            updateTextPadding();
		        };

		        // apply these to the box but not to the text
		        wrapper['stroke-widthSetter'] = function (value, key) {
		            if (value) {
		                needsBox = true;
		            }
		            strokeWidth = this['stroke-width'] = value;
		            boxAttr(key, value);
		        };
        
		        wrapper.rSetter = function (value, key) {
		            boxAttr(key, value);
		        };
        
		        wrapper.anchorXSetter = function (value, key) {
		            anchorX = wrapper.anchorX = value;
		            boxAttr(key, Math.round(value) - getCrispAdjust() - wrapperX);
		        };
		        wrapper.anchorYSetter = function (value, key) {
		            anchorY = wrapper.anchorY = value;
		            boxAttr(key, value - wrapperY);
		        };

		        // rename attributes
		        wrapper.xSetter = function (value) {
		            wrapper.x = value; // for animation getter
		            if (alignFactor) {
		                value -= alignFactor * ((width || bBox.width) + 2 * padding);

		                // Force animation even when setting to the same value (#7898)
		                wrapper['forceAnimate:x'] = true;
		            }
		            wrapperX = Math.round(value);
		            wrapper.attr('translateX', wrapperX);
		        };
		        wrapper.ySetter = function (value) {
		            wrapperY = wrapper.y = Math.round(value);
		            wrapper.attr('translateY', wrapperY);
		        };

		        // Redirect certain methods to either the box or the text
		        var baseCss = wrapper.css;
		        return extend(wrapper, {
		            /**
		             * Pick up some properties and apply them to the text instead of the
		             * wrapper.
		             * @ignore
		             */
		            css: function (styles) {
		                if (styles) {
		                    var textStyles = {};
		                    // Create a copy to avoid altering the original object
		                    // (#537)
		                    styles = merge(styles);
		                    each(wrapper.textProps, function (prop) {
		                        if (styles[prop] !== undefined) {
		                            textStyles[prop] = styles[prop];
		                            delete styles[prop];
		                        }
		                    });
		                    text.css(textStyles);

		                    if ('width' in textStyles) {
		                        updateBoxSize();
		                    }
		                }
		                return baseCss.call(wrapper, styles);
		            },
		            /**
		             * Return the bounding box of the box, not the group.
		             * @ignore
		             */
		            getBBox: function () {
		                return {
		                    width: bBox.width + 2 * padding,
		                    height: bBox.height + 2 * padding,
		                    x: bBox.x - padding,
		                    y: bBox.y - padding
		                };
		            },
            
		            /**
		             * Destroy and release memory.
		             * @ignore
		             */
		            destroy: function () {

		                // Added by button implementation
		                removeEvent(wrapper.element, 'mouseenter');
		                removeEvent(wrapper.element, 'mouseleave');

		                if (text) {
		                    text = text.destroy();
		                }
		                if (box) {
		                    box = box.destroy();
		                }
		                // Call base implementation to destroy the rest
		                SVGElement.prototype.destroy.call(wrapper);

		                // Release local pointers (#1298)
		                wrapper =
		                renderer =
		                updateBoxSize =
		                updateTextPadding =
		                boxAttr = null;
		            }
		        });
		    }
		}); // end SVGRenderer


		// general renderer
		H.Renderer = SVGRenderer;

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */

		var attr = H.attr,
		    createElement = H.createElement,
		    css = H.css,
		    defined = H.defined,
		    each = H.each,
		    extend = H.extend,
		    isFirefox = H.isFirefox,
		    isMS = H.isMS,
		    isWebKit = H.isWebKit,
		    pick = H.pick,
		    pInt = H.pInt,
		    SVGElement = H.SVGElement,
		    SVGRenderer = H.SVGRenderer,
		    win = H.win,
		    wrap = H.wrap;

		// Extend SvgElement for useHTML option
		extend(SVGElement.prototype, /** @lends SVGElement.prototype */ {
		    /**
		     * Apply CSS to HTML elements. This is used in text within SVG rendering and
		     * by the VML renderer
		     */
		    htmlCss: function (styles) {
		        var wrapper = this,
		            element = wrapper.element,
		            textWidth = styles && element.tagName === 'SPAN' && styles.width;

		        if (textWidth) {
		            delete styles.width;
		            wrapper.textWidth = textWidth;
		            wrapper.htmlUpdateTransform();
		        }
		        if (styles && styles.textOverflow === 'ellipsis') {
		            styles.whiteSpace = 'nowrap';
		            styles.overflow = 'hidden';
		        }
		        wrapper.styles = extend(wrapper.styles, styles);
		        css(wrapper.element, styles);

		        return wrapper;
		    },

		    /**
		     * VML and useHTML method for calculating the bounding box based on offsets
		     * @param {Boolean} refresh Whether to force a fresh value from the DOM or
		     * to use the cached value.
		     *
		     * @return {Object} A hash containing values for x, y, width and height
		     */

		    htmlGetBBox: function () {
		        var wrapper = this,
		            element = wrapper.element;

		        return {
		            x: element.offsetLeft,
		            y: element.offsetTop,
		            width: element.offsetWidth,
		            height: element.offsetHeight
		        };
		    },

		    /**
		     * VML override private method to update elements based on internal
		     * properties based on SVG transform
		     */
		    htmlUpdateTransform: function () {
		        // aligning non added elements is expensive
		        if (!this.added) {
		            this.alignOnAdd = true;
		            return;
		        }

		        var wrapper = this,
		            renderer = wrapper.renderer,
		            elem = wrapper.element,
		            translateX = wrapper.translateX || 0,
		            translateY = wrapper.translateY || 0,
		            x = wrapper.x || 0,
		            y = wrapper.y || 0,
		            align = wrapper.textAlign || 'left',
		            alignCorrection = { left: 0, center: 0.5, right: 1 }[align],
		            styles = wrapper.styles,
		            whiteSpace = styles && styles.whiteSpace;

		        function getTextPxLength() {
		            // Reset multiline/ellipsis in order to read width (#4928,
		            // #5417)
		            css(elem, {
		                width: '',
		                whiteSpace: whiteSpace || 'nowrap'
		            });
		            return elem.offsetWidth;
		        }

		        // apply translate
		        css(elem, {
		            marginLeft: translateX,
		            marginTop: translateY
		        });

        

		        // apply inversion
		        if (wrapper.inverted) { // wrapper is a group
		            each(elem.childNodes, function (child) {
		                renderer.invertChild(child, elem);
		            });
		        }

		        if (elem.tagName === 'SPAN') {

		            var rotation = wrapper.rotation,
		                baseline,
		                textWidth = wrapper.textWidth && pInt(wrapper.textWidth),
		                currentTextTransform = [
		                    rotation,
		                    align,
		                    elem.innerHTML,
		                    wrapper.textWidth,
		                    wrapper.textAlign
		                ].join(',');

		            // Update textWidth. Use the memoized textPxLength if possible, to
		            // avoid the getTextPxLength function using elem.offsetWidth.
		            // Calling offsetWidth affects rendering time as it forces layout
		            // (#7656).
		            if (
		                textWidth !== wrapper.oldTextWidth &&
		                (
		                    (textWidth > wrapper.oldTextWidth) ||
		                    (wrapper.textPxLength || getTextPxLength()) > textWidth
		                ) &&
		                /[ \-]/.test(elem.textContent || elem.innerText)
		            ) { // #983, #1254
		                css(elem, {
		                    width: textWidth + 'px',
		                    display: 'block',
		                    whiteSpace: whiteSpace || 'normal' // #3331
		                });
		                wrapper.oldTextWidth = textWidth;
		                wrapper.hasBoxWidthChanged = true; // #8159
		            } else {
		                wrapper.hasBoxWidthChanged = false; // #8159
		            }

		            // Do the calculations and DOM access only if properties changed
		            if (currentTextTransform !== wrapper.cTT) {
		                baseline = renderer.fontMetrics(elem.style.fontSize).b;

		                // Renderer specific handling of span rotation, but only if we
		                // have something to update.
		                if (
		                    defined(rotation) &&
		                    rotation !== (wrapper.oldRotation || 0)
		                ) {
		                    wrapper.setSpanRotation(
		                        rotation,
		                        alignCorrection,
		                        baseline
		                    );
		                }

		                wrapper.getSpanCorrection(
		                    // Avoid elem.offsetWidth if we can, it affects rendering
		                    // time heavily (#7656)
		                    (
		                        (!defined(rotation) && wrapper.textPxLength) || // #7920
		                        elem.offsetWidth
		                    ),
		                    baseline,
		                    alignCorrection,
		                    rotation,
		                    align
		                );
		            }

		            // apply position with correction
		            css(elem, {
		                left: (x + (wrapper.xCorr || 0)) + 'px',
		                top: (y + (wrapper.yCorr || 0)) + 'px'
		            });

		            // record current text transform
		            wrapper.cTT = currentTextTransform;
		            wrapper.oldRotation = rotation;
		        }
		    },

		    /**
		     * Set the rotation of an individual HTML span
		     */
		    setSpanRotation: function (rotation, alignCorrection, baseline) {
		        var rotationStyle = {},
		            cssTransformKey = this.renderer.getTransformKey();

		        rotationStyle[cssTransformKey] = rotationStyle.transform =
		            'rotate(' + rotation + 'deg)';
		        rotationStyle[cssTransformKey + (isFirefox ? 'Origin' : '-origin')] =
		        rotationStyle.transformOrigin =
		            (alignCorrection * 100) + '% ' + baseline + 'px';
		        css(this.element, rotationStyle);
		    },

		    /**
		     * Get the correction in X and Y positioning as the element is rotated.
		     */
		    getSpanCorrection: function (width, baseline, alignCorrection) {
		        this.xCorr = -width * alignCorrection;
		        this.yCorr = -baseline;
		    }
		});

		// Extend SvgRenderer for useHTML option.
		extend(SVGRenderer.prototype, /** @lends SVGRenderer.prototype */ {

		    getTransformKey: function () {
		        return isMS && !/Edge/.test(win.navigator.userAgent) ?
		            '-ms-transform' :
		            isWebKit ?
		                '-webkit-transform' :
		                isFirefox ?
		                    'MozTransform' :
		                    win.opera ?
		                        '-o-transform' :
		                        '';
		    },

		    /**
		     * Create HTML text node. This is used by the VML renderer as well as the
		     * SVG renderer through the useHTML option.
		     *
		     * @param {String} str
		     * @param {Number} x
		     * @param {Number} y
		     */
		    html: function (str, x, y) {
		        var wrapper = this.createElement('span'),
		            element = wrapper.element,
		            renderer = wrapper.renderer,
		            isSVG = renderer.isSVG,
		            addSetters = function (element, style) {
		                // These properties are set as attributes on the SVG group, and
		                // as identical CSS properties on the div. (#3542)
		                each(['opacity', 'visibility'], function (prop) {
		                    wrap(element, prop + 'Setter', function (
		                        proceed,
		                        value,
		                        key,
		                        elem
		                    ) {
		                        proceed.call(this, value, key, elem);
		                        style[key] = value;
		                    });
		                });
		                element.addedSetters = true;
		            };

		        // Text setter
		        wrapper.textSetter = function (value) {
		            if (value !== element.innerHTML) {
		                delete this.bBox;
		            }
		            this.textStr = value;
		            element.innerHTML = pick(value, '');
		            wrapper.doTransform = true;
		        };

		        // Add setters for the element itself (#4938)
		        if (isSVG) { // #4938, only for HTML within SVG
		            addSetters(wrapper, wrapper.element.style);
		        }

		        // Various setters which rely on update transform
		        wrapper.xSetter =
		        wrapper.ySetter =
		        wrapper.alignSetter =
		        wrapper.rotationSetter =
		        function (value, key) {
		            if (key === 'align') {
		                // Do not overwrite the SVGElement.align method. Same as VML.
		                key = 'textAlign';
		            }
		            wrapper[key] = value;
		            wrapper.doTransform = true;
		        };

		        // Runs at the end of .attr()
		        wrapper.afterSetters = function () {
		            // Update transform. Do this outside the loop to prevent redundant
		            // updating for batch setting of attributes.
		            if (this.doTransform) {
		                this.htmlUpdateTransform();
		                this.doTransform = false;
		            }
		        };

		        // Set the default attributes
		        wrapper
		            .attr({
		                text: str,
		                x: Math.round(x),
		                y: Math.round(y)
		            })
		            .css({
                
		                position: 'absolute'
		            });

		        // Keep the whiteSpace style outside the wrapper.styles collection
		        element.style.whiteSpace = 'nowrap';

		        // Use the HTML specific .css method
		        wrapper.css = wrapper.htmlCss;

		        // This is specific for HTML within SVG
		        if (isSVG) {
		            wrapper.add = function (svgGroupWrapper) {

		                var htmlGroup,
		                    container = renderer.box.parentNode,
		                    parentGroup,
		                    parents = [];

		                this.parentGroup = svgGroupWrapper;

		                // Create a mock group to hold the HTML elements
		                if (svgGroupWrapper) {
		                    htmlGroup = svgGroupWrapper.div;
		                    if (!htmlGroup) {

		                        // Read the parent chain into an array and read from top
		                        // down
		                        parentGroup = svgGroupWrapper;
		                        while (parentGroup) {

		                            parents.push(parentGroup);

		                            // Move up to the next parent group
		                            parentGroup = parentGroup.parentGroup;
		                        }

		                        // Ensure dynamically updating position when any parent
		                        // is translated
		                        each(parents.reverse(), function (parentGroup) {
		                            var htmlGroupStyle,
		                                cls = attr(parentGroup.element, 'class');

		                            // Common translate setter for X and Y on the HTML
		                            // group. Reverted the fix for #6957 du to
		                            // positioning problems and offline export (#7254,
		                            // #7280, #7529)
		                            function translateSetter(value, key) {
		                                parentGroup[key] = value;

		                                if (key === 'translateX') {
		                                    htmlGroupStyle.left = value + 'px';
		                                } else {
		                                    htmlGroupStyle.top = value + 'px';
		                                }

		                                parentGroup.doTransform = true;
		                            }

		                            if (cls) {
		                                cls = { className: cls };
		                            } // else null

		                            // Create a HTML div and append it to the parent div
		                            // to emulate the SVG group structure
		                            htmlGroup =
		                            parentGroup.div =
		                            parentGroup.div || createElement('div', cls, {
		                                position: 'absolute',
		                                left: (parentGroup.translateX || 0) + 'px',
		                                top: (parentGroup.translateY || 0) + 'px',
		                                display: parentGroup.display,
		                                opacity: parentGroup.opacity, // #5075
		                                pointerEvents: (
		                                    parentGroup.styles &&
		                                    parentGroup.styles.pointerEvents
		                                ) // #5595

		                            // the top group is appended to container
		                            }, htmlGroup || container);

		                            // Shortcut
		                            htmlGroupStyle = htmlGroup.style;

		                            // Set listeners to update the HTML div's position
		                            // whenever the SVG group position is changed.
		                            extend(parentGroup, {
		                                // (#7287) Pass htmlGroup to use
		                                // the related group
		                                classSetter: (function (htmlGroup) {
		                                    return function (value) {
		                                        this.element.setAttribute(
		                                            'class',
		                                            value
		                                        );
		                                        htmlGroup.className = value;
		                                    };
		                                }(htmlGroup)),
		                                on: function () {
		                                    if (parents[0].div) { // #6418
		                                        wrapper.on.apply(
		                                            { element: parents[0].div },
		                                            arguments
		                                        );
		                                    }
		                                    return parentGroup;
		                                },
		                                translateXSetter: translateSetter,
		                                translateYSetter: translateSetter
		                            });
		                            if (!parentGroup.addedSetters) {
		                                addSetters(parentGroup, htmlGroupStyle);
		                            }
		                        });

		                    }
		                } else {
		                    htmlGroup = container;
		                }

		                htmlGroup.appendChild(element);

		                // Shared with VML:
		                wrapper.added = true;
		                if (wrapper.alignOnAdd) {
		                    wrapper.htmlUpdateTransform();
		                }

		                return wrapper;
		            };
		        }
		        return wrapper;
		    }
		});

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
		         