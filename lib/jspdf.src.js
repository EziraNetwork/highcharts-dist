(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.jspdf = factory());
}(this, function () { 'use strict';

    var babelHelpers = {};
    babelHelpers.typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
      return typeof obj;
    } : function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
    babelHelpers;

    /** @preserve
     * jsPDF - PDF Document creation from JavaScript
     * Version 1.2.68 Built on 2017-07-18T14:26:05.034Z
     *                           CommitID 38732db74a
     *
     * Copyright (c) 2010-2014 James Hall <james@parall.ax>, https://github.com/MrRio/jsPDF
     *               2010 Aaron Spike, https://github.com/acspike
     *               2012 Willow Systems Corporation, willow-systems.com
     *               2012 Pablo Hess, https://github.com/pablohess
     *               2012 Florian Jenett, https://github.com/fjenett
     *               2013 Warren Weckesser, https://github.com/warrenweckesser
     *               2013 Youssef Beddad, https://github.com/lifof
     *               2013 Lee Driscoll, https://github.com/lsdriscoll
     *               2013 Stefan Slonevskiy, https://github.com/stefslon
     *               2013 Jeremy Morel, https://github.com/jmorel
     *               2013 Christoph Hartmann, https://github.com/chris-rock
     *               2014 Juan Pablo Gaviria, https://github.com/juanpgaviria
     *               2014 James Makes, https://github.com/dollaruw
     *               2014 Diego Casorran, https://github.com/diegocr
     *               2014 Steven Spungin, https://github.com/Flamenco
     *               2014 Kenneth Glassey, https://github.com/Gavvers
     *
     * Licensed under the MIT License
     *
     * Contributor(s):
     *    siefkenj, ahwolf, rickygu, Midnith, saintclair, eaparango,
     *    kim3er, mfo, alnorth, Flamenco
     */

    /**
     * Creates new jsPDF document object instance.
     *
     * @class
     * @param orientation One of "portrait" or "landscape" (or shortcuts "p" (Default), "l")
     * @param unit        Measurement unit to be used when coordinates are specified.
     *                    One of "pt" (points), "mm" (Default), "cm", "in"
     * @param format      One of 'pageFormats' as shown below, default: a4
     * @returns {jsPDF}
     * @name jsPDF
     */
    var jsPDF = function (global) {
    	'use strict';

    	var pdfVersion = '1.3',
    	    pageFormats = { // Size in pt of various paper formats
    		'a0': [2383.94, 3370.39], 'a1': [1683.78, 2383.94],
    		'a2': [1190.55, 1683.78], 'a3': [841.89, 1190.55],
    		'a4': [595.28, 841.89], 'a5': [419.53, 595.28],
    		'a6': [297.64, 419.53], 'a7': [209.76, 297.64],
    		'a8': [147.40, 209.76], 'a9': [104.88, 147.40],
    		'a10': [73.70, 104.88], 'b0': [2834.65, 4008.19],
    		'b1': [2004.09, 2834.65], 'b2': [1417.32, 2004.09],
    		'b3': [1000.63, 1417.32], 'b4': [708.66, 1000.63],
    		'b5': [498.90, 708.66], 'b6': [354.33, 498.90],
    		'b7': [249.45, 354.33], 'b8': [175.75, 249.45],
    		'b9': [124.72, 175.75], 'b10': [87.87, 124.72],
    		'c0': [2599.37, 3676.54], 'c1': [1836.85, 2599.37],
    		'c2': [1298.27, 1836.85], 'c3': [918.43, 1298.27],
    		'c4': [649.13, 918.43], 'c5': [459.21, 649.13],
    		'c6': [323.15, 459.21], 'c7': [229.61, 323.15],
    		'c8': [161.57, 229.61], 'c9': [113.39, 161.57],
    		'c10': [79.37, 113.39], 'dl': [311.81, 623.62],
    		'letter': [612, 792],
    		'government-letter': [576, 756],
    		'legal': [612, 1008],
    		'junior-legal': [576, 360],
    		'ledger': [1224, 792],
    		'tabloid': [792, 1224],
    		'credit-card': [153, 243]
    	};

    	/**
      * jsPDF's Internal PubSub Implementation.
      * See mrrio.github.io/jsPDF/doc/symbols/PubSub.html
      * Backward compatible rewritten on 2014 by
      * Diego Casorran, https://github.com/diegocr
      *
      * @class
      * @name PubSub
      */
    	function PubSub(context) {
    		var topics = {};

    		this.subscribe = function (topic, callback, once) {
    			if (typeof callback !== 'function') {
    				return false;
    			}

    			if (!topics.hasOwnProperty(topic)) {
    				topics[topic] = {};
    			}

    			var id = Math.random().toString(35);
    			topics[topic][id] = [callback, !!once];

    			return id;
    		};

    		this.unsubscribe = function (token) {
    			for (var topic in topics) {
    				if (topics[topic][token]) {
    					delete topics[topic][token];
    					return true;
    				}
    			}
    			return false;
    		};

    		this.publish = function (topic) {
    			if (topics.hasOwnProperty(topic)) {
    				var args = Array.prototype.slice.call(arguments, 1),
    				    idr = [];

    				for (var id in topics[topic]) {
    					var sub = topics[topic][id];
    					try {
    						sub[0].apply(context, args);
    					} catch (ex) {
    						if (global.console) {
    							console.error('jsPDF PubSub Error', ex.message, ex);
    						}
    					}
    					if (sub[1]) idr.push(id);
    				}
    				if (idr.length) idr.forEach(this.unsubscribe);
    			}
    		};
    	}

    	/**
      * @constructor
      * @private
      */
    	function jsPDF(orientation, unit, format, compressPdf) {
    		var options = {};

    		if ((typeof orientation === 'undefined' ? 'undefined' : babelHelpers.typeof(orientation)) === 'object') {
    			options = orientation;

    			orientation = options.orientation;
    			unit = options.unit || unit;
    			format = options.format || format;
    			compressPdf = options.compress || options.compressPdf || compressPdf;
    		}

    		// Default options
    		unit = unit || 'mm';
    		format = format || 'a4';
    		orientation = ('' + (orientation || 'P')).toLowerCase();

    		var format_as_string = ('' + format).toLowerCase(),
    		    compress = !!compressPdf && typeof Uint8Array === 'function',
    		    textColor = options.textColor || '0 g',
    		    drawColor = options.drawColor || '0 G',
    		    activeFontSize = options.fontSize || 16,
    		    lineHeightProportion = options.lineHeight || 1.15,
    		    lineWidth = options.lineWidth || 0.200025,
    		    // 2mm
    		objectNumber = 2,
    		    // 'n' Current object number
    		outToPages = !1,
    		    // switches where out() prints. outToPages true = push to pages obj. outToPages false = doc builder content
    		offsets = [],
    		    // List of offsets. Activated and reset by buildDocument(). Pupulated by various calls buildDocument makes.
    		fonts = {},
    		    // collection of font objects, where key is fontKey - a dynamically created label for a given font.
    		fontmap = {},
    		    // mapping structure fontName > fontStyle > font key - performance layer. See addFont()
    		activeFontKey,
    		    // will be string representing the KEY of the font as combination of fontName + fontStyle

    		fontStateStack = [],
    		    //

    		patterns = {},
    		    // collection of pattern objects
    		patternMap = {},
    		    // see fonts

    		gStates = {},
    		    // collection of graphic state objects
    		gStatesMap = {},
    		    // see fonts
    		activeGState = null,
    		    k,
    		    // Scale factor
    		tmp,
    		    page = 0,
    		    currentPage,
    		    pages = [],
    		    pagesContext = [],
    		    // same index as pages and pagedim
    		pagedim = [],
    		    content = [],
    		    additionalObjects = [],
    		    lineCapID = 0,
    		    lineJoinID = 0,
    		    content_length = 0,
    		    renderTargets = {},
    		    renderTargetMap = {},
    		    renderTargetStack = [],
    		    pageX,
    		    pageY,
    		    pageMatrix,
    		    // only used for FormObjects
    		pageWidth,
    		    pageHeight,
    		    pageMode,
    		    zoomMode,
    		    layoutMode,
    		    documentProperties = {
    			'title': '',
    			'subject': '',
    			'author': '',
    			'keywords': '',
    			'creator': ''
    		},
    		    API = {},
    		    events = new PubSub(API),


    		/////////////////////
    		// Private functions
    		/////////////////////
    		f2 = function f2(number) {
    			return number.toFixed(2); // Ie, %.2f
    		},
    		    f3 = function f3(number) {
    			return number.toFixed(3); // Ie, %.3f
    		},
    		    padd2 = function padd2(number) {
    			return ('0' + parseInt(number)).slice(-2);
    		},
    		    padd2Hex = function padd2Hex(hexString) {
    			var s = "00" + hexString;
    			return s.substr(s.length - 2);
    		},
    		    out = function out(string) {
    			if (outToPages) {
    				/* set by beginPage */
    				pages[currentPage].push(string);
    			} else {
    				// +1 for '\n' that will be used to join 'content'
    				content_length += string.length + 1;
    				content.push(string);
    			}
    		},
    		    newObject = function newObject() {
    			// Begin a new object
    			objectNumber++;
    			offsets[objectNumber] = content_length;
    			out(objectNumber + ' 0 obj');
    			return objectNumber;
    		},

    		// Does not output the object until after the pages have been output.
    		// Returns an object containing the objectId and content.
    		// All pages have been added so the object ID can be estimated to start right after.
    		// This does not modify the current objectNumber;  It must be updated after the newObjects are output.
    		newAdditionalObject = function newAdditionalObject() {
    			var objId = pages.length * 2 + 1;
    			objId += additionalObjects.length;
    			var obj = { objId: objId, content: '' };
    			additionalObjects.push(obj);
    			return obj;
    		},

    		// Does not output the object.  The caller must call newObjectDeferredBegin(oid) before outputing any data
    		newObjectDeferred = function newObjectDeferred() {
    			objectNumber++;
    			offsets[objectNumber] = function () {
    				return content_length;
    			};
    			return objectNumber;
    		},
    		    newObjectDeferredBegin = function newObjectDeferredBegin(oid) {
    			offsets[oid] = content_length;
    		},
    		    putStream = function putStream(str) {
    			out('stream');
    			out(str);
    			out('endstream');
    		},
    		    putPages = function putPages() {
    			var n, p, arr, i, deflater, adler32, adler32cs, wPt, hPt;

    			adler32cs = global.adler32cs || jsPDF.adler32cs;
    			if (compress && typeof adler32cs === 'undefined') {
    				compress = false;
    			}

    			// outToPages = false as set in endDocument(). out() writes to content.

    			for (n = 1; n <= page; n++) {
    				newObject();
    				wPt = (pageWidth = pagedim[n].width) * k;
    				hPt = (pageHeight = pagedim[n].height) * k;
    				out('<</Type /Page');
    				out('/Parent 1 0 R');
    				out('/Resources 2 0 R');
    				out('/MediaBox [0 0 ' + f2(wPt) + ' ' + f2(hPt) + ']');
    				// Added for annotation plugin
    				events.publish('putPage', { pageNumber: n, page: pages[n] });
    				out('/Contents ' + (objectNumber + 1) + ' 0 R');
    				out('>>');
    				out('endobj');

    				// Page content
    				p = pages[n].join('\n');

    				// prepend global change of basis matrix
    				// (Now, instead of converting every coordinate to the pdf coordinate system, we apply a matrix
    				// that does this job for us (however, texts, images and similar objects must be drawn bottom up))
    				p = new Matrix(k, 0, 0, -k, 0, pageHeight).toString() + " cm\n" + p;

    				newObject();
    				if (compress) {
    					arr = [];
    					i = p.length;
    					while (i--) {
    						arr[i] = p.charCodeAt(i);
    					}
    					adler32 = adler32cs.from(p);
    					deflater = new Deflater(6);
    					deflater.append(new Uint8Array(arr));
    					p = deflater.flush();
    					arr = new Uint8Array(p.length + 6);
    					arr.set(new Uint8Array([120, 156]));
    					arr.set(p, 2);
    					arr.set(new Uint8Array([adler32 & 0xFF, adler32 >> 8 & 0xFF, adler32 >> 16 & 0xFF, adler32 >> 24 & 0xFF]), p.length + 2);
    					p = String.fromCharCode.apply(null, arr);
    					out('<</Length ' + p.length + ' /Filter [/FlateDecode]>>');
    				} else {
    					out('<</Length ' + p.length + '>>');
    				}
    				putStream(p);
    				out('endobj');
    			}
    			offsets[1] = content_length;
    			out('1 0 obj');
    			out('<</Type /Pages');
    			var kids = '/Kids [';
    			for (i = 0; i < page; i++) {
    				kids += 3 + 2 * i + ' 0 R ';
    			}
    			out(kids + ']');
    			out('/Count ' + page);
    			out('>>');
    			out('endobj');
    			events.publish('postPutPages');
    		},
    		    putFont = function putFont(font) {
    			font.objectNumber = newObject();
    			out('<</BaseFont/' + font.PostScriptName + '/Type/Font');
    			if (typeof font.encoding === 'string') {
    				out('/Encoding/' + font.encoding);
    			}
    			out('/Subtype/Type1>>');
    			out('endobj');
    		},
    		    putFonts = function putFonts() {
    			for (var fontKey in fonts) {
    				if (fonts.hasOwnProperty(fontKey)) {
    					putFont(fonts[fontKey]);
    				}
    			}
    		},
    		    putXObject = function putXObject(xObject) {
    			xObject.objectNumber = newObject();
    			out("<<");
    			out("/Type /XObject");
    			out("/Subtype /Form");
    			out("/BBox [" + [f2(xObject.x), f2(xObject.y), f2(xObject.x + xObject.width), f2(xObject.y + xObject.height)].join(" ") + "]");
    			out("/Matrix [" + xObject.matrix.toString() + "]");
    			// TODO: /Resources

    			var p = xObject.pages[1].join("\n");
    			out("/Length " + p.length);

    			out(">>");
    			putStream(p);
    			out("endobj");
    		},
    		    putXObjects = function putXObjects() {
    			for (var xObjectKey in renderTargets) {
    				if (renderTargets.hasOwnProperty(xObjectKey)) {
    					putXObject(renderTargets[xObjectKey]);
    				}
    			}
    		},
    		    interpolateAndEncodeRGBStream = function interpolateAndEncodeRGBStream(colors, numberSamples) {
    			var tValues = [];
    			var t;
    			var dT = 1.0 / (numberSamples - 1);
    			for (t = 0.0; t < 1.0; t += dT) {
    				tValues.push(t);
    			}
    			tValues.push(1.0);

    			// add first and last control point if not present
    			if (colors[0].offset != 0.0) {
    				var c0 = {
    					offset: 0.0,
    					color: colors[0].color
    				};
    				colors.unshift(c0);
    			}
    			if (colors[colors.length - 1].offset != 1.0) {
    				var c1 = {
    					offset: 1.0,
    					color: colors[colors.length - 1].color
    				};
    				colors.push(c1);
    			}

    			var out = "";
    			var index = 0;

    			for (var i = 0; i < tValues.length; i++) {
    				t = tValues[i];

    				while (t > colors[index + 1].offset) {
    					index++;
    				}var a = colors[index].offset;
    				var b = colors[index + 1].offset;
    				var d = (t - a) / (b - a);

    				var aColor = colors[index].color;
    				var bColor = colors[index + 1].color;

    				out += padd2Hex(Math.round((1 - d) * aColor[0] + d * bColor[0]).toString(16)) + padd2Hex(Math.round((1 - d) * aColor[1] + d * bColor[1]).toString(16)) + padd2Hex(Math.round((1 - d) * aColor[2] + d * bColor[2]).toString(16));
    			}
    			return out.trim();
    		},
    		    putShadingPattern = function putShadingPattern(pattern, numberSamples) {
    			/*
        Axial patterns shade between the two points specified in coords, radial patterns between the inner
        and outer circle.
          The user can specify an array (colors) that maps t-Values in [0, 1] to RGB colors. These are now
        interpolated to equidistant samples and written to pdf as a sample (type 0) function.
        */

    			// The number of color samples that should be used to describe the shading.
    			// The higher, the more accurate the gradient will be.
    			numberSamples || (numberSamples = 21);

    			var funcObjectNumber = newObject();
    			var stream = interpolateAndEncodeRGBStream(pattern.colors, numberSamples);
    			out("<< /FunctionType 0");
    			out("/Domain [0.0 1.0]");
    			out("/Size [" + numberSamples + "]");
    			out("/BitsPerSample 8");
    			out("/Range [0.0 1.0 0.0 1.0 0.0 1.0]");
    			out("/Decode [0.0 1.0 0.0 1.0 0.0 1.0]");
    			out("/Length " + stream.length);
    			// The stream is Hex encoded
    			out("/Filter /ASCIIHexDecode");
    			out(">>");
    			putStream(stream);
    			out("endobj");

    			pattern.objectNumber = newObject();
    			out("<< /ShadingType " + pattern.type);
    			out("/ColorSpace /DeviceRGB");

    			var coords = "/Coords [" + f3(parseFloat(pattern.coords[0])) + " " // x1
    			+ f3(parseFloat(pattern.coords[1])) + " "; // y1
    			if (pattern.type === 2) {
    				// axial
    				coords += f3(parseFloat(pattern.coords[2])) + " " // x2
    				+ f3(parseFloat(pattern.coords[3])); // y2
    			} else {
    				// radial
    				coords += f3(parseFloat(pattern.coords[2])) + " " // r1
    				+ f3(parseFloat(pattern.coords[3])) + " " // x2
    				+ f3(parseFloat(pattern.coords[4])) + " " // y2
    				+ f3(parseFloat(pattern.coords[5])); // r2
    			}
    			coords += "]";
    			out(coords);

    			if (pattern.matrix) {
    				out("/Matrix [" + pattern.matrix.toString() + "]");
    			}

    			out("/Function " + funcObjectNumber + " 0 R");
    			out("/Extend [true true]");
    			out(">>");
    			out("endobj");
    		},
    		    putTilingPattern = function putTilingPattern(pattern) {
    			var resourcesObjectNumber = newObject();
    			out("<<");
    			putResourceDictionary();
    			out(">>");
    			out("endobj");

    			pattern.objectNumber = newObject();
    			out("<< /Type /Pattern");
    			out("/PatternType 1"); // tiling pattern
    			out("/PaintType 1"); // colored tiling pattern
    			out("/TilingType 1"); // constant spacing
    			out("/BBox [" + pattern.boundingBox.map(f3).join(" ") + "]");
    			out("/XStep " + f3(pattern.xStep));
    			out("/YStep " + f3(pattern.yStep));
    			out("/Length " + pattern.stream.length);
    			out("/Resources " + resourcesObjectNumber + " 0 R"); // TODO: resources
    			pattern.matrix && out("/Matrix [" + pattern.matrix.toString() + "]");

    			out(">>");

    			putStream(pattern.stream);

    			out("endobj");
    		},
    		    putPatterns = function putPatterns() {
    			var patternKey;
    			for (patternKey in patterns) {
    				if (patterns.hasOwnProperty(patternKey)) {
    					if (patterns[patternKey] instanceof API.ShadingPattern) {
    						putShadingPattern(patterns[patternKey]);
    					} else if (patterns[patternKey] instanceof API.TilingPattern) {
    						putTilingPattern(patterns[patternKey]);
    					}
    				}
    			}
    		},
    		    putGState = function putGState(gState) {
    			gState.objectNumber = newObject();
    			out("<<");
    			for (var p in gState) {
    				switch (p) {
    					case "opacity":
    						out("/ca " + f2(gState[p]));
    						break;
    				}
    			}
    			out(">>");
    			out("endobj");
    		},
    		    putGStates = function putGStates() {
    			var gStateKey;
    			for (gStateKey in gStates) {
    				if (gStates.hasOwnProperty(gStateKey)) {
    					putGState(gStates[gStateKey]);
    				}
    			}
    		},
    		    putXobjectDict = function putXobjectDict() {
    			for (var xObjectKey in renderTargets) {
    				if (renderTargets.hasOwnProperty(xObjectKey) && renderTargets[xObjectKey].objectNumber >= 0) {
    					out("/" + xObjectKey + " " + renderTargets[xObjectKey].objectNumber + " 0 R");
    				}
    			}

    			events.publish('putXobjectDict');
    		},
    		    putShadingPatternDict = function putShadingPatternDict() {
    			for (var patternKey in patterns) {
    				if (patterns.hasOwnProperty(patternKey) && patterns[patternKey] instanceof API.ShadingPattern && patterns[patternKey].objectNumber >= 0) {
    					out("/" + patternKey + " " + patterns[patternKey].objectNumber + " 0 R");
    				}
    			}

    			events.publish("putShadingPatternDict");
    		},
    		    putTilingPatternDict = function putTilingPatternDict() {
    			for (var patternKey in patterns) {
    				if (patterns.hasOwnProperty(patternKey) && patterns[patternKey] instanceof API.TilingPattern && patterns[patternKey].objectNumber >= 0) {
    					out("/" + patternKey + " " + patterns[patternKey].objectNumber + " 0 R");
    				}
    			}

    			events.publish("putTilingPatternDict");
    		},
    		    putGStatesDict = function putGStatesDict() {
    			var gStateKey;
    			for (gStateKey in gStates) {
    				if (gStates.hasOwnProperty(gStateKey) && gStates[gStateKey].objectNumber >= 0) {
    					out("/" + gStateKey + " " + gStates[gStateKey].objectNumber + " 0 R");
    				}
    			}

    			events.publish("putGStateDict");
    		},
    		    putResourceDictionary = function putResourceDictionary() {
    			out('/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]');
    			out('/Font <<');
    			// Do this for each font, the '1' bit is the index of the font
    			for (var fontKey in fonts) {
    				if (fonts.hasOwnProperty(fontKey)) {
    					out('/' + fontKey + ' ' + fonts[fontKey].objectNumber + ' 0 R');
    				}
    			}
    			out('>>');

    			out("/Shading <<");
    			putShadingPatternDict();
    			out(">>");

    			out("/Pattern <<");
    			putTilingPatternDict();
    			out(">>");

    			out("/ExtGState <<");
    			putGStatesDict();
    			out('>>');

    			out('/XObject <<');
    			putXobjectDict();
    			out('>>');
    		},
    		    putResources = function putResources() {
    			putFonts();
    			putGStates();
    			putXObjects();
    			putPatterns();
    			events.publish('putResources');
    			// Resource dictionary
    			offsets[2] = content_length;
    			out('2 0 obj');
    			out('<<');
    			putResourceDictionary();
    			out('>>');
    			out('endobj');
    			events.publish('postPutResources');
    		},
    		    putAdditionalObjects = function putAdditionalObjects() {
    			events.publish('putAdditionalObjects');
    			for (var i = 0; i < additionalObjects.length; i++) {
    				var obj = additionalObjects[i];
    				offsets[obj.objId] = content_length;
    				out(obj.objId + ' 0 obj');
    				out(obj.content);
    				out('endobj');
    			}
    			objectNumber += additionalObjects.length;
    			events.publish('postPutAdditionalObjects');
    		},
    		    addToFontDictionary = function addToFontDictionary(fontKey, fontName, fontStyle) {
    			// this is mapping structure for quick font key lookup.
    			// returns the KEY of the font (ex: "F1") for a given
    			// pair of font name and type (ex: "Arial". "Italic")
    			if (!fontmap.hasOwnProperty(fontName)) {
    				fontmap[fontName] = {};
    			}
    			fontmap[fontName][fontStyle] = fontKey;
    		},

    		/**
       * FontObject describes a particular font as member of an instnace of jsPDF
       *
       * It's a collection of properties like 'id' (to be used in PDF stream),
       * 'fontName' (font's family name), 'fontStyle' (font's style variant label)
       *
       * @public
       * @property id {String} PDF-document-instance-specific label assinged to the font.
       * @property PostScriptName {String} PDF specification full name for the font
       * @property encoding {Object} Encoding_name-to-Font_metrics_object mapping.
       * @name FontObject
       */
    		addFont = function addFont(PostScriptName, fontName, fontStyle, encoding) {
    			var fontKey = 'F' + (Object.keys(fonts).length + 1).toString(10),

    			// This is FontObject
    			font = fonts[fontKey] = {
    				'id': fontKey,
    				'PostScriptName': PostScriptName,
    				'fontName': fontName,
    				'fontStyle': fontStyle,
    				'encoding': encoding,
    				'metadata': {}
    			};
    			addToFontDictionary(fontKey, fontName, fontStyle);
    			events.publish('addFont', font);

    			return fontKey;
    		},
    		    addFonts = function addFonts() {

    			var HELVETICA = "helvetica",
    			    TIMES = "times",
    			    COURIER = "courier",
    			    NORMAL = "normal",
    			    BOLD = "bold",
    			    ITALIC = "italic",
    			    BOLD_ITALIC = "bolditalic",
    			    encoding = 'StandardEncoding',
    			    ZAPF = "zapfdingbats",
    			    standardFonts = [['Helvetica', HELVETICA, NORMAL], ['Helvetica-Bold', HELVETICA, BOLD], ['Helvetica-Oblique', HELVETICA, ITALIC], ['Helvetica-BoldOblique', HELVETICA, BOLD_ITALIC], ['Courier', COURIER, NORMAL], ['Courier-Bold', COURIER, BOLD], ['Courier-Oblique', COURIER, ITALIC], ['Courier-BoldOblique', COURIER, BOLD_ITALIC], ['Times-Roman', TIMES, NORMAL], ['Times-Bold', TIMES, BOLD], ['Times-Italic', TIMES, ITALIC], ['Times-BoldItalic', TIMES, BOLD_ITALIC], ['ZapfDingbats', ZAPF]];

    			for (var i = 0, l = standardFonts.length; i < l; i++) {
    				var fontKey = addFont(standardFonts[i][0], standardFonts[i][1], standardFonts[i][2], encoding);

    				// adding aliases for standard fonts, this time matching the capitalization
    				var parts = standardFonts[i][0].split('-');
    				addToFontDictionary(fontKey, parts[0], parts[1] || '');
    			}
    			events.publish('addFonts', { fonts: fonts, dictionary: fontmap });
    		},
    		    matrixMult = function matrixMult(m1, m2) {
    			return new Matrix(m1.a * m2.a + m1.b * m2.c, m1.a * m2.b + m1.b * m2.d, m1.c * m2.a + m1.d * m2.c, m1.c * m2.b + m1.d * m2.d, m1.e * m2.a + m1.f * m2.c + m2.e, m1.e * m2.b + m1.f * m2.d + m2.f);
    		},
    		    Matrix = function Matrix(a, b, c, d, e, f) {
    			this.a = a;
    			this.b = b;
    			this.c = c;
    			this.d = d;
    			this.e = e;
    			this.f = f;
    		};

    		Matrix.prototype = {
    			toString: function toString() {
    				return [f3(this.a), f3(this.b), f3(this.c), f3(this.d), f3(this.e), f3(this.f)].join(" ");
    			}
    		};

    		var unitMatrix = new Matrix(1, 0, 0, 1, 0, 0),


    		// Used (1) to save the current stream state to the XObjects stack and (2) to save completed form
    		// objects in the xObjects map.
    		RenderTarget = function RenderTarget() {
    			this.page = page;
    			this.currentPage = currentPage;
    			this.pages = pages.slice(0);
    			this.pagedim = pagedim.slice(0);
    			this.pagesContext = pagesContext.slice(0);
    			this.x = pageX;
    			this.y = pageY;
    			this.matrix = pageMatrix;
    			this.width = pageWidth;
    			this.height = pageHeight;

    			this.id = ""; // set by endFormObject()
    			this.objectNumber = -1; // will be set by putXObject()
    		};

    		RenderTarget.prototype = {
    			restore: function restore() {
    				page = this.page;
    				currentPage = this.currentPage;
    				pagesContext = this.pagesContext;
    				pagedim = this.pagedim;
    				pages = this.pages;
    				pageX = this.x;
    				pageY = this.y;
    				pageMatrix = this.matrix;
    				pageWidth = this.width;
    				pageHeight = this.height;
    			}
    		};

    		var beginNewRenderTarget = function beginNewRenderTarget(x, y, width, height, matrix) {
    			// save current state
    			renderTargetStack.push(new RenderTarget());

    			// clear pages
    			page = currentPage = 0;
    			pages = [];
    			pageX = x;
    			pageY = y;

    			pageMatrix = matrix;

    			beginPage(width, height);
    		},
    		    endFormObject = function endFormObject(key) {
    			// only add it if it is not already present (the keys provided by the user must be unique!)
    			if (renderTargetMap[key]) return;

    			// save the created xObject
    			var newXObject = new RenderTarget();

    			var xObjectId = 'Xo' + (Object.keys(renderTargets).length + 1).toString(10);
    			newXObject.id = xObjectId;

    			renderTargetMap[key] = xObjectId;
    			renderTargets[xObjectId] = newXObject;

    			events.publish('addFormObject', newXObject);

    			// restore state from stack
    			renderTargetStack.pop().restore();
    		},


    		/**
       * Adds a new pattern for later use.
       * @param {String} key The key by it can be referenced later. The keys must be unique!
       * @param {API.Pattern} pattern The pattern
       */
    		addPattern = function addPattern(key, pattern) {
    			// only add it if it is not already present (the keys provided by the user must be unique!)
    			if (patternMap[key]) return;

    			var prefix = pattern instanceof API.ShadingPattern ? "Sh" : "P";
    			var patternKey = prefix + (Object.keys(patterns).length + 1).toString(10);
    			pattern.id = patternKey;

    			patternMap[key] = patternKey;
    			patterns[patternKey] = pattern;

    			events.publish('addPattern', pattern);
    		},


    		/**
       * Adds a new Graphics State. Duplicates are automatically eliminated.
       * @param {String} key Might also be null, if no later reference to this gState is needed
       * @param {Object} gState The gState object
       */
    		addGState = function addGState(key, gState) {
    			// only add it if it is not already present (the keys provided by the user must be unique!)
    			if (key && gStatesMap[key]) return;

    			var duplicate = false;
    			for (var s in gStates) {
    				if (gStates.hasOwnProperty(s)) {
    					if (gStates[s].equals(gState)) {
    						duplicate = true;
    						break;
    					}
    				}
    			}

    			if (duplicate) {
    				gState = gStates[s];
    			} else {
    				var gStateKey = 'GS' + (Object.keys(gStates).length + 1).toString(10);
    				gStates[gStateKey] = gState;
    				gState.id = gStateKey;
    			}

    			// several user keys may point to the same GState object
    			key && (gStatesMap[key] = gState.id);

    			events.publish('addGState', gState);

    			return gState;
    		},
    		    SAFE = function __safeCall(fn) {
    			fn.foo = function __safeCallWrapper() {
    				try {
    					return fn.apply(this, arguments);
    				} catch (e) {
    					var stack = e.stack || '';
    					if (~stack.indexOf(' at ')) stack = stack.split(" at ")[1];
    					var m = "Error in function " + stack.split("\n")[0].split('<')[0] + ": " + e.message;
    					if (global.console) {
    						global.console.error(m, e);
    						if (global.alert) alert(m);
    					} else {
    						throw new Error(m);
    					}
    				}
    			};
    			fn.foo.bar = fn;
    			return fn.foo;
    		},
    		    to8bitStream = function to8bitStream(text, flags) {
    			/**
        * PDF 1.3 spec:
        * "For text strings encoded in Unicode, the first two bytes must be 254 followed by
        * 255, representing the Unicode byte order marker, U+FEFF. (This sequence conflicts
        * with the PDFDocEncoding character sequence thorn ydieresis, which is unlikely
        * to be a meaningful beginning of a word or phrase.) The remainder of the
        * string consists of Unicode character codes, according to the UTF-16 encoding
        * specified in the Unicode standard, version 2.0. Commonly used Unicode values
        * are represented as 2 bytes per character, with the high-order byte appearing first
        * in the string."
        *
        * In other words, if there are chars in a string with char code above 255, we
        * recode the string to UCS2 BE - string doubles in length and BOM is prepended.
        *
        * HOWEVER!
        * Actual *content* (body) text (as opposed to strings used in document properties etc)
        * does NOT expect BOM. There, it is treated as a literal GID (Glyph ID)
        *
        * Because of Adobe's focus on "you subset your fonts!" you are not supposed to have
        * a font that maps directly Unicode (UCS2 / UTF16BE) code to font GID, but you could
        * fudge it with "Identity-H" encoding and custom CIDtoGID map that mimics Unicode
        * code page. There, however, all characters in the stream are treated as GIDs,
        * including BOM, which is the reason we need to skip BOM in content text (i.e. that
        * that is tied to a font).
        *
        * To signal this "special" PDFEscape / to8bitStream handling mode,
        * API.text() function sets (unless you overwrite it with manual values
        * given to API.text(.., flags) )
        * flags.autoencode = true
        * flags.noBOM = true
        *
        * ===================================================================================
        * `flags` properties relied upon:
        *   .sourceEncoding = string with encoding label.
        *                     "Unicode" by default. = encoding of the incoming text.
        *                     pass some non-existing encoding name
        *                     (ex: 'Do not touch my strings! I know what I am doing.')
        *                     to make encoding code skip the encoding step.
        *   .outputEncoding = Either valid PDF encoding name
        *                     (must be supported by jsPDF font metrics, otherwise no encoding)
        *                     or a JS object, where key = sourceCharCode, value = outputCharCode
        *                     missing keys will be treated as: sourceCharCode === outputCharCode
        *   .noBOM
        *       See comment higher above for explanation for why this is important
        *   .autoencode
        *       See comment higher above for explanation for why this is important
        */

    			var i, l, sourceEncoding, encodingBlock, outputEncoding, newtext, isUnicode, ch, bch;

    			flags = flags || {};
    			sourceEncoding = flags.sourceEncoding || 'Unicode';
    			outputEncoding = flags.outputEncoding;

    			// This 'encoding' section relies on font metrics format
    			// attached to font objects by, among others,
    			// "Willow Systems' standard_font_metrics plugin"
    			// see jspdf.plugin.standard_font_metrics.js for format
    			// of the font.metadata.encoding Object.
    			// It should be something like
    			//   .encoding = {'codePages':['WinANSI....'], 'WinANSI...':{code:code, ...}}
    			//   .widths = {0:width, code:width, ..., 'fof':divisor}
    			//   .kerning = {code:{previous_char_code:shift, ..., 'fof':-divisor},...}
    			if ((flags.autoencode || outputEncoding) && fonts[activeFontKey].metadata && fonts[activeFontKey].metadata[sourceEncoding] && fonts[activeFontKey].metadata[sourceEncoding].encoding) {
    				encodingBlock = fonts[activeFontKey].metadata[sourceEncoding].encoding;

    				// each font has default encoding. Some have it clearly defined.
    				if (!outputEncoding && fonts[activeFontKey].encoding) {
    					outputEncoding = fonts[activeFontKey].encoding;
    				}

    				// Hmmm, the above did not work? Let's try again, in different place.
    				if (!outputEncoding && encodingBlock.codePages) {
    					outputEncoding = encodingBlock.codePages[0]; // let's say, first one is the default
    				}

    				if (typeof outputEncoding === 'string') {
    					outputEncoding = encodingBlock[outputEncoding];
    				}
    				// we want output encoding to be a JS Object, where
    				// key = sourceEncoding's character code and
    				// value = outputEncoding's character code.
    				if (outputEncoding) {
    					isUnicode = false;
    					newtext = [];
    					for (i = 0, l = text.length; i < l; i++) {
    						ch = outputEncoding[text.charCodeAt(i)];
    						if (ch) {
    							newtext.push(String.fromCharCode(ch));
    						} else {
    							newtext.push(text[i]);
    						}

    						// since we are looping over chars anyway, might as well
    						// check for residual unicodeness
    						if (newtext[i].charCodeAt(0) >> 8) {
    							/* more than 255 */
    							isUnicode = true;
    						}
    					}
    					text = newtext.join('');
    				}
    			}

    			i = text.length;
    			// isUnicode may be set to false above. Hence the triple-equal to undefined
    			while (isUnicode === undefined && i !== 0) {
    				if (text.charCodeAt(i - 1) >> 8) {
    					/* more than 255 */
    					isUnicode = true;
    				}
    				i--;
    			}
    			if (!isUnicode) {
    				return text;
    			}

    			newtext = flags.noBOM ? [] : [254, 255];
    			for (i = 0, l = text.length; i < l; i++) {
    				ch = text.charCodeAt(i);
    				bch = ch >> 8; // divide by 256
    				if (bch >> 8) {
    					/* something left after dividing by 256 second time */
    					throw new Error("Character at position " + i + " of string '" + text + "' exceeds 16bits. Cannot be encoded into UCS-2 BE");
    				}
    				newtext.push(bch);
    				newtext.push(ch - (bch << 8));
    			}
    			return String.fromCharCode.apply(undefined, newtext);
    		},
    		    pdfEscape = function pdfEscape(text, flags) {
    			/**
        * Replace '/', '(', and ')' with pdf-safe versions
        *
        * Doing to8bitStream does NOT make this PDF display unicode text. For that
        * we also need to reference a unicode font and embed it - royal pain in the rear.
        *
        * There is still a benefit to to8bitStream - PDF simply cannot handle 16bit chars,
        * which JavaScript Strings are happy to provide. So, while we still cannot display
        * 2-byte characters property, at least CONDITIONALLY converting (entire string containing)
        * 16bit chars to (USC-2-BE) 2-bytes per char + BOM streams we ensure that entire PDF
        * is still parseable.
        * This will allow immediate support for unicode in document properties strings.
        */
    			return to8bitStream(text, flags).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    		},
    		    putInfo = function putInfo() {
    			out('/Producer (jsPDF ' + jsPDF.version + ')');
    			for (var key in documentProperties) {
    				if (documentProperties.hasOwnProperty(key) && documentProperties[key]) {
    					out('/' + key.substr(0, 1).toUpperCase() + key.substr(1) + ' (' + pdfEscape(documentProperties[key]) + ')');
    				}
    			}
    			var created = new Date(),
    			    tzoffset = created.getTimezoneOffset(),
    			    tzsign = tzoffset < 0 ? '+' : '-',
    			    tzhour = Math.floor(Math.abs(tzoffset / 60)),
    			    tzmin = Math.abs(tzoffset % 60),
    			    tzstr = [tzsign, padd2(tzhour), "'", padd2(tzmin), "'"].join('');
    			out(['/CreationDate (D:', created.getFullYear(), padd2(created.getMonth() + 1), padd2(created.getDate()), padd2(created.getHours()), padd2(created.getMinutes()), padd2(created.getSeconds()), tzstr, ')'].join(''));
    		},
    		    putCatalog = function putCatalog() {
    			out('/Type /Catalog');
    			out('/Pages 1 0 R');
    			// PDF13ref Section 7.2.1
    			if (!zoomMode) zoomMode = 'fullwidth';
    			switch (zoomMode) {
    				case 'fullwidth':
    					out('/OpenAction [3 0 R /FitH null]');break;
    				case 'fullheight':
    					out('/OpenAction [3 0 R /FitV null]');break;
    				case 'fullpage':
    					out('/OpenAction [3 0 R /Fit]');break;
    				case 'original':
    					out('/OpenAction [3 0 R /XYZ null null 1]');break;
    				default:
    					var pcn = '' + zoomMode;
    					if (pcn.substr(pcn.length - 1) === '%') zoomMode = parseInt(zoomMode) / 100;
    					if (typeof zoomMode === 'number') {
    						out('/OpenAction [3 0 R /XYZ null null ' + f2(zoomMode) + ']');
    					}
    			}
    			if (!layoutMode) layoutMode = 'continuous';
    			switch (layoutMode) {
    				case 'continuous':
    					out('/PageLayout /OneColumn');break;
    				case 'single':
    					out('/PageLayout /SinglePage');break;
    				case 'two':
    				case 'twoleft':
    					out('/PageLayout /TwoColumnLeft');break;
    				case 'tworight':
    					out('/PageLayout /TwoColumnRight');break;
    			}
    			if (pageMode) {
    				/**
         * A name object specifying how the document should be displayed when opened:
         * UseNone      : Neither document outline nor thumbnail images visible -- DEFAULT
         * UseOutlines  : Document outline visible
         * UseThumbs    : Thumbnail images visible
         * FullScreen   : Full-screen mode, with no menu bar, window controls, or any other window visible
         */
    				out('/PageMode /' + pageMode);
    			}
    			events.publish('putCatalog');
    		},
    		    putTrailer = function putTrailer() {
    			out('/Size ' + (objectNumber + 1));
    			out('/Root ' + objectNumber + ' 0 R');
    			out('/Info ' + (objectNumber - 1) + ' 0 R');
    		},
    		    beginPage = function beginPage(width, height) {
    			// Dimensions are stored as user units and converted to points on output
    			var orientation = typeof height === 'string' && height.toLowerCase();
    			if (typeof width === 'string') {
    				var format = width.toLowerCase();
    				if (pageFormats.hasOwnProperty(format)) {
    					width = pageFormats[format][0] / k;
    					height = pageFormats[format][1] / k;
    				}
    			}
    			if (Array.isArray(width)) {
    				height = width[1];
    				width = width[0];
    			}
    			//if (orientation) {
    			//	switch(orientation.substr(0,1)) {
    			//		case 'l': if (height > width ) orientation = 's'; break;
    			//		case 'p': if (width > height ) orientation = 's'; break;
    			//	}
    			// TODO: What is the reason for this (for me it only seems to raise bugs)?
    			//	if (orientation === 's') { tmp = width; width = height; height = tmp; }
    			//}
    			outToPages = true;
    			pages[++page] = [];
    			pagedim[page] = {
    				width: Number(width) || pageWidth,
    				height: Number(height) || pageHeight
    			};
    			pagesContext[page] = {};
    			_setPage(page);
    		},
    		    _addPage = function _addPage() {
    			beginPage.apply(this, arguments);
    			// Set line width
    			out(f2(lineWidth) + ' w');
    			// Set draw color
    			out(drawColor);
    			// resurrecting non-default line caps, joins
    			if (lineCapID !== 0) {
    				out(lineCapID + ' J');
    			}
    			if (lineJoinID !== 0) {
    				out(lineJoinID + ' j');
    			}
    			events.publish('addPage', { pageNumber: page });
    		},
    		    _deletePage = function _deletePage(n) {
    			if (n > 0 && n <= page) {
    				pages.splice(n, 1);
    				pagedim.splice(n, 1);
    				page--;
    				if (currentPage > page) {
    					currentPage = page;
    				}
    				this.setPage(currentPage);
    			}
    		},
    		    _setPage = function _setPage(n) {
    			if (n > 0 && n <= page) {
    				currentPage = n;
    				pageWidth = pagedim[n].width;
    				pageHeight = pagedim[n].height;
    			}
    		},

    		/**
       * Returns a document-specific font key - a label assigned to a
       * font name + font type combination at the time the font was added
       * to the font inventory.
       *
       * Font key is used as label for the desired font for a block of text
       * to be added to the PDF document stream.
       * @private
       * @function
       * @param {String} fontName can be undefined on "falthy" to indicate "use current"
       * @param {String} fontStyle can be undefined on "falthy" to indicate "use current"
       * @returns {String} Font key.
       */
    		_getFont = function _getFont(fontName, fontStyle) {
    			var key;

    			fontName = fontName !== undefined ? fontName : fonts[activeFontKey].fontName;
    			fontStyle = fontStyle !== undefined ? fontStyle : fonts[activeFontKey].fontStyle;

    			if (fontName !== undefined) {
    				fontName = fontName.toLowerCase();
    			}
    			switch (fontName) {
    				case 'sans-serif':
    				case 'verdana':
    				case 'arial':
    				case 'helvetica':
    					fontName = 'helvetica';
    					break;
    				case 'fixed':
    				case 'monospace':
    				case 'terminal':
    				case 'courier':
    					fontName = 'courier';
    					break;
    				case 'serif':
    				case 'cursive':
    				case 'fantasy':
    				default:
    					fontName = 'times';
    					break;
    			}

    			try {
    				// get a string like 'F3' - the KEY corresponding tot he font + type combination.
    				key = fontmap[fontName][fontStyle];
    			} catch (e) {}

    			if (!key) {
    				//throw new Error("Unable to look up font label for font '" + fontName + "', '"
    				//+ fontStyle + "'. Refer to getFontList() for available fonts.");
    				key = fontmap['times'][fontStyle];
    				if (key == null) {
    					key = fontmap['times']['normal'];
    				}
    			}
    			return key;
    		},
    		    buildDocument = function buildDocument() {

    			outToPages = false; // switches out() to content
    			objectNumber = 2;
    			content = [];
    			offsets = [];
    			additionalObjects = [];

    			// putHeader()
    			out('%PDF-' + pdfVersion);

    			putPages();

    			// Must happen after putPages
    			// Modifies current object Id
    			putAdditionalObjects();

    			putResources();

    			// Info
    			newObject();
    			out('<<');
    			putInfo();
    			out('>>');
    			out('endobj');

    			// Catalog
    			newObject();
    			out('<<');
    			putCatalog();
    			out('>>');
    			out('endobj');

    			// Cross-ref
    			var o = content_length,
    			    i,
    			    p = "0000000000";
    			out('xref');
    			out('0 ' + (objectNumber + 1));
    			out(p + ' 65535 f ');
    			for (i = 1; i <= objectNumber; i++) {
    				var offset = offsets[i];
    				if (typeof offset === 'function') {
    					out((p + offsets[i]()).slice(-10) + ' 00000 n ');
    				} else {
    					out((p + offsets[i]).slice(-10) + ' 00000 n ');
    				}
    			}
    			// Trailer
    			out('trailer');
    			out('<<');
    			putTrailer();
    			out('>>');
    			out('startxref');
    			out(o);
    			out('%%EOF');

    			outToPages = true;

    			return content.join('\n');
    		},
    		    getStyle = function getStyle(style) {
    			// see path-painting operators in PDF spec
    			var op = 'n'; // none
    			if (style === "D") {
    				op = 'S'; // stroke
    			} else if (style === 'F') {
    				op = 'f'; // fill
    			} else if (style === 'FD' || style === 'DF') {
    				op = 'B'; // both
    			} else if (style === 'f' || style === 'f*' || style === 'B' || style === 'B*') {
    				/*
        Allow direct use of these PDF path-painting operators:
        - f	fill using nonzero winding number rule
        - f*	fill using even-odd rule
        - B	fill then stroke with fill using non-zero winding number rule
        - B*	fill then stroke with fill using even-odd rule
        */
    				op = style;
    			}
    			return op;
    		},

    		// puts the style for the previously drawn path. If a patternKey is provided, the pattern is used to fill
    		// the path. Use patternMatrix to transform the pattern to rhe right location.
    		putStyle = function putStyle(style, patternKey, patternData) {
    			style = getStyle(style);

    			// stroking / filling / both the path
    			if (!patternKey) {
    				out(style);
    				return;
    			}

    			patternData || (patternData = unitMatrix);

    			var patternId = patternMap[patternKey];
    			var pattern = patterns[patternId];

    			if (pattern instanceof API.ShadingPattern) {
    				out("q");
    				out("W " + style);

    				if (pattern.gState) {
    					API.setGState(pattern.gState);
    				}

    				out(patternData.toString() + " cm");
    				out("/" + patternId + " sh");
    				out("Q");
    			} else if (pattern instanceof API.TilingPattern) {
    				// pdf draws patterns starting at the bottom left corner and they are not affected by the global transformation,
    				// so we must flip them
    				var matrix = new Matrix(1, 0, 0, -1, 0, pageHeight);

    				if (patternData.matrix) {
    					matrix = matrixMult(patternData.matrix || unitMatrix, matrix);

    					// we cannot apply a matrix to the pattern on use so we must abuse the pattern matrix and create new instances
    					// for each use
    					patternId = pattern.createClone(patternKey, patternData.boundingBox, patternData.xStep, patternData.yStep, matrix).id;
    				}

    				out("q");
    				out("/Pattern cs");
    				out("/" + patternId + " scn");

    				if (pattern.gState) {
    					API.setGState(pattern.gState);
    				}

    				out(style);
    				out("Q");
    			}
    		},
    		    getArrayBuffer = function getArrayBuffer() {
    			var data = buildDocument(),
    			    len = data.length,
    			    ab = new ArrayBuffer(len),
    			    u8 = new Uint8Array(ab);

    			while (len--) {
    				u8[len] = data.charCodeAt(len);
    			}return ab;
    		},
    		    getBlob = function getBlob() {
    			return new Blob([getArrayBuffer()], { type: "application/pdf" });
    		},

    		/**
       * Generates the PDF document.
       *
       * If `type` argument is undefined, output is raw body of resulting PDF returned as a string.
       *
       * @param {String} type A string identifying one of the possible output types.
       * @param {Object} options An object providing some additional signalling to PDF generator.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name output
       */
    		_output = SAFE(function (type, options) {
    			var datauri = ('' + type).substr(0, 6) === 'dataur' ? 'data:application/pdf;base64,' + btoa(buildDocument()) : 0;

    			switch (type) {
    				case undefined:
    					return buildDocument();
    				case 'save':
    					if (navigator.getUserMedia) {
    						if (global.URL === undefined || global.URL.createObjectURL === undefined) {
    							return API.output('dataurlnewwindow');
    						}
    					}
    					saveAs(getBlob(), options);
    					if (typeof saveAs.unload === 'function') {
    						if (global.setTimeout) {
    							setTimeout(saveAs.unload, 911);
    						}
    					}
    					break;
    				case 'arraybuffer':
    					return getArrayBuffer();
    				case 'blob':
    					return getBlob();
    				case 'bloburi':
    				case 'bloburl':
    					// User is responsible of calling revokeObjectURL
    					return global.URL && global.URL.createObjectURL(getBlob()) || void 0;
    				case 'datauristring':
    				case 'dataurlstring':
    					return datauri;
    				case 'dataurlnewwindow':
    					var nW = global.open(datauri);
    					if (nW || typeof safari === "undefined") return nW;
    				/* pass through */
    				case 'datauri':
    				case 'dataurl':
    					return global.document.location.href = datauri;
    				default:
    					throw new Error('Output type "' + type + '" is not supported.');
    			}
    			// @TODO: Add different output options
    		});

    		switch (unit) {
    			case 'pt':
    				k = 1;break;
    			case 'mm':
    				k = 72 / 25.4000508;break;
    			case 'cm':
    				k = 72 / 2.54000508;break;
    			case 'in':
    				k = 72;break;
    			case 'px':
    				k = 96 / 72;break;
    			case 'pc':
    				k = 12;break;
    			case 'em':
    				k = 12;break;
    			case 'ex':
    				k = 6;break;
    			default:
    				throw 'Invalid unit: ' + unit;
    		}

    		//---------------------------------------
    		// Public API

    		/**
       * Object exposing internal API to plugins
       * @public
       */
    		API.internal = {
    			'pdfEscape': pdfEscape,
    			'getStyle': getStyle,
    			/**
        * Returns {FontObject} describing a particular font.
        * @public
        * @function
        * @param {String} fontName (Optional) Font's family name
        * @param {String} fontStyle (Optional) Font's style variation name (Example:"Italic")
        * @returns {FontObject}
        */
    			'getFont': function getFont() {
    				return fonts[_getFont.apply(API, arguments)];
    			},
    			'getFontSize': function getFontSize() {
    				return activeFontSize;
    			},
    			'getLineHeight': function getLineHeight() {
    				return activeFontSize * lineHeightProportion;
    			},
    			'write': function write(string1 /*, string2, string3, etc */) {
    				out(arguments.length === 1 ? string1 : Array.prototype.join.call(arguments, ' '));
    			},
    			'getCoordinateString': function getCoordinateString(value) {
    				return f2(value);
    			},
    			'getVerticalCoordinateString': function getVerticalCoordinateString(value) {
    				return f2(value);
    			},
    			'collections': {},
    			'newObject': newObject,
    			'newAdditionalObject': newAdditionalObject,
    			'newObjectDeferred': newObjectDeferred,
    			'newObjectDeferredBegin': newObjectDeferredBegin,
    			'putStream': putStream,
    			'events': events,
    			// ratio that you use in multiplication of a given "size" number to arrive to 'point'
    			// units of measurement.
    			// scaleFactor is set at initialization of the document and calculated against the stated
    			// default measurement units for the document.
    			// If default is "mm", k is the number that will turn number in 'mm' into 'points' number.
    			// through multiplication.
    			'scaleFactor': k,
    			'pageSize': {
    				get width() {
    					return pageWidth;
    				},
    				get height() {
    					return pageHeight;
    				}
    			},
    			'output': function output(type, options) {
    				return _output(type, options);
    			},
    			'getNumberOfPages': function getNumberOfPages() {
    				return pages.length - 1;
    			},
    			'pages': pages,
    			'out': out,
    			'f2': f2,
    			'getPageInfo': function getPageInfo(pageNumberOneBased) {
    				var objId = (pageNumberOneBased - 1) * 2 + 3;
    				return { objId: objId, pageNumber: pageNumberOneBased, pageContext: pagesContext[pageNumberOneBased] };
    			},
    			'getCurrentPageInfo': function getCurrentPageInfo() {
    				var objId = (currentPage - 1) * 2 + 3;
    				return { objId: objId, pageNumber: currentPage, pageContext: pagesContext[currentPage] };
    			},
    			'getPDFVersion': function getPDFVersion() {
    				return pdfVersion;
    			}
    		};

    		/**
       * An object representing a pdf graphics state.
       * @param parameters A parameter object that contains all properties this graphics state wants to set.
       * Supported are: opacity
       * @constructor
       */
    		API.GState = function (parameters) {
    			var supported = "opacity";
    			for (var p in parameters) {
    				if (parameters.hasOwnProperty(p) && supported.indexOf(p) >= 0) {
    					this[p] = parameters[p];
    				}
    			}
    			this.id = ""; // set by addGState()
    			this.objectNumber = -1; // will be set by putGState()

    			this.equals = function (other) {
    				var ignore = "id,objectNumber,equals";
    				if (!other || (typeof other === 'undefined' ? 'undefined' : babelHelpers.typeof(other)) !== babelHelpers.typeof(this)) return false;
    				var count = 0;
    				for (var p in this) {
    					if (ignore.indexOf(p) >= 0) continue;
    					if (this.hasOwnProperty(p) && !other.hasOwnProperty(p)) return false;
    					if (this[p] !== other[p]) return false;
    					count++;
    				}
    				for (var p in other) {
    					if (other.hasOwnProperty(p) && ignore.indexOf(p) < 0) count--;
    				}
    				return count === 0;
    			};
    		};

    		/**
       * Adds a new {@link GState} for later use {@see setGState}.
       * @param {String} key
       * @param {GState} gState
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name addGState
       */
    		API.addGState = function (key, gState) {
    			addGState(key, gState);
    			return this;
    		};

    		/**
       * Adds (and transfers the focus to) new page to the PDF document.
       * @function
       * @returns {jsPDF}
       *
       * @methodOf jsPDF#
       * @name addPage
       */
    		API.addPage = function () {
    			_addPage.apply(this, arguments);
    			return this;
    		};
    		API.setPage = function () {
    			_setPage.apply(this, arguments);
    			return this;
    		};
    		API.insertPage = function (beforePage) {
    			this.addPage();
    			this.movePage(currentPage, beforePage);
    			return this;
    		};
    		API.movePage = function (targetPage, beforePage) {
    			var tmpPagesContext, tmpPagedim, tmpPages, i;
    			if (targetPage > beforePage) {
    				tmpPages = pages[targetPage];
    				tmpPagedim = pagedim[targetPage];
    				tmpPagesContext = pagesContext[targetPage];
    				for (i = targetPage; i > beforePage; i--) {
    					pages[i] = pages[i - 1];
    					pagedim[i] = pagedim[i - 1];
    					pagesContext[i] = pagesContext[i - 1];
    				}
    				pages[beforePage] = tmpPages;
    				pagedim[beforePage] = tmpPagedim;
    				pagesContext[beforePage] = tmpPagesContext;
    				this.setPage(beforePage);
    			} else if (targetPage < beforePage) {
    				tmpPages = pages[targetPage];
    				tmpPagedim = pagedim[targetPage];
    				tmpPagesContext = pagesContext[targetPage];
    				for (i = targetPage; i < beforePage; i++) {
    					pages[i] = pages[i + 1];
    					pagedim[i] = pagedim[i + 1];
    					pagesContext[i] = pagesContext[i + 1];
    				}
    				pages[beforePage] = tmpPages;
    				pagedim[beforePage] = tmpPagedim;
    				pagesContext[beforePage] = tmpPagesContext;
    				this.setPage(beforePage);
    			}
    			return this;
    		};

    		API.deletePage = function () {
    			_deletePage.apply(this, arguments);
    			return this;
    		};
    		API.setDisplayMode = function (zoom, layout, pmode) {
    			zoomMode = zoom;
    			layoutMode = layout;
    			pageMode = pmode;
    			return this;
    		};

    		/**
       * Saves the current graphics state ("pushes it on the stack"). It can be restored by {@link restoreGraphicsState}
       * later. Here, the general pdf graphics state is meant, also including the current transformation matrix,
       * fill and stroke colors etc.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name saveGraphicsState
       */
    		API.saveGraphicsState = function () {
    			out("q");
    			// as we cannot set font key and size independently we must keep track of both
    			fontStateStack.push({
    				key: activeFontKey,
    				size: activeFontSize
    			});
    			return this;
    		};

    		/**
       * Restores a previously saved graphics state saved by {@link saveGraphicsState} ("pops the stack").
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name restoreGraphicsState
       */
    		API.restoreGraphicsState = function () {
    			out("Q");

    			// restore previous font state
    			var fontState = fontStateStack.pop();
    			activeFontKey = fontState.key;
    			activeFontSize = fontState.size;
    			activeGState = null;

    			return this;
    		};

    		/**
       * Appends this matrix to the left of all previously applied matrices.
       * @param {Matrix} matrix
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setCurrentTransformationMatrix
       */
    		API.setCurrentTransformationMatrix = function (matrix) {
    			out(matrix.toString() + " cm");
    			return this;
    		};

    		/**
       * Starts a new pdf form object, which means that all conseequent draw calls target a new independent object
       * until {@link endFormObject} is called. The created object can be referenced and drawn later using
       * {@link doFormObject}. Nested form objects are possible.
       * x, y, width, height set the bounding box that is used to clip the content.
       * @param {number} x
       * @param {number} y
       * @param {number} width
       * @param {number} height
       * @param {Matrix} matrix The matrix that will be applied to convert the form objects coordinate system to
       * the parent's.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       */
    		API.beginFormObject = function (x, y, width, height, matrix) {
    			// The user can set the output target to a new form object. Nested form objects are possible.
    			// Currently, they use the resource dictionary of the surrounding stream. This should be changed, as
    			// the PDF-Spec states:
    			// "In PDF 1.2 and later versions, form XObjects may be independent of the content streams in which
    			// they appear, and this is strongly recommended although not requiredIn PDF 1.2 and later versions,
    			// form XObjects may be independent of the content streams in which they appear, and this is strongly
    			// recommended although not required"
    			beginNewRenderTarget(x, y, width, height, matrix);
    			return this;
    		};

    		/**
       * Completes and saves the form object.
       * @param {String} key The key by which this form object can be referenced.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name endFormObject
       */
    		API.endFormObject = function (key) {
    			endFormObject(key);
    			return this;
    		};

    		/**
       * Draws the specified form object by referencing to the respective pdf XObject created with
       * {@link API.beginFormObject} and {@link endFormObject}.
       * The location is determined by matrix.
       * @param {String} key The key to the form object.
       * @param {Matrix} matrix The matrix applied before drawing the form object.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name doFormObject
       */
    		API.doFormObject = function (key, matrix) {
    			var xObject = renderTargets[renderTargetMap[key]];
    			out("q");
    			out(matrix.toString() + " cm");
    			out("/" + xObject.id + " Do");
    			out("Q");
    			return this;
    		};

    		/**
       * Returns the form object specified by key.
       * @param key {String}
       * @returns {{x: number, y: number, width: number, height: number, matrix: Matrix}}
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name getFormObject
       */
    		API.getFormObject = function (key) {
    			var xObject = renderTargets[renderTargetMap[key]];
    			return {
    				x: xObject.x,
    				y: xObject.y,
    				width: xObject.width,
    				height: xObject.height,
    				matrix: xObject.matrix
    			};
    		};

    		/**
       * A matrix object for 2D homogenous transformations:
       * | a b 0 |
       * | c d 0 |
       * | e f 1 |
       * pdf multiplies matrices righthand: v' = v x m1 x m2 x ...
       * @param {number} a
       * @param {number} b
       * @param {number} c
       * @param {number} d
       * @param {number} e
       * @param {number} f
       * @constructor
       */
    		API.Matrix = Matrix;

    		/**
       * Multiplies two matrices. (see {@link Matrix})
       * @param {Matrix} m1
       * @param {Matrix} m2
       */
    		API.matrixMult = matrixMult;

    		/**
       * The unit matrix (equal to new Matrix(1, 0, 0, 1, 0, 0).
       * @type {Matrix}
       */
    		API.unitMatrix = unitMatrix;

    		var Pattern = function Pattern(gState, matrix) {
    			this.gState = gState;
    			this.matrix = matrix;

    			this.id = ""; // set by addPattern()
    			this.objectNumber = -1; // will be set by putPattern()
    		};

    		/**
       * A pattern describing a shading pattern.
       * @param {String} type One of "axial" or "radial"
       * @param {Array<Number>} coords Either [x1, y1, x2, y2] for "axial" type describing the two interpolation points
       * or [x1, y1, r, x2, y2, r2] for "radial" describing inner and the outer circle.
       * @param {Array<Object>} colors An array of objects with the fields "offset" and "color". "offset" describes
       * the offset in parameter space [0, 1]. "color" is an array of length 3 describing RGB values in [0, 255].
       * @param {GState=} gState An additional graphics state that gets applied to the pattern (optional).
       * @param {Matrix=} matrix A matrix that describes the transformation between the pattern coordinate system
       * and the use coordinate system (optional).
       * @constructor
       * @extends API.Pattern
       */
    		API.ShadingPattern = function (type, coords, colors, gState, matrix) {
    			// see putPattern() for information how they are realized
    			this.type = type === "axial" ? 2 : 3;
    			this.coords = coords;
    			this.colors = colors;

    			Pattern.call(this, gState, matrix);
    		};

    		/**
       * A PDF Tiling pattern.
       * @param {Array<Number>} boundingBox The bounding box at which one pattern cell gets clipped.
       * @param {Number} xStep Horizontal spacing between pattern cells.
       * @param {Number} yStep Vertical spacing between pattern cells.
       * @param {API.GState=} gState An additional graphics state that gets applied to the pattern (optional).
       * @param {Matrix=} matrix A matrix that describes the transformation between the pattern coordinate system
       * and the use coordinate system (optional).
       * @constructor
       * @extends API.Pattern
       */
    		API.TilingPattern = function (boundingBox, xStep, yStep, gState, matrix) {
    			this.boundingBox = boundingBox;
    			this.xStep = xStep;
    			this.yStep = yStep;

    			this.stream = ""; // set by endTilingPattern();

    			this.cloneIndex = 0;

    			Pattern.call(this, gState, matrix);
    		};

    		API.TilingPattern.prototype = {
    			createClone: function createClone(patternKey, boundingBox, xStep, yStep, matrix) {
    				var clone = new API.TilingPattern(boundingBox || this.boundingBox, xStep || this.xStep, yStep || this.yStep, this.gState, matrix || this.matrix);
    				clone.stream = this.stream;
    				var key = patternKey + "$$" + this.cloneIndex++ + "$$";
    				addPattern(key, clone);
    				return clone;
    			}
    		};

    		/**
       * Adds a new {@link API.ShadingPattern} for later use.
       * @param {String} key
       * @param {Pattern} pattern
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name addPattern
       */
    		API.addShadingPattern = function (key, pattern) {
    			addPattern(key, pattern);
    			return this;
    		};

    		/**
       * Begins a new tiling pattern. All subsequent render calls are drawn to this pattern until {@link API.endTilingPattern}
       * gets called.
       * @param {API.Pattern} pattern
       */
    		API.beginTilingPattern = function (pattern) {
    			beginNewRenderTarget(pattern.boundingBox[0], pattern.boundingBox[1], pattern.boundingBox[2] - pattern.boundingBox[0], pattern.boundingBox[3] - pattern.boundingBox[1], pattern.matrix);
    		};

    		/**
       * Ends a tiling pattern and sets the render target to the one active before {@link API.beginTilingPattern} has been called.
       * @param {string} key A unique key that is used to reference this pattern at later use.
       * @param {API.Pattern} pattern The pattern to end.
       */
    		API.endTilingPattern = function (key, pattern) {
    			// retrieve the stream
    			pattern.stream = pages[currentPage].join("\n");

    			addPattern(key, pattern);

    			events.publish("endTilingPattern", pattern);

    			// restore state from stack
    			renderTargetStack.pop().restore();
    		};

    		/**
       * Adds text to page. Supports adding multiline text when 'text' argument is an Array of Strings.
       *
       * @function
       * @param {String|Array} text String or array of strings to be added to the page. Each line is shifted one line down
       * per font, spacing settings declared before this call.
       * @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {Object} flags Collection of settings signalling how the text must be encoded. Defaults are sane. If you
       * think you want to pass some flags, you likely can read the source.
       * @param {number|Matrix} transform If transform is a number the text will be rotated by this value. If it is a Matrix,
       * this matrix gets directly applied to the text, which allows shearing effects etc.
       * @param align {string}
       * @returns {jsPDF}
       * @methodOf jsPDF#
       */
    		API.text = function (text, x, y, flags, transform, align) {
    			/**
        * Inserts something like this into PDF
        *   BT
        *    /F1 16 Tf  % Font name + size
        *    16 TL % How many units down for next line in multiline text
        *    0 g % color
        *    28.35 813.54 Td % position
        *    (line one) Tj
        *    T* (line two) Tj
        *    T* (line three) Tj
        *   ET
        */
    			function ESC(s) {
    				s = s.split("\t").join(Array(options.TabLen || 9).join(" "));
    				return pdfEscape(s, flags);
    			}

    			// Pre-August-2012 the order of arguments was function(x, y, text, flags)
    			// in effort to make all calls have similar signature like
    			//   function(data, coordinates... , miscellaneous)
    			// this method had its args flipped.
    			// code below allows backward compatibility with old arg order.
    			if (typeof text === 'number') {
    				var tmp = y;
    				y = x;
    				x = text;
    				text = tmp;
    			}

    			// If there are any newlines in text, we assume
    			// the user wanted to print multiple lines, so break the
    			// text up into an array.  If the text is already an array,
    			// we assume the user knows what they are doing.
    			// Convert text into an array anyway to simplify
    			// later code.
    			if (typeof text === 'string') {
    				if (text.match(/[\n\r]/)) {
    					text = text.split(/\r\n|\r|\n/g);
    				} else {
    					text = [text];
    				}
    			}
    			if (typeof transform === 'string') {
    				align = transform;
    				transform = null;
    			}
    			if (typeof flags === 'string') {
    				align = flags;
    				flags = null;
    			}
    			if (typeof flags === 'number') {
    				transform = flags;
    				flags = null;
    			}

    			var todo;
    			if (transform && typeof transform === "number") {
    				transform *= Math.PI / 180;
    				var c = Math.cos(transform),
    				    s = Math.sin(transform);
    				transform = new Matrix(c, s, -s, c, 0, 0);
    			} else if (!transform) {
    				transform = unitMatrix;
    			}

    			flags = flags || {};
    			if (!('noBOM' in flags)) flags.noBOM = true;
    			if (!('autoencode' in flags)) flags.autoencode = true;

    			var strokeOption = '';
    			var pageContext = this.internal.getCurrentPageInfo().pageContext;
    			if (true === flags.stroke) {
    				if (pageContext.lastTextWasStroke !== true) {
    					strokeOption = '1 Tr\n';
    					pageContext.lastTextWasStroke = true;
    				}
    			} else {
    				if (pageContext.lastTextWasStroke) {
    					strokeOption = '0 Tr\n';
    				}
    				pageContext.lastTextWasStroke = false;
    			}

    			if (typeof this._runningPageHeight === 'undefined') {
    				this._runningPageHeight = 0;
    			}

    			if (typeof text === 'string') {
    				text = ESC(text);
    			} else if (Object.prototype.toString.call(text) === '[object Array]') {
    				// we don't want to destroy  original text array, so cloning it
    				var sa = text.concat(),
    				    da = [],
    				    len = sa.length;
    				// we do array.join('text that must not be PDFescaped")
    				// thus, pdfEscape each component separately
    				while (len--) {
    					da.push(ESC(sa.shift()));
    				}
    				var linesLeft = Math.ceil((y - this._runningPageHeight) / (activeFontSize * lineHeightProportion));
    				if (0 <= linesLeft && linesLeft < da.length + 1) {
    					//todo = da.splice(linesLeft-1);
    				}

    				if (align) {
    					var left,
    					    prevX,
    					    maxLineLength,
    					    leading = activeFontSize * lineHeightProportion,
    					    lineWidths = text.map(function (v) {
    						return this.getStringUnitWidth(v) * activeFontSize;
    					}, this);
    					maxLineLength = Math.max.apply(Math, lineWidths);
    					// The first line uses the "main" Td setting,
    					// and the subsequent lines are offset by the
    					// previous line's x coordinate.
    					if (align === "center") {
    						// The passed in x coordinate defines
    						// the center point.
    						left = x - maxLineLength / 2;
    						x -= lineWidths[0] / 2;
    					} else if (align === "right") {
    						// The passed in x coordinate defines the
    						// rightmost point of the text.
    						left = x - maxLineLength;
    						x -= lineWidths[0];
    					} else {
    						throw new Error('Unrecognized alignment option, use "center" or "right".');
    					}
    					prevX = x;
    					text = da[0] + ") Tj\n";
    					for (i = 1, len = da.length; i < len; i++) {
    						var delta = maxLineLength - lineWidths[i];
    						if (align === "center") delta /= 2;
    						// T* = x-offset leading Td ( text )
    						text += left - prevX + delta + " -" + leading + " Td (" + da[i];
    						prevX = left + delta;
    						if (i < len - 1) {
    							text += ") Tj\n";
    						}
    					}
    				} else {
    					text = da.join(") Tj\nT* (");
    				}
    			} else {
    				throw new Error('Type of text must be string or Array. "' + text + '" is not recognized.');
    			}
    			// Using "'" ("go next line and render text" mark) would save space but would complicate our rendering code, templates

    			// BT .. ET does NOT have default settings for Tf. You must state that explicitely every time for BT .. ET
    			// if you want text transformation matrix (+ multiline) to work reliably (which reads sizes of things from font declarations)
    			// Thus, there is NO useful, *reliable* concept of "default" font for a page.
    			// The fact that "default" (reuse font used before) font worked before in basic cases is an accident
    			// - readers dealing smartly with brokenness of jsPDF's markup.

    			var curY;

    			if (todo) {
    				//this.addPage();
    				//this._runningPageHeight += y -  (activeFontSize * 1.7);
    				//curY = f2(activeFontSize * 1.7);
    			} else {
    				curY = f2(y);
    			}
    			//curY = f2(((y - this._runningPageHeight));

    			//			if (curY < 0){
    			//				console.log('auto page break');
    			//				this.addPage();
    			//				this._runningPageHeight = y -  (activeFontSize * 1.7);
    			//				curY = f2(activeFontSize * 1.7);
    			//			}

    			var translate = new Matrix(1, 0, 0, -1, x, curY);
    			transform = matrixMult(translate, transform);
    			var position = transform.toString() + " Tm";

    			out('BT\n' + activeFontSize * lineHeightProportion + ' TL\n' + // line spacing
    			strokeOption + // stroke option
    			position + '\n(' + text + ') Tj\nET');

    			if (todo) {
    				//this.text( todo, x, activeFontSize * 1.7);
    				//this.text( todo, x, this._runningPageHeight + (activeFontSize * 1.7));
    				this.text(todo, x, y); // + (activeFontSize * 1.7));
    			}

    			return this;
    		};

    		API.lstext = function (text, x, y, spacing) {
    			for (var i = 0, len = text.length; i < len; i++, x += spacing) {
    				this.text(text[i], x, y);
    			}
    		};

    		/**
       * Draw a line
       * @param {number} x1
       * @param {number} y1
       * @param {number} x2
       * @param {number} y2
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name line
       */
    		API.line = function (x1, y1, x2, y2) {
    			return this.lines([[x2 - x1, y2 - y1]], x1, y1, [1, 1], "D");
    		};

    		API.clip = function () {
    			// By patrick-roberts, github.com/MrRio/jsPDF/issues/328
    			// Call .clip() after calling .rect() with a style argument of null
    			out('W'); // clip
    			out('S'); // stroke path; necessary for clip to work
    		};

    		/**
       * @typedef {Object} PatternData
       * {Matrix|undefined} matrix
       * {Number|undefined} xStep
       * {Number|undefined} yStep
       * {Array<Number>|undefined} boundingBox
       */

    		/**
       * Adds series of curves (straight lines or cubic bezier curves) to canvas, starting at `x`, `y` coordinates.
       * All data points in `lines` are relative to last line origin.
       * `x`, `y` become x1,y1 for first line / curve in the set.
       * For lines you only need to specify [x2, y2] - (ending point) vector against x1, y1 starting point.
       * For bezier curves you need to specify [x2,y2,x3,y3,x4,y4] - vectors to control points 1, 2, ending point. All vectors are against the start of the curve - x1,y1.
       *
       * @example .lines([[2,2],[-2,2],[1,1,2,2,3,3],[2,1]], 212,110, 10) // line, line, bezier curve, line
       * @param {Array} lines Array of *vector* shifts as pairs (lines) or sextets (cubic bezier curves).
       * @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {Number} scale (Defaults to [1.0,1.0]) x,y Scaling factor for all vectors. Elements can be any floating number Sub-one makes drawing smaller. Over-one grows the drawing. Negative flips the direction.
       * @param {String} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
       * @param {Boolean} closed If true, the path is closed with a straight line from the end of the last curve to the starting point.
       * @param {String} patternKey The pattern key for the pattern that should be used to fill the path.
       * @param {Matrix|PatternData} patternData The matrix that transforms the pattern into user space, or an object that
       * will modify the pattern on use.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name lines
       */
    		API.lines = function (lines, x, y, scale, style, closed, patternKey, patternData) {
    			var scalex, scaley, i, l, leg, x2, y2, x3, y3, x4, y4;

    			// Pre-August-2012 the order of arguments was function(x, y, lines, scale, style)
    			// in effort to make all calls have similar signature like
    			//   function(content, coordinateX, coordinateY , miscellaneous)
    			// this method had its args flipped.
    			// code below allows backward compatibility with old arg order.
    			if (typeof lines === 'number') {
    				var tmp = y;
    				y = x;
    				x = lines;
    				lines = tmp;
    			}

    			scale = scale || [1, 1];

    			// starting point
    			out(f3(x) + ' ' + f3(y) + ' m ');

    			scalex = scale[0];
    			scaley = scale[1];
    			l = lines.length;
    			//, x2, y2 // bezier only. In page default measurement "units", *after* scaling
    			//, x3, y3 // bezier only. In page default measurement "units", *after* scaling
    			// ending point for all, lines and bezier. . In page default measurement "units", *after* scaling
    			x4 = x; // last / ending point = starting point for first item.
    			y4 = y; // last / ending point = starting point for first item.

    			for (i = 0; i < l; i++) {
    				leg = lines[i];
    				if (leg.length === 2) {
    					// simple line
    					x4 = leg[0] * scalex + x4; // here last x4 was prior ending point
    					y4 = leg[1] * scaley + y4; // here last y4 was prior ending point
    					out(f3(x4) + ' ' + f3(y4) + ' l');
    				} else {
    					// bezier curve
    					x2 = leg[0] * scalex + x4; // here last x4 is prior ending point
    					y2 = leg[1] * scaley + y4; // here last y4 is prior ending point
    					x3 = leg[2] * scalex + x4; // here last x4 is prior ending point
    					y3 = leg[3] * scaley + y4; // here last y4 is prior ending point
    					x4 = leg[4] * scalex + x4; // here last x4 was prior ending point
    					y4 = leg[5] * scaley + y4; // here last y4 was prior ending point
    					out(f3(x2) + ' ' + f3(y2) + ' ' + f3(x3) + ' ' + f3(y3) + ' ' + f3(x4) + ' ' + f3(y4) + ' c');
    				}
    			}

    			if (closed) {
    				out('h');
    			}

    			putStyle(style, patternKey, patternData);

    			return this;
    		};

    		/**
       * Similar to {@link API.lines} but all coordinates are interpreted as absolute coordinates instead of relative.
       * @param {Array<Object>} lines An array of {op: operator, c: coordinates} object, where op is one of "m" (move to), "l" (line to)
       * "c" (cubic bezier curve) and "h" (close (sub)path)). c is an array of coordinates. "m" and "l" expect two, "c"
       * six and "h" an empty array (or undefined).
       * @param {String} style  The style
       * @param {String} patternKey The pattern key for the pattern that should be used to fill the path.
       * @param {Matrix|PatternData} patternData The matrix that transforms the pattern into user space, or an object that
       * will modify the pattern on use.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name path
       */
    		API.path = function (lines, style, patternKey, patternData) {

    			for (var i = 0; i < lines.length; i++) {
    				var leg = lines[i];
    				var coords = leg.c;
    				switch (leg.op) {
    					case "m":
    						// move
    						out(f3(coords[0]) + ' ' + f3(coords[1]) + ' m');
    						break;
    					case "l":
    						// simple line
    						out(f3(coords[0]) + ' ' + f3(coords[1]) + ' l');
    						break;
    					case "c":
    						// bezier curve
    						out([f3(coords[0]), f3(coords[1]), f3(coords[2]), f3(coords[3]), f3(coords[4]), f3(coords[5]), "c"].join(" "));
    						break;
    					case "h":
    						// close path
    						out("h");
    				}
    			}

    			putStyle(style, patternKey, patternData);

    			return this;
    		};

    		/**
       * Adds a rectangle to PDF
       *
       * @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {Number} w Width (in units declared at inception of PDF document)
       * @param {Number} h Height (in units declared at inception of PDF document)
       * @param {String} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
         * @param {String} patternKey The pattern key for the pattern that should be used to fill the primitive.
         * @param {Matrix|PatternData} patternData The matrix that transforms the pattern into user space, or an object that
         * will modify the pattern on use.
         * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name rect
       */
    		API.rect = function (x, y, w, h, style, patternKey, patternData) {
    			out([f2(x), f2(y), f2(w), f2(-h), 're'].join(' '));

    			putStyle(style, patternKey, patternData);

    			return this;
    		};

    		/**
       * Adds a triangle to PDF
       *
       * @param {Number} x1 Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y1 Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {Number} x2 Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y2 Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {Number} x3 Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y3 Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {String} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
         * @param {String} patternKey The pattern key for the pattern that should be used to fill the primitive.
         * @param {Matrix|PatternData} patternData The matrix that transforms the pattern into user space, or an object that
         * will modify the pattern on use.
         * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name triangle
       */
    		API.triangle = function (x1, y1, x2, y2, x3, y3, style, patternKey, patternData) {
    			this.lines([[x2 - x1, y2 - y1], // vector to point 2
    			[x3 - x2, y3 - y2], // vector to point 3
    			[x1 - x3, y1 - y3] // closing vector back to point 1
    			], x1, y1, // start of path
    			[1, 1], style, true, patternKey, patternData);
    			return this;
    		};

    		/**
       * Adds a rectangle with rounded corners to PDF
       *
       * @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {Number} w Width (in units declared at inception of PDF document)
       * @param {Number} h Height (in units declared at inception of PDF document)
       * @param {Number} rx Radius along x axis (in units declared at inception of PDF document)
       * @param {Number} ry Radius along y axis (in units declared at inception of PDF document)
       * @param {String} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
         * @param {String} patternKey The pattern key for the pattern that should be used to fill the primitive.
         * @param {Matrix|PatternData} patternData The matrix that transforms the pattern into user space, or an object that
         * will modify the pattern on use.
         * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name roundedRect
       */
    		API.roundedRect = function (x, y, w, h, rx, ry, style, patternKey, patternData) {
    			var MyArc = 4 / 3 * (Math.SQRT2 - 1);

    			rx = Math.min(rx, w * 0.5);
    			ry = Math.min(ry, h * 0.5);

    			this.lines([[w - 2 * rx, 0], [rx * MyArc, 0, rx, ry - ry * MyArc, rx, ry], [0, h - 2 * ry], [0, ry * MyArc, -(rx * MyArc), ry, -rx, ry], [-w + 2 * rx, 0], [-(rx * MyArc), 0, -rx, -(ry * MyArc), -rx, -ry], [0, -h + 2 * ry], [0, -(ry * MyArc), rx * MyArc, -ry, rx, -ry]], x + rx, y, // start of path
    			[1, 1], style, true, patternKey, patternData);
    			return this;
    		};

    		/**
       * Adds an ellipse to PDF
       *
       * @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {Number} rx Radius along x axis (in units declared at inception of PDF document)
       * @param {Number} ry Radius along y axis (in units declared at inception of PDF document)
       * @param {String} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
         * @param {String} patternKey The pattern key for the pattern that should be used to fill the primitive.
         * @param {Matrix|PatternData} patternData The matrix that transforms the pattern into user space, or an object that
         * will modify the pattern on use.
         * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name ellipse
       */
    		API.ellipse = function (x, y, rx, ry, style, patternKey, patternData) {
    			var lx = 4 / 3 * (Math.SQRT2 - 1) * rx,
    			    ly = 4 / 3 * (Math.SQRT2 - 1) * ry;

    			out([f2(x + rx), f2(y), 'm', f2(x + rx), f2(y - ly), f2(x + lx), f2(y - ry), f2(x), f2(y - ry), 'c'].join(' '));
    			out([f2(x - lx), f2(y - ry), f2(x - rx), f2(y - ly), f2(x - rx), f2(y), 'c'].join(' '));
    			out([f2(x - rx), f2(y + ly), f2(x - lx), f2(y + ry), f2(x), f2(y + ry), 'c'].join(' '));
    			out([f2(x + lx), f2(y + ry), f2(x + rx), f2(y + ly), f2(x + rx), f2(y), 'c'].join(' '));

    			putStyle(style, patternKey, patternData);

    			return this;
    		};

    		/**
       * Adds an circle to PDF
       *
       * @param {Number} x Coordinate (in units declared at inception of PDF document) against left edge of the page
       * @param {Number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page
       * @param {Number} r Radius (in units declared at inception of PDF document)
       * @param {String} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
         * @param {String} patternKey The pattern key for the pattern that should be used to fill the primitive.
         * @param {Matrix|PatternData} patternData The matrix that transforms the pattern into user space, or an object that
         * will modify the pattern on use.
         * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name circle
       */
    		API.circle = function (x, y, r, style, patternKey, patternData) {
    			return this.ellipse(x, y, r, r, style, patternKey, patternData);
    		};

    		/**
       * Adds a properties to the PDF document
       *
       * @param {Object} properties A property_name-to-property_value object structure.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setProperties
       */
    		API.setProperties = function (properties) {
    			// copying only those properties we can render.
    			for (var property in documentProperties) {
    				if (documentProperties.hasOwnProperty(property) && properties[property]) {
    					documentProperties[property] = properties[property];
    				}
    			}
    			return this;
    		};

    		/**
       * Sets font size for upcoming text elements.
       *
       * @param {Number} size Font size in points.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setFontSize
       */
    		API.setFontSize = function (size) {
    			activeFontSize = size;
    			out("/" + activeFontKey + " " + activeFontSize + " Tf");
    			return this;
    		};

    		API.getFontSize = function () {
    			return activeFontSize;
    		};

    		/**
       * Sets text font face, variant for upcoming text elements.
       * See output of jsPDF.getFontList() for possible font names, styles.
       *
       * @param {String} fontName Font name or family. Example: "times"
       * @param {String} fontStyle Font style or variant. Example: "italic"
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setFont
       */
    		API.setFont = function (fontName, fontStyle) {
    			activeFontKey = _getFont(fontName, fontStyle);
    			// if font is not found, the above line blows up and we never go further
    			out("/" + activeFontKey + " " + activeFontSize + " Tf");
    			return this;
    		};

    		/**
       * Switches font style or variant for upcoming text elements,
       * while keeping the font face or family same.
       * See output of jsPDF.getFontList() for possible font names, styles.
       *
       * @param {String} style Font style or variant. Example: "italic"
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setFontStyle
       */
    		API.setFontStyle = API.setFontType = function (style) {
    			activeFontKey = _getFont(undefined, style);
    			// if font is not found, the above line blows up and we never go further
    			return this;
    		};

    		/**
       * Returns an object - a tree of fontName to fontStyle relationships available to
       * active PDF document.
       *
       * @public
       * @function
       * @returns {Object} Like {'times':['normal', 'italic', ... ], 'arial':['normal', 'bold', ... ], ... }
       * @methodOf jsPDF#
       * @name getFontList
       */
    		API.getFontList = function () {
    			// TODO: iterate over fonts array or return copy of fontmap instead in case more are ever added.
    			var list = {},
    			    fontName,
    			    fontStyle,
    			    tmp;

    			for (fontName in fontmap) {
    				if (fontmap.hasOwnProperty(fontName)) {
    					list[fontName] = tmp = [];
    					for (fontStyle in fontmap[fontName]) {
    						if (fontmap[fontName].hasOwnProperty(fontStyle)) {
    							tmp.push(fontStyle);
    						}
    					}
    				}
    			}

    			return list;
    		};

    		/**
       * Add a custom font.
       *
       * @param {String} postScriptName name of the Font.  Example: "Menlo-Regular"
       * @param {String} fontName of font-family from @font-face definition.  Example: "Menlo Regular"
       * @param {String} fontStyle style.  Example: "normal"
       * @function
       * @returns the {fontKey} (same as the internal method)
       * @methodOf jsPDF#
       * @name addFont
       */
    		API.addFont = function (postScriptName, fontName, fontStyle) {
    			addFont(postScriptName, fontName, fontStyle, 'StandardEncoding');
    		};

    		/**
       * Sets line width for upcoming lines.
       *
       * @param {Number} width Line width (in units declared at inception of PDF document)
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setLineWidth
       */
    		API.setLineWidth = function (width) {
    			out(width.toFixed(2) + ' w');
    			return this;
    		};

    		/**
       * Sets the stroke color for upcoming elements.
       *
       * Depending on the number of arguments given, Gray, RGB, or CMYK
       * color space is implied.
       *
       * When only ch1 is given, "Gray" color space is implied and it
       * must be a value in the range from 0.00 (solid black) to to 1.00 (white)
       * if values are communicated as String types, or in range from 0 (black)
       * to 255 (white) if communicated as Number type.
       * The RGB-like 0-255 range is provided for backward compatibility.
       *
       * When only ch1,ch2,ch3 are given, "RGB" color space is implied and each
       * value must be in the range from 0.00 (minimum intensity) to to 1.00
       * (max intensity) if values are communicated as String types, or
       * from 0 (min intensity) to to 255 (max intensity) if values are communicated
       * as Number types.
       * The RGB-like 0-255 range is provided for backward compatibility.
       *
       * When ch1,ch2,ch3,ch4 are given, "CMYK" color space is implied and each
       * value must be a in the range from 0.00 (0% concentration) to to
       * 1.00 (100% concentration)
       *
       * Because JavaScript treats fixed point numbers badly (rounds to
       * floating point nearest to binary representation) it is highly advised to
       * communicate the fractional numbers as String types, not JavaScript Number type.
       *
       * @param {Number|String} ch1 Color channel value
       * @param {Number|String} ch2 Color channel value
       * @param {Number|String} ch3 Color channel value
       * @param {Number|String} ch4 Color channel value
       *
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setDrawColor
       */
    		API.setDrawColor = function (ch1, ch2, ch3, ch4) {
    			var color;
    			if (ch2 === undefined || ch4 === undefined && ch1 === ch2 === ch3) {
    				// Gray color space.
    				if (typeof ch1 === 'string') {
    					color = ch1 + ' G';
    				} else {
    					color = f2(ch1 / 255) + ' G';
    				}
    			} else if (ch4 === undefined) {
    				// RGB
    				if (typeof ch1 === 'string') {
    					color = [ch1, ch2, ch3, 'RG'].join(' ');
    				} else {
    					color = [f2(ch1 / 255), f2(ch2 / 255), f2(ch3 / 255), 'RG'].join(' ');
    				}
    			} else {
    				// CMYK
    				if (typeof ch1 === 'string') {
    					color = [ch1, ch2, ch3, ch4, 'K'].join(' ');
    				} else {
    					color = [f2(ch1), f2(ch2), f2(ch3), f2(ch4), 'K'].join(' ');
    				}
    			}

    			out(color);
    			return this;
    		};

    		/**
       * Sets the fill color for upcoming elements.
       *
       * Depending on the number of arguments given, Gray, RGB, or CMYK
       * color space is implied.
       *
       * When only ch1 is given, "Gray" color space is implied and it
       * must be a value in the range from 0.00 (solid black) to to 1.00 (white)
       * if values are communicated as String types, or in range from 0 (black)
       * to 255 (white) if communicated as Number type.
       * The RGB-like 0-255 range is provided for backward compatibility.
       *
       * When only ch1,ch2,ch3 are given, "RGB" color space is implied and each
       * value must be in the range from 0.00 (minimum intensity) to to 1.00
       * (max intensity) if values are communicated as String types, or
       * from 0 (min intensity) to to 255 (max intensity) if values are communicated
       * as Number types.
       * The RGB-like 0-255 range is provided for backward compatibility.
       *
       * When ch1,ch2,ch3,ch4 are given, "CMYK" color space is implied and each
       * value must be a in the range from 0.00 (0% concentration) to to
       * 1.00 (100% concentration)
       *
       * Because JavaScript treats fixed point numbers badly (rounds to
       * floating point nearest to binary representation) it is highly advised to
       * communicate the fractional numbers as String types, not JavaScript Number type.
       *
       * @param {Number|String} ch1 Color channel value
       * @param {Number|String} ch2 Color channel value
       * @param {Number|String} ch3 Color channel value
       * @param {Number|String} ch4 Color channel value
       *
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setFillColor
       */
    		API.setFillColor = function (ch1, ch2, ch3, ch4) {
    			var color;

    			if (ch2 === undefined || ch4 === undefined && ch1 === ch2 === ch3) {
    				// Gray color space.
    				if (typeof ch1 === 'string') {
    					color = ch1 + ' g';
    				} else {
    					color = f2(ch1 / 255) + ' g';
    				}
    			} else if (ch4 === undefined || (typeof ch4 === 'undefined' ? 'undefined' : babelHelpers.typeof(ch4)) === 'object') {
    				// RGB
    				if (typeof ch1 === 'string') {
    					color = [ch1, ch2, ch3, 'rg'].join(' ');
    				} else {
    					color = [f2(ch1 / 255), f2(ch2 / 255), f2(ch3 / 255), 'rg'].join(' ');
    				}
    				if (ch4 && ch4.a === 0) {
    					//TODO Implement transparency.
    					//WORKAROUND use white for now
    					color = ['255', '255', '255', 'rg'].join(' ');
    				}
    			} else {
    				// CMYK
    				if (typeof ch1 === 'string') {
    					color = [ch1, ch2, ch3, ch4, 'k'].join(' ');
    				} else {
    					color = [f2(ch1), f2(ch2), f2(ch3), f2(ch4), 'k'].join(' ');
    				}
    			}

    			out(color);
    			return this;
    		};

    		/**
       * Sets the text color for upcoming elements.
       * If only one, first argument is given,
       * treats the value as gray-scale color value.
       *
       * @param {Number} r Red channel color value in range 0-255 or {String} r color value in hexadecimal, example: '#FFFFFF'
       * @param {Number} g Green channel color value in range 0-255
       * @param {Number} b Blue channel color value in range 0-255
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setTextColor
       */
    		API.setTextColor = function (r, g, b) {
    			if (typeof r === 'string' && /^#[0-9A-Fa-f]{6}$/.test(r)) {
    				var hex = parseInt(r.substr(1), 16);
    				r = hex >> 16 & 255;
    				g = hex >> 8 & 255;
    				b = hex & 255;
    			}

    			if (r === 0 && g === 0 && b === 0 || typeof g === 'undefined') {
    				textColor = f3(r / 255) + ' g';
    			} else {
    				textColor = [f3(r / 255), f3(g / 255), f3(b / 255), 'rg'].join(' ');
    			}

    			out(textColor);

    			return this;
    		};

    		/**
       * Sets a either previously added {@link GState} (via {@link addGState}) or a new {@link GState}.
       * @param {String|GState} gState If type is string, a previously added GState is used, if type is GState
       * it will be added before use.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setGState
       */
    		API.setGState = function (gState) {
    			if (typeof gState === "string") {
    				gState = gStates[gStatesMap[gState]];
    			} else {
    				gState = addGState(null, gState);
    			}

    			if (!gState.equals(activeGState)) {
    				out("/" + gState.id + " gs");
    				activeGState = gState;
    			}
    		};

    		/**
       * Is an Object providing a mapping from human-readable to
       * integer flag values designating the varieties of line cap
       * and join styles.
       *
       * @returns {Object}
       * @fieldOf jsPDF#
       * @name CapJoinStyles
       */
    		API.CapJoinStyles = {
    			0: 0,
    			'butt': 0,
    			'but': 0,
    			'miter': 0,
    			1: 1,
    			'round': 1,
    			'rounded': 1,
    			'circle': 1,
    			2: 2,
    			'projecting': 2,
    			'project': 2,
    			'square': 2,
    			'bevel': 2
    		};

    		/**
       * Sets the line cap styles
       * See {jsPDF.CapJoinStyles} for variants
       *
       * @param {String|Number} style A string or number identifying the type of line cap
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setLineCap
       */
    		API.setLineCap = function (style) {
    			var id = this.CapJoinStyles[style];
    			if (id === undefined) {
    				throw new Error("Line cap style of '" + style + "' is not recognized. See or extend .CapJoinStyles property for valid styles");
    			}
    			lineCapID = id;
    			out(id + ' J');

    			return this;
    		};

    		/**
       * Sets the line join styles
       * See {jsPDF.CapJoinStyles} for variants
       *
       * @param {String|Number} style A string or number identifying the type of line join
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setLineJoin
       */
    		API.setLineJoin = function (style) {
    			var id = this.CapJoinStyles[style];
    			if (id === undefined) {
    				throw new Error("Line join style of '" + style + "' is not recognized. See or extend .CapJoinStyles property for valid styles");
    			}
    			lineJoinID = id;
    			out(id + ' j');

    			return this;
    		};

    		/**
       * Sets the miter limit.
       * @param {number} miterLimit
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setMiterLimit
       */
    		API.setLineMiterLimit = function (miterLimit) {
    			out(f2(miterLimit) + " M");

    			return this;
    		};

    		/**
       * Sets the line dash pattern.
       * @param {Array<number>} array An array containing 0-2 numbers. The first number sets the length of the
       * dashes, the second number the length of the gaps. If the second number is missing, the gaps are considered
       * to be as long as the dashes. An empty array means solid, unbroken lines.
       * @param phase The phase lines start with.
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name setLineDashPattern
       */
    		API.setLineDashPattern = function (array, phase) {
    			out(["[" + (array[0] !== undefined ? array[0] : ""), (array[1] !== undefined ? array[1] : "") + "]", phase, "d"].join(" "));

    			return this;
    		};

    		// Output is both an internal (for plugins) and external function
    		API.output = _output;

    		/**
       * Saves as PDF document. An alias of jsPDF.output('save', 'filename.pdf')
       * @param  {String} filename The filename including extension.
       *
       * @function
       * @returns {jsPDF}
       * @methodOf jsPDF#
       * @name save
       */
    		API.save = function (filename) {
    			API.output('save', filename);
    		};

    		// applying plugins (more methods) ON TOP of built-in API.
    		// this is intentional as we allow plugins to override
    		// built-ins
    		for (var plugin in jsPDF.API) {
    			if (jsPDF.API.hasOwnProperty(plugin)) {
    				if (plugin === 'events' && jsPDF.API.events.length) {
    					(function (events, newEvents) {

    						// jsPDF.API.events is a JS Array of Arrays
    						// where each Array is a pair of event name, handler
    						// Events were added by plugins to the jsPDF instantiator.
    						// These are always added to the new instance and some ran
    						// during instantiation.
    						var eventname, handler_and_args, i;

    						for (i = newEvents.length - 1; i !== -1; i--) {
    							// subscribe takes 3 args: 'topic', function, runonce_flag
    							// if undefined, runonce is false.
    							// users can attach callback directly,
    							// or they can attach an array with [callback, runonce_flag]
    							// that's what the "apply" magic is for below.
    							eventname = newEvents[i][0];
    							handler_and_args = newEvents[i][1];
    							events.subscribe.apply(events, [eventname].concat(typeof handler_and_args === 'function' ? [handler_and_args] : handler_and_args));
    						}
    					})(events, jsPDF.API.events);
    				} else {
    					API[plugin] = jsPDF.API[plugin];
    				}
    			}
    		}

    		//////////////////////////////////////////////////////
    		// continuing initialization of jsPDF Document object
    		//////////////////////////////////////////////////////
    		// Add the first page automatically
    		addFonts();
    		activeFontKey = 'F1';
    		_addPage(format, orientation);

    		events.publish('initialized');
    		return API;
    	}

    	/**
      * jsPDF.API is a STATIC property of jsPDF class.
      * jsPDF.API is an object you can add methods and properties to.
      * The methods / properties you add will show up in new jsPDF objects.
      *
      * One property is prepopulated. It is the 'events' Object. Plugin authors can add topics,
      * callbacks to this object. These will be reassigned to all new instances of jsPDF.
      * Examples:
      * jsPDF.API.events['initialized'] = function(){ 'this' is API object }
      * jsPDF.API.events['addFont'] = function(added_font_object){ 'this' is API object }
      *
      * @static
      * @public
      * @memberOf jsPDF
      * @name API
      *
      * @example
      * jsPDF.API.mymethod = function(){
      *   // 'this' will be ref to internal API object. see jsPDF source
      *   // , so you can refer to built-in methods like so:
      *   //     this.line(....)
      *   //     this.text(....)
      * }
      * var pdfdoc = new jsPDF()
      * pdfdoc.mymethod() // <- !!!!!!
      */
    	jsPDF.API = { events: [] };
    	jsPDF.version = "1.2.68 2017-07-18T14:26:05.034Z:minint-e5ltq7i\vasilcenko";

    	if (typeof define === 'function' && define.amd) {
    		define('jsPDF', function () {
    			return jsPDF;
    		});
    	} else if (typeof module !== 'undefined' && module.exports) {
    		module.exports = jsPDF;
    	} else {
    		global.jsPDF = jsPDF;
    	}
    	return jsPDF;
    }(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this);
    

    /**
     * jsPDF AcroForm Plugin
     * Copyright (c) 2016 Alexander Weidt, https://github.com/BiggA94
     *
     * Licensed under the MIT License.
     * http://opensource.org/licenses/mit-license
     */

    (window.AcroForm = function (jsPDFAPI) {
        'use strict';

        var AcroForm = window.AcroForm;

        AcroForm.scale = function (x) {
            return x * (acroformPlugin.internal.scaleFactor / 1); // 1 = (96 / 72)
        };
        AcroForm.antiScale = function (x) {
            return 1 / acroformPlugin.internal.scaleFactor * x;
        };

        var acroformPlugin = {
            fields: [],
            xForms: [],
            /**
             * acroFormDictionaryRoot contains information about the AcroForm Dictionary
             * 0: The Event-Token, the AcroFormDictionaryCallback has
             * 1: The Object ID of the Root
             */
            acroFormDictionaryRoot: null,
            /**
             * After the PDF gets evaluated, the reference to the root has to be reset,
             * this indicates, whether the root has already been printed out
             */
            printedOut: false,
            internal: null
        };

        jsPDF.API.acroformPlugin = acroformPlugin;

        var annotReferenceCallback = function annotReferenceCallback() {
            for (var i in this.acroformPlugin.acroFormDictionaryRoot.Fields) {
                var formObject = this.acroformPlugin.acroFormDictionaryRoot.Fields[i];
                // add Annot Reference!
                if (formObject.hasAnnotation) {
                    // If theres an Annotation Widget in the Form Object, put the Reference in the /Annot array
                    createAnnotationReference.call(this, formObject);
                }
            }
        };

        var createAcroForm = function createAcroForm() {
            if (this.acroformPlugin.acroFormDictionaryRoot) {
                //return;
                throw new Error("Exception while creating AcroformDictionary");
            }

            // The Object Number of the AcroForm Dictionary
            this.acroformPlugin.acroFormDictionaryRoot = new AcroForm.AcroFormDictionary();

            this.acroformPlugin.internal = this.internal;

            // add Callback for creating the AcroForm Dictionary
            this.acroformPlugin.acroFormDictionaryRoot._eventID = this.internal.events.subscribe('postPutResources', AcroFormDictionaryCallback);

            this.internal.events.subscribe('buildDocument', annotReferenceCallback); //buildDocument

            // Register event, that is triggered when the DocumentCatalog is written, in order to add /AcroForm
            this.internal.events.subscribe('putCatalog', putCatalogCallback);

            // Register event, that creates all Fields
            this.internal.events.subscribe('postPutPages', createFieldCallback);
        };

        /**
         * Create the Reference to the widgetAnnotation, so that it gets referenced in the Annot[] int the+
         * (Requires the Annotation Plugin)
         */
        var createAnnotationReference = function createAnnotationReference(object) {
            var options = {
                type: 'reference',
                object: object
            };
            jsPDF.API.annotationPlugin.annotations[this.internal.getCurrentPageInfo().pageNumber].push(options);
        };

        var putForm = function putForm(formObject) {
            if (this.acroformPlugin.printedOut) {
                this.acroformPlugin.printedOut = false;
                this.acroformPlugin.acroFormDictionaryRoot = null;
            }
            if (!this.acroformPlugin.acroFormDictionaryRoot) {
                createAcroForm.call(this);
            }
            this.acroformPlugin.acroFormDictionaryRoot.Fields.push(formObject);
        };

        // Callbacks

        var putCatalogCallback = function putCatalogCallback() {
            //Put reference to AcroForm to DocumentCatalog
            if (typeof this.acroformPlugin.acroFormDictionaryRoot != 'undefined') {
                // for safety, shouldn't normally be the case
                this.internal.write('/AcroForm ' + this.acroformPlugin.acroFormDictionaryRoot.objId + ' ' + 0 + ' R');
            } else {
                console.log('Root missing...');
            }
        };

        /**
         * Adds /Acroform X 0 R to Document Catalog,
         * and creates the AcroForm Dictionary
         */
        var AcroFormDictionaryCallback = function AcroFormDictionaryCallback() {
            // Remove event
            this.internal.events.unsubscribe(this.acroformPlugin.acroFormDictionaryRoot._eventID);

            delete this.acroformPlugin.acroFormDictionaryRoot._eventID;

            this.acroformPlugin.printedOut = true;
        };

        /**
         * Creates the single Fields and writes them into the Document
         *
         * If fieldArray is set, use the fields that are inside it instead of the fields from the AcroRoot
         * (for the FormXObjects...)
         */
        var createFieldCallback = function createFieldCallback(fieldArray) {
            var standardFields = !fieldArray;

            if (!fieldArray) {
                // in case there is no fieldArray specified, we wanna print out the Fields of the AcroForm
                // Print out Root
                this.internal.newObjectDeferredBegin(this.acroformPlugin.acroFormDictionaryRoot.objId);
                this.internal.out(this.acroformPlugin.acroFormDictionaryRoot.getString());
            }

            var fieldArray = fieldArray || this.acroformPlugin.acroFormDictionaryRoot.Kids;

            for (var i in fieldArray) {
                var key = i;
                var form = fieldArray[i];

                var oldRect = form.Rect;

                if (form.Rect) {
                    form.Rect = AcroForm.internal.calculateCoordinates.call(this, form.Rect);
                }

                // Start Writing the Object
                this.internal.newObjectDeferredBegin(form.objId);

                var content = "";
                content += form.objId + " 0 obj\n";

                content += "<<\n" + form.getContent();

                form.Rect = oldRect;

                if (form.hasAppearanceStream && !form.appearanceStreamContent) {
                    // Calculate Appearance
                    var appearance = AcroForm.internal.calculateAppearanceStream.call(this, form);
                    content += "/AP << /N " + appearance + " >>\n";

                    this.acroformPlugin.xForms.push(appearance);
                }

                // Assume AppearanceStreamContent is a Array with N,R,D (at least one of them!)
                if (form.appearanceStreamContent) {
                    content += "/AP << ";
                    // Iterate over N,R and D
                    for (var k in form.appearanceStreamContent) {
                        var value = form.appearanceStreamContent[k];
                        content += "/" + k + " ";
                        content += "<< ";
                        if (Object.keys(value).length >= 1 || Array.isArray(value)) {
                            // appearanceStream is an Array or Object!
                            for (var i in value) {
                                var obj = value[i];
                                if (typeof obj === 'function') {
                                    // if Function is referenced, call it in order to get the FormXObject
                                    obj = obj.call(this, form);
                                }
                                content += "/" + i + " " + obj + " ";

                                // In case the XForm is already used, e.g. OffState of CheckBoxes, don't add it
                                if (!(this.acroformPlugin.xForms.indexOf(obj) >= 0)) this.acroformPlugin.xForms.push(obj);
                            }
                        } else {
                            var obj = value;
                            if (typeof obj === 'function') {
                                // if Function is referenced, call it in order to get the FormXObject
                                obj = obj.call(this, form);
                            }
                            content += "/" + i + " " + obj + " \n";
                            if (!(this.acroformPlugin.xForms.indexOf(obj) >= 0)) this.acroformPlugin.xForms.push(obj);
                        }
                        content += " >>\n";
                    }

                    // appearance stream is a normal Object..
                    content += ">>\n";
                }

                content += ">>\nendobj\n";

                this.internal.out(content);
            }
            if (standardFields) {
                createXFormObjectCallback.call(this, this.acroformPlugin.xForms);
            }
        };

        var createXFormObjectCallback = function createXFormObjectCallback(fieldArray) {
            for (var i in fieldArray) {
                var key = i;
                var form = fieldArray[i];
                // Start Writing the Object
                this.internal.newObjectDeferredBegin(form && form.objId);

                var content = "";
                content += form ? form.getString() : '';
                this.internal.out(content);

                delete fieldArray[key];
            }
        };

        // Public:

        jsPDFAPI.addField = function (fieldObject) {
            //var opt = parseOptions(fieldObject);
            if (fieldObject instanceof AcroForm.TextField) {
                addTextField.call(this, fieldObject);
            } else if (fieldObject instanceof AcroForm.ChoiceField) {
                addChoiceField.call(this, fieldObject);
            } else if (fieldObject instanceof AcroForm.Button) {
                addButton.call(this, fieldObject);
            } else if (fieldObject instanceof AcroForm.ChildClass) {
                putForm.call(this, fieldObject);
            } else if (fieldObject) {
                // try to put..
                putForm.call(this, fieldObject);
            }
            return this;
        };

        // ############### sort in:

        /**
         * Button
         * FT = Btn
         */
        var addButton = function addButton(options) {
            var options = options || new AcroForm.Field();

            options.FT = '/Btn';

            /**
             * Calculating the Ff entry:
             *
             * The Ff entry contains flags, that have to be set bitwise
             * In the Following the number in the Comment is the BitPosition
             */
            var flags = options.Ff || 0;

            // 17, Pushbutton
            if (options.pushbutton) {
                // Options.pushbutton should be 1 or 0
                flags = AcroForm.internal.setBitPosition(flags, 17);
                delete options.pushbutton;
            }

            //16, Radio
            if (options.radio) {
                //flags = options.Ff | options.radio << 15;
                flags = AcroForm.internal.setBitPosition(flags, 16);
                delete options.radio;
            }

            // 15, NoToggleToOff (Radio buttons only
            if (options.noToggleToOff) {
                //flags = options.Ff | options.noToggleToOff << 14;
                flags = AcroForm.internal.setBitPosition(flags, 15);
                //delete options.noToggleToOff;
            }

            // In case, there is no Flag set, it is a check-box
            options.Ff = flags;

            putForm.call(this, options);
        };

        var addTextField = function addTextField(options) {
            var options = options || new AcroForm.Field();

            options.FT = '/Tx';

            /**
             * Calculating the Ff entry:
             *
             * The Ff entry contains flags, that have to be set bitwise
             * In the Following the number in the Comment is the BitPosition
             */

            var flags = options.Ff || 0;

            // 13, multiline
            if (options.multiline) {
                // Set Flag
                flags = flags | 1 << 12;
                // Remove multiline from FieldObject
                //delete options.multiline;
            }

            // 14, Password
            if (options.password) {
                flags = flags | 1 << 13;
                //delete options.password;
            }

            // 21, FileSelect, PDF 1.4...
            if (options.fileSelect) {
                flags = flags | 1 << 20;
                //delete options.fileSelect;
            }

            // 23, DoNotSpellCheck, PDF 1.4...
            if (options.doNotSpellCheck) {
                flags = flags | 1 << 22;
                //delete options.doNotSpellCheck;
            }

            // 24, DoNotScroll, PDF 1.4...
            if (options.doNotScroll) {
                flags = flags | 1 << 23;
                //delete options.doNotScroll;
            }

            options.Ff = options.Ff || flags;

            // Add field
            putForm.call(this, options);
        };

        var addChoiceField = function addChoiceField(opt) {
            var options = opt || new AcroForm.Field();

            options.FT = '/Ch';

            /**
             * Calculating the Ff entry:
             *
             * The Ff entry contains flags, that have to be set bitwise
             * In the Following the number in the Comment is the BitPosition
             */

            var flags = options.Ff || 0;

            // 18, Combo (If not set, the choiceField is a listBox!!)
            if (options.combo) {
                // Set Flag
                flags = AcroForm.internal.setBitPosition(flags, 18);
                // Remove combo from FieldObject
                delete options.combo;
            }

            // 19, Edit
            if (options.edit) {
                flags = AcroForm.internal.setBitPosition(flags, 19);
                delete options.edit;
            }

            // 20, Sort
            if (options.sort) {
                flags = AcroForm.internal.setBitPosition(flags, 20);
                delete options.sort;
            }

            // 22, MultiSelect (PDF 1.4)
            if (options.multiSelect && this.internal.getPDFVersion() >= 1.4) {
                flags = AcroForm.internal.setBitPosition(flags, 22);
                delete options.multiSelect;
            }

            // 23, DoNotSpellCheck (PDF 1.4)
            if (options.doNotSpellCheck && this.internal.getPDFVersion() >= 1.4) {
                flags = AcroForm.internal.setBitPosition(flags, 23);
                delete options.doNotSpellCheck;
            }

            options.Ff = flags;

            //options.hasAnnotation = true;

            // Add field
            putForm.call(this, options);
        };
    })(jsPDF.API);

    var AcroForm = window.AcroForm;

    AcroForm.internal = {};

    AcroForm.createFormXObject = function (formObject) {
        var xobj = new AcroForm.FormXObject();
        var height = AcroForm.Appearance.internal.getHeight(formObject) || 0;
        var width = AcroForm.Appearance.internal.getWidth(formObject) || 0;
        xobj.BBox = [0, 0, width, height];
        return xobj;
    };

    // Contains Methods for creating standard appearances
    AcroForm.Appearance = {
        CheckBox: {
            createAppearanceStream: function createAppearanceStream() {
                var appearance = {
                    N: {
                        On: AcroForm.Appearance.CheckBox.YesNormal
                    },
                    D: {
                        On: AcroForm.Appearance.CheckBox.YesPushDown,
                        Off: AcroForm.Appearance.CheckBox.OffPushDown
                    }
                };

                return appearance;
            },
            /**
             * If any other icons are needed, the number between the brackets can be changed
             * @returns {string}
             */
            createMK: function createMK() {
                // 3-> Hook
                return "<< /CA (3)>>";
            },
            /**
             * Returns the standard On Appearance for a CheckBox
             * @returns {AcroForm.FormXObject}
             */
            YesPushDown: function YesPushDown(formObject) {
                var xobj = AcroForm.createFormXObject(formObject);
                var stream = "";
                // F13 is ZapfDingbats (Symbolic)
                formObject.Q = 1; // set text-alignment as centered
                var calcRes = AcroForm.internal.calculateX(formObject, "3", "ZapfDingbats", 50);
                stream += "0.749023 g\n\
             0 0 " + AcroForm.Appearance.internal.getWidth(formObject) + " " + AcroForm.Appearance.internal.getHeight(formObject) + " re\n\
             f\n\
             BMC\n\
             q\n\
             0 0 1 rg\n\
             /F13 " + calcRes.fontSize + " Tf 0 g\n\
             BT\n";
                stream += calcRes.text;
                stream += "ET\n\
             Q\n\
             EMC\n";
                xobj.stream = stream;
                return xobj;
            },

            YesNormal: function YesNormal(formObject) {
                var xobj = AcroForm.createFormXObject(formObject);
                var stream = "";
                formObject.Q = 1; // set text-alignment as centered
                var calcRes = AcroForm.internal.calculateX(formObject, "3", "ZapfDingbats", AcroForm.Appearance.internal.getHeight(formObject) * 0.9);
                stream += "1 g\n\
0 0 " + AcroForm.Appearance.internal.getWidth(formObject) + " " + AcroForm.Appearance.internal.getHeight(formObject) + " re\n\
f\n\
q\n\
0 0 1 rg\n\
0 0 " + (AcroForm.Appearance.internal.getWidth(formObject) - 1) + " " + (AcroForm.Appearance.internal.getHeight(formObject) - 1) + " re\n\
W\n\
n\n\
0 g\n\
BT\n\
/F13 " + calcRes.fontSize + " Tf 0 g\n";
                stream += calcRes.text;
                stream += "ET\n\
             Q\n";
                xobj.stream = stream;
                return xobj;
            },

            /**
             * Returns the standard Off Appearance for a CheckBox
             * @returns {AcroForm.FormXObject}
             */
            OffPushDown: function OffPushDown(formObject) {
                var xobj = AcroForm.createFormXObject(formObject);
                var stream = "";
                stream += "0.749023 g\n\
            0 0 " + AcroForm.Appearance.internal.getWidth(formObject) + " " + AcroForm.Appearance.internal.getHeight(formObject) + " re\n\
            f\n";
                xobj.stream = stream;
                return xobj;
            }
        },

        RadioButton: {
            Circle: {
                createAppearanceStream: function createAppearanceStream(name) {
                    var appearanceStreamContent = {
                        D: {
                            'Off': AcroForm.Appearance.RadioButton.Circle.OffPushDown
                        },
                        N: {}
                    };
                    appearanceStreamContent.N[name] = AcroForm.Appearance.RadioButton.Circle.YesNormal;
                    appearanceStreamContent.D[name] = AcroForm.Appearance.RadioButton.Circle.YesPushDown;
                    return appearanceStreamContent;
                },
                createMK: function createMK() {
                    return "<< /CA (l)>>";
                },

                YesNormal: function YesNormal(formObject) {
                    var xobj = AcroForm.createFormXObject(formObject);
                    var stream = "";
                    // Make the Radius of the Circle relative to min(height, width) of formObject
                    var DotRadius = AcroForm.Appearance.internal.getWidth(formObject) <= AcroForm.Appearance.internal.getHeight(formObject) ? AcroForm.Appearance.internal.getWidth(formObject) / 4 : AcroForm.Appearance.internal.getHeight(formObject) / 4;
                    // The Borderpadding...
                    DotRadius *= 0.9;
                    var c = AcroForm.Appearance.internal.Bezier_C;
                    /*
                     The Following is a Circle created with Bezier-Curves.
                     */
                    stream += "q\n\
1 0 0 1 " + AcroForm.Appearance.internal.getWidth(formObject) / 2 + " " + AcroForm.Appearance.internal.getHeight(formObject) / 2 + " cm\n\
" + DotRadius + " 0 m\n\
" + DotRadius + " " + DotRadius * c + " " + DotRadius * c + " " + DotRadius + " 0 " + DotRadius + " c\n\
-" + DotRadius * c + " " + DotRadius + " -" + DotRadius + " " + DotRadius * c + " -" + DotRadius + " 0 c\n\
-" + DotRadius + " -" + DotRadius * c + " -" + DotRadius * c + " -" + DotRadius + " 0 -" + DotRadius + " c\n\
" + DotRadius * c + " -" + DotRadius + " " + DotRadius + " -" + DotRadius * c + " " + DotRadius + " 0 c\n\
f\n\
Q\n";
                    xobj.stream = stream;
                    return xobj;
                },
                YesPushDown: function YesPushDown(formObject) {
                    var xobj = AcroForm.createFormXObject(formObject);
                    var stream = "";
                    var DotRadius = AcroForm.Appearance.internal.getWidth(formObject) <= AcroForm.Appearance.internal.getHeight(formObject) ? AcroForm.Appearance.internal.getWidth(formObject) / 4 : AcroForm.Appearance.internal.getHeight(formObject) / 4;
                    // The Borderpadding...
                    DotRadius *= 0.9;
                    var c = AcroForm.Appearance.internal.Bezier_C;
                    stream += "0.749023 g\n\
            q\n\
           1 0 0 1 " + AcroForm.Appearance.internal.getWidth(formObject) / 2 + " " + AcroForm.Appearance.internal.getHeight(formObject) / 2 + " cm\n\
" + DotRadius * 2 + " 0 m\n\
" + DotRadius * 2 + " " + DotRadius * 2 * c + " " + DotRadius * 2 * c + " " + DotRadius * 2 + " 0 " + DotRadius * 2 + " c\n\
-" + DotRadius * 2 * c + " " + DotRadius * 2 + " -" + DotRadius * 2 + " " + DotRadius * 2 * c + " -" + DotRadius * 2 + " 0 c\n\
-" + DotRadius * 2 + " -" + DotRadius * 2 * c + " -" + DotRadius * 2 * c + " -" + DotRadius * 2 + " 0 -" + DotRadius * 2 + " c\n\
" + DotRadius * 2 * c + " -" + DotRadius * 2 + " " + DotRadius * 2 + " -" + DotRadius * 2 * c + " " + DotRadius * 2 + " 0 c\n\
            f\n\
            Q\n\
            0 g\n\
            q\n\
            1 0 0 1 " + AcroForm.Appearance.internal.getWidth(formObject) / 2 + " " + AcroForm.Appearance.internal.getHeight(formObject) / 2 + " cm\n\
" + DotRadius + " 0 m\n\
" + DotRadius + " " + DotRadius * c + " " + DotRadius * c + " " + DotRadius + " 0 " + DotRadius + " c\n\
-" + DotRadius * c + " " + DotRadius + " -" + DotRadius + " " + DotRadius * c + " -" + DotRadius + " 0 c\n\
-" + DotRadius + " -" + DotRadius * c + " -" + DotRadius * c + " -" + DotRadius + " 0 -" + DotRadius + " c\n\
" + DotRadius * c + " -" + DotRadius + " " + DotRadius + " -" + DotRadius * c + " " + DotRadius + " 0 c\n\
            f\n\
            Q\n";
                    xobj.stream = stream;
                    return xobj;
                },
                OffPushDown: function OffPushDown(formObject) {
                    var xobj = AcroForm.createFormXObject(formObject);
                    var stream = "";
                    var DotRadius = AcroForm.Appearance.internal.getWidth(formObject) <= AcroForm.Appearance.internal.getHeight(formObject) ? AcroForm.Appearance.internal.getWidth(formObject) / 4 : AcroForm.Appearance.internal.getHeight(formObject) / 4;
                    // The Borderpadding...
                    DotRadius *= 0.9;
                    var c = AcroForm.Appearance.internal.Bezier_C;
                    stream += "0.749023 g\n\
            q\n\
 1 0 0 1 " + AcroForm.Appearance.internal.getWidth(formObject) / 2 + " " + AcroForm.Appearance.internal.getHeight(formObject) / 2 + " cm\n\
" + DotRadius * 2 + " 0 m\n\
" + DotRadius * 2 + " " + DotRadius * 2 * c + " " + DotRadius * 2 * c + " " + DotRadius * 2 + " 0 " + DotRadius * 2 + " c\n\
-" + DotRadius * 2 * c + " " + DotRadius * 2 + " -" + DotRadius * 2 + " " + DotRadius * 2 * c + " -" + DotRadius * 2 + " 0 c\n\
-" + DotRadius * 2 + " -" + DotRadius * 2 * c + " -" + DotRadius * 2 * c + " -" + DotRadius * 2 + " 0 -" + DotRadius * 2 + " c\n\
" + DotRadius * 2 * c + " -" + DotRadius * 2 + " " + DotRadius * 2 + " -" + DotRadius * 2 * c + " " + DotRadius * 2 + " 0 c\n\
            f\n\
            Q\n";
                    xobj.stream = stream;
                    return xobj;
                }
            },

            Cross: {
                /**
                 * Creates the Actual AppearanceDictionary-References
                 * @param name
                 * @returns
                 */
                createAppearanceStream: function createAppearanceStream(name) {
                    var appearanceStreamContent = {
                        D: {
                            'Off': AcroForm.Appearance.RadioButton.Cross.OffPushDown
                        },
                        N: {}
                    };
                    appearanceStreamContent.N[name] = AcroForm.Appearance.RadioButton.Cross.YesNormal;
                    appearanceStreamContent.D[name] = AcroForm.Appearance.RadioButton.Cross.YesPushDown;
                    return appearanceStreamContent;
                },
                createMK: function createMK() {
                    return "<< /CA (8)>>";
                },

                YesNormal: function YesNormal(formObject) {
                    var xobj = AcroForm.createFormXObject(formObject);
                    var stream = "";
                    var cross = AcroForm.Appearance.internal.calculateCross(formObject);
                    stream += "q\n\
            1 1 " + (AcroForm.Appearance.internal.getWidth(formObject) - 2) + " " + (AcroForm.Appearance.internal.getHeight(formObject) - 2) + " re\n\
            W\n\
            n\n\
            " + cross.x1.x + " " + cross.x1.y + " m\n\
            " + cross.x2.x + " " + cross.x2.y + " l\n\
            " + cross.x4.x + " " + cross.x4.y + " m\n\
            " + cross.x3.x + " " + cross.x3.y + " l\n\
            s\n\
            Q\n";
                    xobj.stream = stream;
                    return xobj;
                },
                YesPushDown: function YesPushDown(formObject) {
                    var xobj = AcroForm.createFormXObject(formObject);
                    var cross = AcroForm.Appearance.internal.calculateCross(formObject);
                    var stream = "";
                    stream += "0.749023 g\n\
            0 0 " + AcroForm.Appearance.internal.getWidth(formObject) + " " + AcroForm.Appearance.internal.getHeight(formObject) + " re\n\
            f\n\
            q\n\
            1 1 " + (AcroForm.Appearance.internal.getWidth(formObject) - 2) + " " + (AcroForm.Appearance.internal.getHeight(formObject) - 2) + " re\n\
            W\n\
            n\n\
            " + cross.x1.x + " " + cross.x1.y + " m\n\
            " + cross.x2.x + " " + cross.x2.y + " l\n\
            " + cross.x4.x + " " + cross.x4.y + " m\n\
            " + cross.x3.x + " " + cross.x3.y + " l\n\
            s\n\
            Q\n";
                    xobj.stream = stream;
                    return xobj;
                },
                OffPushDown: function OffPushDown(formObject) {
                    var xobj = AcroForm.createFormXObject(formObject);
                    var stream = "";
                    stream += "0.749023 g\n\
            0 0 " + AcroForm.Appearance.internal.getWidth(formObject) + " " + AcroForm.Appearance.internal.getHeight(formObject) + " re\n\
            f\n";
                    xobj.stream = stream;
                    return xobj;
                }
            }
        },

        /**
         * Returns the standard Appearance
         * @returns {AcroForm.FormXObject}
         */
        createDefaultAppearanceStream: function createDefaultAppearanceStream(formObject) {
            var stream = "";
            // Set Helvetica to Standard Font (12px)
            // Color: Black
            stream += "/Helv 12 Tf 0 g";
            return stream;
        }
    };

    AcroForm.Appearance.internal = {
        Bezier_C: 0.551915024494,

        calculateCross: function calculateCross(formObject) {
            var min = function min(x, y) {
                return x > y ? y : x;
            };

            var width = AcroForm.Appearance.internal.getWidth(formObject);
            var height = AcroForm.Appearance.internal.getHeight(formObject);
            var a = min(width, height);
            var crossSize = a;
            var borderPadding = 2; // The Padding in px


            var cross = {
                x1: { // upperLeft
                    x: (width - a) / 2,
                    y: (height - a) / 2 + a //height - borderPadding
                },
                x2: { // lowerRight
                    x: (width - a) / 2 + a,
                    y: (height - a) / 2 //borderPadding
                },
                x3: { // lowerLeft
                    x: (width - a) / 2,
                    y: (height - a) / 2 //borderPadding
                },
                x4: { // upperRight
                    x: (width - a) / 2 + a,
                    y: (height - a) / 2 + a //height - borderPadding
                }
            };

            return cross;
        }
    };
    AcroForm.Appearance.internal.getWidth = function (formObject) {
        return formObject.Rect[2]; //(formObject.Rect[2] - formObject.Rect[0]) || 0;
    };
    AcroForm.Appearance.internal.getHeight = function (formObject) {
        return formObject.Rect[3]; //(formObject.Rect[1] - formObject.Rect[3]) || 0;
    };

    // ##########################

    //### For inheritance:
    AcroForm.internal.inherit = function (child, parent) {
        var ObjectCreate = Object.create || function (o) {
            var F = function F() {};
            F.prototype = o;
            return new F();
        };
        child.prototype = Object.create(parent.prototype);
        child.prototype.constructor = child;
    };

    // ### Handy Functions:

    AcroForm.internal.arrayToPdfArray = function (array) {
        if (Array.isArray(array)) {
            var content = ' [';
            for (var i in array) {
                var element = array[i].toString();
                content += element;
                content += i < array.length - 1 ? ' ' : '';
            }
            content += ']';

            return content;
        }
    };

    AcroForm.internal.toPdfString = function (string) {
        string = string || "";

        // put Bracket at the Beginning of the String
        if (string.indexOf('(') !== 0) {
            string = '(' + string;
        }

        if (string.substring(string.length - 1) != ')') {
            string += '(';
        }
        return string;
    };

    // ##########################
    //          Classes
    // ##########################


    AcroForm.PDFObject = function () {
        // The Object ID in the PDF Object Model
        // todo
        var _objId;
        Object.defineProperty(this, 'objId', {
            get: function get() {
                if (!_objId) {
                    if (this.internal) {
                        _objId = this.internal.newObjectDeferred();
                    } else if (jsPDF.API.acroformPlugin.internal) {
                        // todo - find better option, that doesn't rely on a Global Static var
                        _objId = jsPDF.API.acroformPlugin.internal.newObjectDeferred();
                    }
                }
                if (!_objId) {
                    console.log("Couldn't create Object ID");
                }
                return _objId;
            },
            configurable: false
        });
    };

    AcroForm.PDFObject.prototype.toString = function () {
        return this.objId + " 0 R";
    };

    AcroForm.PDFObject.prototype.getString = function () {
        var res = this.objId + " 0 obj\n<<";
        var content = this.getContent();

        res += content + ">>\n";
        if (this.stream) {
            res += "stream\n";
            res += this.stream;
            res += "endstream\n";
        }
        res += "endobj\n";
        return res;
    };

    AcroForm.PDFObject.prototype.getContent = function () {
        /**
         * Prints out all enumerable Variables from the Object
         * @param fieldObject
         * @returns {string}
         */
        var createContentFromFieldObject = function createContentFromFieldObject(fieldObject) {
            var content = '';

            var keys = Object.keys(fieldObject).filter(function (key) {
                return key != 'content' && key != 'appearanceStreamContent' && key.substring(0, 1) != "_";
            });

            for (var i in keys) {
                var key = keys[i];
                var value = fieldObject[key];

                /*if (key == 'Rect' && value) {
                 value = AcroForm.internal.calculateCoordinates.call(jsPDF.API.acroformPlugin.internal, value);
                 }*/

                if (value) {
                    if (Array.isArray(value)) {
                        content += '/' + key + ' ' + AcroForm.internal.arrayToPdfArray(value) + "\n";
                    } else if (value instanceof AcroForm.PDFObject) {
                        // In case it is a reference to another PDFObject, take the referennce number
                        content += '/' + key + ' ' + value.objId + " 0 R" + "\n";
                    } else {
                        content += '/' + key + ' ' + value + '\n';
                    }
                }
            }
            return content;
        };

        var object = "";

        object += createContentFromFieldObject(this);
        return object;
    };

    AcroForm.FormXObject = function () {
        AcroForm.PDFObject.call(this);
        this.Type = "/XObject";
        this.Subtype = "/Form";
        this.FormType = 1;
        this.BBox;
        this.Matrix;
        this.Resources = "2 0 R";
        this.PieceInfo;
        var _stream;
        Object.defineProperty(this, 'Length', {
            enumerable: true,
            get: function get() {
                return _stream !== undefined ? _stream.length : 0;
            }
        });
        Object.defineProperty(this, 'stream', {
            enumerable: false,
            set: function set(val) {
                _stream = val;
            },
            get: function get() {
                if (_stream) {
                    return _stream;
                } else {
                    return null;
                }
            }
        });
    };

    AcroForm.internal.inherit(AcroForm.FormXObject, AcroForm.PDFObject);

    AcroForm.AcroFormDictionary = function () {
        AcroForm.PDFObject.call(this);
        var _Kids = [];
        Object.defineProperty(this, 'Kids', {
            enumerable: false,
            configurable: true,
            get: function get() {
                if (_Kids.length > 0) {
                    return _Kids;
                } else {
                    return;
                }
            }
        });
        Object.defineProperty(this, 'Fields', {
            enumerable: true,
            configurable: true,
            get: function get() {
                return _Kids;
            }
        });
        // Default Appearance
        this.DA;
    };

    AcroForm.internal.inherit(AcroForm.AcroFormDictionary, AcroForm.PDFObject);

    // ##### The Objects, the User can Create:


    // The Field Object contains the Variables, that every Field needs
    // Rectangle for Appearance: lower_left_X, lower_left_Y, width, height
    AcroForm.Field = function () {
        'use strict';

        AcroForm.PDFObject.call(this);

        var _Rect;
        Object.defineProperty(this, 'Rect', {
            enumerable: true,
            configurable: false,
            get: function get() {
                if (!_Rect) {
                    return;
                }
                var tmp = _Rect;
                //var calculatedRes = AcroForm.internal.calculateCoordinates(_Rect); // do later!
                return tmp;
            },
            set: function set(val) {
                _Rect = val;
            }
        });

        var _FT = "";
        Object.defineProperty(this, 'FT', {
            enumerable: true,
            set: function set(val) {
                _FT = val;
            },
            get: function get() {
                return _FT;
            }
        });
        /**
         * The Partial name of the Field Object.
         * It has to be unique.
         */
        var _T;

        Object.defineProperty(this, 'T', {
            enumerable: true,
            configurable: false,
            set: function set(val) {
                _T = val;
            },
            get: function get() {
                if (!_T || _T.length < 1) {
                    if (this instanceof AcroForm.ChildClass) {
                        // In case of a Child from a Radio´Group, you don't need a FieldName!!!
                        return;
                    }
                    return "(FieldObject" + AcroForm.Field.FieldNum++ + ")";
                }
                if (_T.substring(0, 1) == "(" && _T.substring(_T.length - 1)) {
                    return _T;
                }
                return "(" + _T + ")";
            }
        });

        var _DA;
        // Defines the default appearance (Needed for variable Text)
        Object.defineProperty(this, 'DA', {
            enumerable: true,
            get: function get() {
                if (!_DA) {
                    return;
                }
                return '(' + _DA + ')';
            },
            set: function set(val) {
                _DA = val;
            }
        });

        var _DV;
        // Defines the default value
        Object.defineProperty(this, 'DV', {
            enumerable: true,
            configurable: true,
            get: function get() {
                if (!_DV) {
                    return;
                }
                return _DV;
            },
            set: function set(val) {
                _DV = val;
            }
        });

        //this.Type = "/Annot";
        //this.Subtype = "/Widget";
        Object.defineProperty(this, 'Type', {
            enumerable: true,
            get: function get() {
                return this.hasAnnotation ? "/Annot" : null;
            }
        });

        Object.defineProperty(this, 'Subtype', {
            enumerable: true,
            get: function get() {
                return this.hasAnnotation ? "/Widget" : null;
            }
        });

        /**
         *
         * @type {Array}
         */
        this.BG;

        Object.defineProperty(this, 'hasAnnotation', {
            enumerable: false,
            get: function get() {
                if (this.Rect || this.BC || this.BG) {
                    return true;
                }
                return false;
            }
        });

        Object.defineProperty(this, 'hasAppearanceStream', {
            enumerable: false,
            configurable: true,
            writable: true
        });
    };
    AcroForm.Field.FieldNum = 0;

    AcroForm.internal.inherit(AcroForm.Field, AcroForm.PDFObject);

    AcroForm.ChoiceField = function () {
        AcroForm.Field.call(this);
        // Field Type = Choice Field
        this.FT = "/Ch";
        // options
        this.Opt = [];
        this.V = '()';
        // Top Index
        this.TI = 0;
        /**
         * Defines, whether the
         * @type {boolean}
         */
        this.combo = false;
        /**
         * Defines, whether the Choice Field is an Edit Field.
         * An Edit Field is automatically an Combo Field.
         */
        Object.defineProperty(this, 'edit', {
            enumerable: true,
            set: function set(val) {
                if (val == true) {
                    this._edit = true;
                    // ComboBox has to be true
                    this.combo = true;
                } else {
                    this._edit = false;
                }
            },
            get: function get() {
                if (!this._edit) {
                    return false;
                }
                return this._edit;
            },
            configurable: false
        });
        this.hasAppearanceStream = true;
        Object.defineProperty(this, 'V', {
            get: function get() {
                AcroForm.internal.toPdfString();
            }
        });
    };
    AcroForm.internal.inherit(AcroForm.ChoiceField, AcroForm.Field);
    window["ChoiceField"] = AcroForm.ChoiceField;

    AcroForm.ListBox = function () {
        AcroForm.ChoiceField.call(this);
        //var combo = true;
    };
    AcroForm.internal.inherit(AcroForm.ListBox, AcroForm.ChoiceField);
    window["ListBox"] = AcroForm.ListBox;

    AcroForm.ComboBox = function () {
        AcroForm.ListBox.call(this);
        this.combo = true;
    };
    AcroForm.internal.inherit(AcroForm.ComboBox, AcroForm.ListBox);
    window["ComboBox"] = AcroForm.ComboBox;

    AcroForm.EditBox = function () {
        AcroForm.ComboBox.call(this);
        this.edit = true;
    };
    AcroForm.internal.inherit(AcroForm.EditBox, AcroForm.ComboBox);
    window["EditBox"] = AcroForm.EditBox;

    AcroForm.Button = function () {
        AcroForm.Field.call(this);
        this.FT = "/Btn";
        //this.hasAnnotation = true;
    };
    AcroForm.internal.inherit(AcroForm.Button, AcroForm.Field);
    window["Button"] = AcroForm.Button;

    AcroForm.PushButton = function () {
        AcroForm.Button.call(this);
        this.pushbutton = true;
    };
    AcroForm.internal.inherit(AcroForm.PushButton, AcroForm.Button);
    window["PushButton"] = AcroForm.PushButton;

    AcroForm.RadioButton = function () {
        AcroForm.Button.call(this);
        this.radio = true;
        var _Kids = [];
        Object.defineProperty(this, 'Kids', {
            enumerable: true,
            get: function get() {
                if (_Kids.length > 0) {
                    return _Kids;
                }
            }
        });

        Object.defineProperty(this, '__Kids', {
            get: function get() {
                return _Kids;
            }
        });

        var _noToggleToOff;

        Object.defineProperty(this, 'noToggleToOff', {
            enumerable: false,
            get: function get() {
                return _noToggleToOff;
            },
            set: function set(val) {
                _noToggleToOff = val;
            }
        });

        //this.hasAnnotation = false;
    };
    AcroForm.internal.inherit(AcroForm.RadioButton, AcroForm.Button);
    window["RadioButton"] = AcroForm.RadioButton;

    /*
     * The Child classs of a RadioButton (the radioGroup)
     * -> The single Buttons
     */
    AcroForm.ChildClass = function (parent, name) {
        AcroForm.Field.call(this);
        this.Parent = parent;

        // todo: set AppearanceType as variable that can be set from the outside...
        this._AppearanceType = AcroForm.Appearance.RadioButton.Circle; // The Default appearanceType is the Circle
        this.appearanceStreamContent = this._AppearanceType.createAppearanceStream(name);

        // Set Print in the Annot Flag
        this.F = AcroForm.internal.setBitPosition(this.F, 3, 1);

        // Set AppearanceCharacteristicsDictionary with default appearance if field is not interacting with user
        this.MK = this._AppearanceType.createMK(); // (8) -> Cross, (1)-> Circle, ()-> nothing

        // Default Appearance is Off
        this.AS = "/Off"; // + name;

        this._Name = name;
    };
    AcroForm.internal.inherit(AcroForm.ChildClass, AcroForm.Field);

    AcroForm.RadioButton.prototype.setAppearance = function (appearance) {
        if (!('createAppearanceStream' in appearance && 'createMK' in appearance)) {
            console.log("Couldn't assign Appearance to RadioButton. Appearance was Invalid!");
            return;
        }
        for (var i in this.__Kids) {
            var child = this.__Kids[i];

            child.appearanceStreamContent = appearance.createAppearanceStream(child._Name);
            child.MK = appearance.createMK();
        }
    };

    AcroForm.RadioButton.prototype.createOption = function (name) {
        var parent = this;
        var kidCount = this.__Kids.length;

        // Create new Child for RadioGroup
        var child = new AcroForm.ChildClass(parent, name);
        // Add to Parent
        this.__Kids.push(child);

        jsPDF.API.addField(child);

        return child;
    };

    AcroForm.CheckBox = function () {
        Button.call(this);
        this.appearanceStreamContent = AcroForm.Appearance.CheckBox.createAppearanceStream();
        this.MK = AcroForm.Appearance.CheckBox.createMK();
        this.AS = "/On";
        this.V = "/On";
    };
    AcroForm.internal.inherit(AcroForm.CheckBox, AcroForm.Button);
    window["CheckBox"] = AcroForm.CheckBox;

    AcroForm.TextField = function () {
        AcroForm.Field.call(this);
        //this.DA = AcroForm.createDefaultAppearanceStream();
        var _V;
        Object.defineProperty(this, 'V', {
            get: function get() {
                if (_V) {
                    return "(" + _V + ")";
                } else {
                    return _V;
                }
            },
            enumerable: true,
            set: function set(val) {
                _V = val;
            }
        });

        var _DV;
        Object.defineProperty(this, 'DV', {
            get: function get() {
                if (_DV) {
                    return "(" + _DV + ")";
                } else {
                    return _DV;
                }
            },
            enumerable: true,
            set: function set(val) {
                _DV = val;
            }
        });

        var _multiline = false;
        Object.defineProperty(this, 'multiline', {
            enumerable: false,
            get: function get() {
                return _multiline;
            },
            set: function set(val) {
                _multiline = val;
            }
        });

        //this.multiline = false;
        //this.password = false;
        /**
         * For PDF 1.4
         * @type {boolean}
         */
        //this.fileSelect = false;
        /**
         * For PDF 1.4
         * @type {boolean}
         */
        //this.doNotSpellCheck = false;
        /**
         * For PDF 1.4
         * @type {boolean}
         */
        //this.doNotScroll = false;


        Object.defineProperty(this, 'hasAppearanceStream', {
            enumerable: false,
            get: function get() {
                return this.V || this.DV;
            }
        });
    };
    AcroForm.internal.inherit(AcroForm.TextField, AcroForm.Field);
    window["TextField"] = AcroForm.TextField;

    AcroForm.PasswordField = function () {
        TextField.call(this);
        Object.defineProperty(this, 'password', {
            value: true,
            enumerable: false,
            configurable: false,
            writable: false
        });
    };
    AcroForm.internal.inherit(AcroForm.PasswordField, AcroForm.TextField);
    window["PasswordField"] = AcroForm.PasswordField;

    // ############ internal functions

    /*
     * small workaround for calculating the TextMetric aproximately
     * @param text
     * @param fontsize
     * @returns {TextMetrics} (Has Height and Width)
     */
    AcroForm.internal.calculateFontSpace = function (text, fontsize, fonttype) {
        var fonttype = fonttype || "helvetica";
        //re-use canvas object for speed improvements
        var canvas = AcroForm.internal.calculateFontSpace.canvas || (AcroForm.internal.calculateFontSpace.canvas = document.createElement('canvas'));

        var context = canvas.getContext('2d');
        context.save();
        var newFont = fontsize + " " + fonttype;
        context.font = newFont;
        var res = context.measureText(text);
        context.fontcolor = 'black';
        // Calculate height:
        var context = canvas.getContext('2d');
        res.height = context.measureText("3").width * 1.5; // 3 because in ZapfDingbats its a Hook and a 3 in normal fonts
        context.restore();

        var width = res.width;

        return res;
    };

    AcroForm.internal.calculateX = function (formObject, text, font, maxFontSize) {
        var maxFontSize = maxFontSize || 12;
        var font = font || "helvetica";
        var returnValue = {
            text: "",
            fontSize: ""
        };
        // Remove Brackets
        text = text.substr(0, 1) == '(' ? text.substr(1) : text;
        text = text.substr(text.length - 1) == ')' ? text.substr(0, text.length - 1) : text;
        // split into array of words
        var textSplit = text.split(' ');

        /**
         * the color could be ((alpha)||(r,g,b)||(c,m,y,k))
         * @type {string}
         */
        var color = "0 g\n";
        var fontSize = maxFontSize; // The Starting fontSize (The Maximum)
        var lineSpacing = 2;
        var borderPadding = 2;

        var height = AcroForm.Appearance.internal.getHeight(formObject) || 0;
        height = height < 0 ? -height : height;
        var width = AcroForm.Appearance.internal.getWidth(formObject) || 0;
        width = width < 0 ? -width : width;

        var isSmallerThanWidth = function isSmallerThanWidth(i, lastLine, fontSize) {
            if (i + 1 < textSplit.length) {
                var tmp = lastLine + " " + textSplit[i + 1];
                var TextWidth = AcroForm.internal.calculateFontSpace(tmp, fontSize + "px", font).width;
                var FieldWidth = width - 2 * borderPadding;
                return TextWidth <= FieldWidth;
            } else {
                return false;
            }
        };

        fontSize++;
        FontSize: while (true) {
            var text = "";
            fontSize--;
            var textHeight = AcroForm.internal.calculateFontSpace("3", fontSize + "px", font).height;
            var startY = formObject.multiline ? height - fontSize : (height - textHeight) / 2;
            startY += lineSpacing;
            var startX = -borderPadding;

            var lastX = startX,
                lastY = startY;
            var firstWordInLine = 0,
                lastWordInLine = 0;
            var lastLength = 0;

            var y = 0;
            if (fontSize == 0) {
                // In case, the Text doesn't fit at all
                fontSize = 12;
                text = "(...) Tj\n";
                text += "% Width of Text: " + AcroForm.internal.calculateFontSpace(text, "1px").width + ", FieldWidth:" + width + "\n";
                break;
            }

            lastLength = AcroForm.internal.calculateFontSpace(textSplit[0] + " ", fontSize + "px", font).width;

            var lastLine = "";
            var lineCount = 0;
            Line: for (var i in textSplit) {
                lastLine += textSplit[i] + " ";
                // Remove last blank
                lastLine = lastLine.substr(lastLine.length - 1) == " " ? lastLine.substr(0, lastLine.length - 1) : lastLine;
                var key = parseInt(i);
                lastLength = AcroForm.internal.calculateFontSpace(lastLine + " ", fontSize + "px", font).width;
                var nextLineIsSmaller = isSmallerThanWidth(key, lastLine, fontSize);
                var isLastWord = i >= textSplit.length - 1;
                if (nextLineIsSmaller && !isLastWord) {
                    lastLine += " ";
                    continue; // Line
                } else if (!nextLineIsSmaller && !isLastWord) {
                    if (!formObject.multiline) {
                        continue FontSize;
                    } else {
                        if ((textHeight + lineSpacing) * (lineCount + 2) + lineSpacing > height) {
                            // If the Text is higher than the FieldObject
                            continue FontSize;
                        }
                        lastWordInLine = key;
                        // go on
                    }
                } else if (isLastWord) {
                    lastWordInLine = key;
                } else {
                    if (formObject.multiline && (textHeight + lineSpacing) * (lineCount + 2) + lineSpacing > height) {
                        // If the Text is higher than the FieldObject
                        continue FontSize;
                    }
                }

                var line = '';

                for (var x = firstWordInLine; x <= lastWordInLine; x++) {
                    line += textSplit[x] + ' ';
                }

                // Remove last blank
                line = line.substr(line.length - 1) == " " ? line.substr(0, line.length - 1) : line;
                //lastLength -= blankSpace.width;
                lastLength = AcroForm.internal.calculateFontSpace(line, fontSize + "px", font).width;

                // Calculate startX
                switch (formObject.Q) {
                    case 2:
                        // Right justified
                        startX = width - lastLength - borderPadding;
                        break;
                    case 1:
                        // Q = 1 := Text-Alignment: Center
                        startX = (width - lastLength) / 2;
                        break;
                    case 0:
                    default:
                        startX = borderPadding;
                        break;
                }
                text += startX + ' ' + lastY + ' Td\n';
                text += '(' + line + ') Tj\n';
                // reset X in PDF
                text += -startX + ' 0 Td\n';

                // After a Line, adjust y position
                lastY = -(fontSize + lineSpacing);
                lastX = startX;

                // Reset for next iteration step
                lastLength = 0;
                firstWordInLine = lastWordInLine + 1;
                lineCount++;

                lastLine = "";
                continue Line;
            }
            break;
        }

        returnValue.text = text;
        returnValue.fontSize = fontSize;

        return returnValue;
    };

    AcroForm.internal.calculateAppearanceStream = function (formObject) {
        if (formObject.appearanceStreamContent) {
            // If appearanceStream is already set, use it
            return formObject.appearanceStreamContent;
        }

        if (!formObject.V && !formObject.DV) {
            return;
        }

        // else calculate it

        var stream = '';

        var text = formObject.V || formObject.DV;

        var calcRes = AcroForm.internal.calculateX(formObject, text);

        stream += '/Tx BMC\n' + 'q\n' +
        //color + '\n' +
        '/F1 ' + calcRes.fontSize + ' Tf\n' +
        // Text Matrix
        '1 0 0 1 0 0 Tm\n';
        // Begin Text
        stream += 'BT\n';
        stream += calcRes.text;
        // End Text
        stream += 'ET\n';
        stream += 'Q\n' + 'EMC\n';

        var appearanceStreamContent = new AcroForm.createFormXObject(formObject);

        appearanceStreamContent.stream = stream;

        var appearance = {
            N: {
                'Normal': appearanceStreamContent
            }
        };

        return appearanceStreamContent;
    };

    /*
     * Converts the Parameters from x,y,w,h to lowerLeftX, lowerLeftY, upperRightX, upperRightY
     * @param x
     * @param y
     * @param w
     * @param h
     * @returns {*[]}
     */
    AcroForm.internal.calculateCoordinates = function (x, y, w, h) {
        var coordinates = {};

        if (this.internal) {
            var mmtopx = function mmtopx(x) {
                return x * this.internal.scaleFactor;
            };

            if (Array.isArray(x)) {
                x[0] = AcroForm.scale(x[0]);
                x[1] = AcroForm.scale(x[1]);
                x[2] = AcroForm.scale(x[2]);
                x[3] = AcroForm.scale(x[3]);

                coordinates.lowerLeft_X = x[0] | 0;
                coordinates.lowerLeft_Y = mmtopx.call(this, this.internal.pageSize.height) - x[3] - x[1] | 0;
                coordinates.upperRight_X = x[0] + x[2] | 0;
                coordinates.upperRight_Y = mmtopx.call(this, this.internal.pageSize.height) - x[1] | 0;
            } else {
                x = AcroForm.scale(x);
                y = AcroForm.scale(y);
                w = AcroForm.scale(w);
                h = AcroForm.scale(h);
                coordinates.lowerLeft_X = x | 0;
                coordinates.lowerLeft_Y = this.internal.pageSize.height - y | 0;
                coordinates.upperRight_X = x + w | 0;
                coordinates.upperRight_Y = this.internal.pageSize.height - y + h | 0;
            }
        } else {
            // old method, that is fallback, if we can't get the pageheight, the coordinate-system starts from lower left
            if (Array.isArray(x)) {
                coordinates.lowerLeft_X = x[0] | 0;
                coordinates.lowerLeft_Y = x[1] | 0;
                coordinates.upperRight_X = x[0] + x[2] | 0;
                coordinates.upperRight_Y = x[1] + x[3] | 0;
            } else {
                coordinates.lowerLeft_X = x | 0;
                coordinates.lowerLeft_Y = y | 0;
                coordinates.upperRight_X = x + w | 0;
                coordinates.upperRight_Y = y + h | 0;
            }
        }

        return [coordinates.lowerLeft_X, coordinates.lowerLeft_Y, coordinates.upperRight_X, coordinates.upperRight_Y];
    };

    AcroForm.internal.calculateColor = function (r, g, b) {
        var color = new Array(3);
        color.r = r | 0;
        color.g = g | 0;
        color.b = b | 0;
        return color;
    };

    AcroForm.internal.getBitPosition = function (variable, position) {
        variable = variable || 0;
        var bitMask = 1;
        bitMask = bitMask << position - 1;
        return variable | bitMask;
    };

    AcroForm.internal.setBitPosition = function (variable, position, value) {
        variable = variable || 0;
        value = value || 1;

        var bitMask = 1;
        bitMask = bitMask << position - 1;

        if (value == 1) {
            // Set the Bit to 1
            var variable = variable | bitMask;
        } else {
            // Set the Bit to 0
            var variable = variable & ~bitMask;
        }

        return variable;
    };

    /**
     * jsPDF addHTML PlugIn
     * Copyright (c) 2014 Diego Casorran
     *
     * Licensed under the MIT License.
     * http://opensource.org/licenses/mit-license
     */

    (function (jsPDFAPI) {
    	'use strict';

    	/**
      * Renders an HTML element to canvas object which added to the PDF
      *
      * This PlugIn requires html2canvas: https://github.com/niklasvh/html2canvas
      *            OR rasterizeHTML: https://github.com/cburgmer/rasterizeHTML.js
      *
      * @public
      * @function
      * @param element {Mixed} HTML Element, or anything supported by html2canvas.
      * @param x {Number} starting X coordinate in jsPDF instance's declared units.
      * @param y {Number} starting Y coordinate in jsPDF instance's declared units.
      * @param options {Object} Additional options, check the code below.
      * @param callback {Function} to call when the rendering has finished.
      *
      * NOTE: Every parameter is optional except 'element' and 'callback', in such
      *       case the image is positioned at 0x0 covering the whole PDF document
      *       size. Ie, to easily take screenshots of webpages saving them to PDF.
      */

    	jsPDFAPI.addHTML = function (element, x, y, options, callback) {
    		'use strict';

    		if (typeof html2canvas === 'undefined' && typeof rasterizeHTML === 'undefined') throw new Error('You need either ' + 'https://github.com/niklasvh/html2canvas' + ' or https://github.com/cburgmer/rasterizeHTML.js');

    		if (typeof x !== 'number') {
    			options = x;
    			callback = y;
    		}

    		if (typeof options === 'function') {
    			callback = options;
    			options = null;
    		}

    		var I = this.internal,
    		    K = I.scaleFactor,
    		    W = I.pageSize.width,
    		    H = I.pageSize.height;

    		options = options || {};
    		options.onrendered = function (obj) {
    			x = parseInt(x) || 0;
    			y = parseInt(y) || 0;
    			var dim = options.dim || {};
    			var h = dim.h || 0;
    			var w = dim.w || Math.min(W, obj.width / K) - x;

    			var format = 'JPEG';
    			if (options.format) format = options.format;

    			if (obj.height > H && options.pagesplit) {
    				var crop = function () {
    					var cy = 0;
    					while (1) {
    						var canvas = document.createElement('canvas');
    						canvas.width = Math.min(W * K, obj.width);
    						canvas.height = Math.min(H * K, obj.height - cy);
    						var ctx = canvas.getContext('2d');
    						ctx.drawImage(obj, 0, cy, obj.width, canvas.height, 0, 0, canvas.width, canvas.height);
    						var args = [canvas, x, cy ? 0 : y, canvas.width / K, canvas.height / K, format, null, 'SLOW'];
    						this.addImage.apply(this, args);
    						cy += canvas.height;
    						if (cy >= obj.height) break;
    						this.addPage();
    					}
    					callback(w, cy, null, args);
    				}.bind(this);
    				if (obj.nodeName === 'CANVAS') {
    					var img = new Image();
    					img.onload = crop;
    					img.src = obj.toDataURL("image/png");
    					obj = img;
    				} else {
    					crop();
    				}
    			} else {
    				var alias = Math.random().toString(35);
    				var args = [obj, x, y, w, h, format, alias, 'SLOW'];

    				this.addImage.apply(this, args);

    				callback(w, h, alias, args);
    			}
    		}.bind(this);

    		if (typeof html2canvas !== 'undefined' && !options.rstz) {
    			return html2canvas(element, options);
    		}

    		if (typeof rasterizeHTML !== 'undefined') {
    			var meth = 'drawDocument';
    			if (typeof element === 'string') {
    				meth = /^http/.test(element) ? 'drawURL' : 'drawHTML';
    			}
    			options.width = options.width || W * K;
    			return rasterizeHTML[meth](element, void 0, options).then(function (r) {
    				options.onrendered(r.image);
    			}, function (e) {
    				callback(null, e);
    			});
    		}

    		return null;
    	};
    })(jsPDF.API);

    /** @preserve
     * jsPDF addImage plugin
     * Copyright (c) 2012 Jason Siefken, https://github.com/siefkenj/
     *               2013 Chris Dowling, https://github.com/gingerchris
     *               2013 Trinh Ho, https://github.com/ineedfat
     *               2013 Edwin Alejandro Perez, https://github.com/eaparango
     *               2013 Norah Smith, https://github.com/burnburnrocket
     *               2014 Diego Casorran, https://github.com/diegocr
     *               2014 James Robb, https://github.com/jamesbrobb
     *
     * 
     */

    ;(function (jsPDFAPI) {
    	'use strict';

    	var namespace = 'addImage_',
    	    supported_image_types = ['jpeg', 'jpg', 'png'];

    	// Image functionality ported from pdf.js
    	var putImage = function putImage(img) {

    		var objectNumber = this.internal.newObject(),
    		    out = this.internal.write,
    		    putStream = this.internal.putStream;

    		img['n'] = objectNumber;

    		out('<</Type /XObject');
    		out('/Subtype /Image');
    		out('/Width ' + img['w']);
    		out('/Height ' + img['h']);
    		if (img['cs'] === this.color_spaces.INDEXED) {
    			out('/ColorSpace [/Indexed /DeviceRGB '
    			// if an indexed png defines more than one colour with transparency, we've created a smask
    			+ (img['pal'].length / 3 - 1) + ' ' + ('smask' in img ? objectNumber + 2 : objectNumber + 1) + ' 0 R]');
    		} else {
    			out('/ColorSpace /' + img['cs']);
    			if (img['cs'] === this.color_spaces.DEVICE_CMYK) {
    				out('/Decode [1 0 1 0 1 0 1 0]');
    			}
    		}
    		out('/BitsPerComponent ' + img['bpc']);
    		if ('f' in img) {
    			out('/Filter /' + img['f']);
    		}
    		if ('dp' in img) {
    			out('/DecodeParms <<' + img['dp'] + '>>');
    		}
    		if ('trns' in img && img['trns'].constructor == Array) {
    			var trns = '',
    			    i = 0,
    			    len = img['trns'].length;
    			for (; i < len; i++) {
    				trns += img['trns'][i] + ' ' + img['trns'][i] + ' ';
    			}out('/Mask [' + trns + ']');
    		}
    		if ('smask' in img) {
    			out('/SMask ' + (objectNumber + 1) + ' 0 R');
    		}
    		out('/Length ' + img['data'].length + '>>');

    		putStream(img['data']);

    		out('endobj');

    		// Soft mask
    		if ('smask' in img) {
    			var dp = '/Predictor 15 /Colors 1 /BitsPerComponent ' + img['bpc'] + ' /Columns ' + img['w'];
    			var smask = { 'w': img['w'], 'h': img['h'], 'cs': 'DeviceGray', 'bpc': img['bpc'], 'dp': dp, 'data': img['smask'] };
    			if ('f' in img) smask.f = img['f'];
    			putImage.call(this, smask);
    		}

    		//Palette
    		if (img['cs'] === this.color_spaces.INDEXED) {

    			this.internal.newObject();
    			//out('<< /Filter / ' + img['f'] +' /Length ' + img['pal'].length + '>>');
    			//putStream(zlib.compress(img['pal']));
    			out('<< /Length ' + img['pal'].length + '>>');
    			putStream(this.arrayBufferToBinaryString(new Uint8Array(img['pal'])));
    			out('endobj');
    		}
    	},
    	    putResourcesCallback = function putResourcesCallback() {
    		var images = this.internal.collections[namespace + 'images'];
    		for (var i in images) {
    			putImage.call(this, images[i]);
    		}
    	},
    	    putXObjectsDictCallback = function putXObjectsDictCallback() {
    		var images = this.internal.collections[namespace + 'images'],
    		    out = this.internal.write,
    		    image;
    		for (var i in images) {
    			image = images[i];
    			out('/I' + image['i'], image['n'], '0', 'R');
    		}
    	},
    	    checkCompressValue = function checkCompressValue(value) {
    		if (value && typeof value === 'string') value = value.toUpperCase();
    		return value in jsPDFAPI.image_compression ? value : jsPDFAPI.image_compression.NONE;
    	},
    	    getImages = function getImages() {
    		var images = this.internal.collections[namespace + 'images'];
    		//first run, so initialise stuff
    		if (!images) {
    			this.internal.collections[namespace + 'images'] = images = {};
    			this.internal.events.subscribe('putResources', putResourcesCallback);
    			this.internal.events.subscribe('putXobjectDict', putXObjectsDictCallback);
    		}

    		return images;
    	},
    	    getImageIndex = function getImageIndex(images) {
    		var imageIndex = 0;

    		if (images) {
    			// this is NOT the first time this method is ran on this instance of jsPDF object.
    			imageIndex = Object.keys ? Object.keys(images).length : function (o) {
    				var i = 0;
    				for (var e in o) {
    					if (o.hasOwnProperty(e)) {
    						i++;
    					}
    				}
    				return i;
    			}(images);
    		}

    		return imageIndex;
    	},
    	    notDefined = function notDefined(value) {
    		return typeof value === 'undefined' || value === null;
    	},
    	    generateAliasFromData = function generateAliasFromData(data) {
    		return typeof data === 'string' && jsPDFAPI.sHashCode(data);
    	},
    	    doesNotSupportImageType = function doesNotSupportImageType(type) {
    		return supported_image_types.indexOf(type) === -1;
    	},
    	    processMethodNotEnabled = function processMethodNotEnabled(type) {
    		return typeof jsPDFAPI['process' + type.toUpperCase()] !== 'function';
    	},
    	    isDOMElement = function isDOMElement(object) {
    		return (typeof object === 'undefined' ? 'undefined' : babelHelpers.typeof(object)) === 'object' && object.nodeType === 1;
    	},
    	    createDataURIFromElement = function createDataURIFromElement(element, format, angle) {

    		//if element is an image which uses data url defintion, just return the dataurl
    		if (element.nodeName === 'IMG' && element.hasAttribute('src')) {
    			var src = '' + element.getAttribute('src');
    			if (!angle && src.indexOf('data:image/') === 0) return src;

    			// only if the user doesn't care about a format
    			if (!format && /\.png(?:[?#].*)?$/i.test(src)) format = 'png';
    		}

    		if (element.nodeName === 'CANVAS') {
    			var canvas = element;
    		} else {
    			var canvas = document.createElement('canvas');
    			canvas.width = element.clientWidth || element.width;
    			canvas.height = element.clientHeight || element.height;

    			var ctx = canvas.getContext('2d');
    			if (!ctx) {
    				throw 'addImage requires canvas to be supported by browser.';
    			}
    			if (angle) {
    				var x,
    				    y,
    				    b,
    				    c,
    				    s,
    				    w,
    				    h,
    				    to_radians = Math.PI / 180,
    				    angleInRadians;

    				if ((typeof angle === 'undefined' ? 'undefined' : babelHelpers.typeof(angle)) === 'object') {
    					x = angle.x;
    					y = angle.y;
    					b = angle.bg;
    					angle = angle.angle;
    				}
    				angleInRadians = angle * to_radians;
    				c = Math.abs(Math.cos(angleInRadians));
    				s = Math.abs(Math.sin(angleInRadians));
    				w = canvas.width;
    				h = canvas.height;
    				canvas.width = h * s + w * c;
    				canvas.height = h * c + w * s;

    				if (isNaN(x)) x = canvas.width / 2;
    				if (isNaN(y)) y = canvas.height / 2;

    				ctx.clearRect(0, 0, canvas.width, canvas.height);
    				ctx.fillStyle = b || 'white';
    				ctx.fillRect(0, 0, canvas.width, canvas.height);
    				ctx.save();
    				ctx.translate(x, y);
    				ctx.rotate(angleInRadians);
    				ctx.drawImage(element, -(w / 2), -(h / 2));
    				ctx.rotate(-angleInRadians);
    				ctx.translate(-x, -y);
    				ctx.restore();
    			} else {
    				ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
    			}
    		}
    		return canvas.toDataURL(('' + format).toLowerCase() == 'png' ? 'image/png' : 'image/jpeg');
    	},
    	    checkImagesForAlias = function checkImagesForAlias(alias, images) {
    		var cached_info;
    		if (images) {
    			for (var e in images) {
    				if (alias === images[e].alias) {
    					cached_info = images[e];
    					break;
    				}
    			}
    		}
    		return cached_info;
    	},
    	    determineWidthAndHeight = function determineWidthAndHeight(w, h, info) {
    		if (!w && !h) {
    			w = -96;
    			h = -96;
    		}
    		if (w < 0) {
    			w = -1 * info['w'] * 72 / w / this.internal.scaleFactor;
    		}
    		if (h < 0) {
    			h = -1 * info['h'] * 72 / h / this.internal.scaleFactor;
    		}
    		if (w === 0) {
    			w = h * info['w'] / info['h'];
    		}
    		if (h === 0) {
    			h = w * info['h'] / info['w'];
    		}

    		return [w, h];
    	},
    	    writeImageToPDF = function writeImageToPDF(x, y, w, h, info, index, images) {
    		var dims = determineWidthAndHeight.call(this, w, h, info),
    		    coord = this.internal.getCoordinateString,
    		    vcoord = this.internal.getVerticalCoordinateString;

    		w = dims[0];
    		h = dims[1];

    		images[index] = info;

    		this.internal.write('q', coord(w), '0 0', coord(-h) // TODO: check if this should be shifted by vcoord
    		, coord(x), vcoord(y + h), 'cm /I' + info['i'], 'Do Q');
    	};

    	/**
      * COLOR SPACES
      */
    	jsPDFAPI.color_spaces = {
    		DEVICE_RGB: 'DeviceRGB',
    		DEVICE_GRAY: 'DeviceGray',
    		DEVICE_CMYK: 'DeviceCMYK',
    		CAL_GREY: 'CalGray',
    		CAL_RGB: 'CalRGB',
    		LAB: 'Lab',
    		ICC_BASED: 'ICCBased',
    		INDEXED: 'Indexed',
    		PATTERN: 'Pattern',
    		SEPERATION: 'Seperation',
    		DEVICE_N: 'DeviceN'
    	};

    	/**
      * DECODE METHODS
      */
    	jsPDFAPI.decode = {
    		DCT_DECODE: 'DCTDecode',
    		FLATE_DECODE: 'FlateDecode',
    		LZW_DECODE: 'LZWDecode',
    		JPX_DECODE: 'JPXDecode',
    		JBIG2_DECODE: 'JBIG2Decode',
    		ASCII85_DECODE: 'ASCII85Decode',
    		ASCII_HEX_DECODE: 'ASCIIHexDecode',
    		RUN_LENGTH_DECODE: 'RunLengthDecode',
    		CCITT_FAX_DECODE: 'CCITTFaxDecode'
    	};

    	/**
      * IMAGE COMPRESSION TYPES
      */
    	jsPDFAPI.image_compression = {
    		NONE: 'NONE',
    		FAST: 'FAST',
    		MEDIUM: 'MEDIUM',
    		SLOW: 'SLOW'
    	};

    	jsPDFAPI.sHashCode = function (str) {
    		return Array.prototype.reduce && str.split("").reduce(function (a, b) {
    			a = (a << 5) - a + b.charCodeAt(0);return a & a;
    		}, 0);
    	};

    	jsPDFAPI.isString = function (object) {
    		return typeof object === 'string';
    	};

    	/**
      * Strips out and returns info from a valid base64 data URI
      * @param {String[dataURI]} a valid data URI of format 'data:[<MIME-type>][;base64],<data>'
      * @returns an Array containing the following
      * [0] the complete data URI
      * [1] <MIME-type>
      * [2] format - the second part of the mime-type i.e 'png' in 'image/png'
      * [4] <data>
      */
    	jsPDFAPI.extractInfoFromBase64DataURI = function (dataURI) {
    		return (/^data:([\w]+?\/([\w]+?));base64,(.+?)$/g.exec(dataURI)
    		);
    	};

    	/**
      * Check to see if ArrayBuffer is supported
      */
    	jsPDFAPI.supportsArrayBuffer = function () {
    		return typeof ArrayBuffer !== 'undefined' && typeof Uint8Array !== 'undefined';
    	};

    	/**
      * Tests supplied object to determine if ArrayBuffer
      * @param {Object[object]}
      */
    	jsPDFAPI.isArrayBuffer = function (object) {
    		if (!this.supportsArrayBuffer()) return false;
    		return object instanceof ArrayBuffer;
    	};

    	/**
      * Tests supplied object to determine if it implements the ArrayBufferView (TypedArray) interface
      * @param {Object[object]}
      */
    	jsPDFAPI.isArrayBufferView = function (object) {
    		if (!this.supportsArrayBuffer()) return false;
    		if (typeof Uint32Array === 'undefined') return false;
    		return object instanceof Int8Array || object instanceof Uint8Array || typeof Uint8ClampedArray !== 'undefined' && object instanceof Uint8ClampedArray || object instanceof Int16Array || object instanceof Uint16Array || object instanceof Int32Array || object instanceof Uint32Array || object instanceof Float32Array || object instanceof Float64Array;
    	};

    	/**
      * Exactly what it says on the tin
      */
    	jsPDFAPI.binaryStringToUint8Array = function (binary_string) {
    		/*
       * not sure how efficient this will be will bigger files. Is there a native method?
       */
    		var len = binary_string.length;
    		var bytes = new Uint8Array(len);
    		for (var i = 0; i < len; i++) {
    			bytes[i] = binary_string.charCodeAt(i);
    		}
    		return bytes;
    	};

    	/**
      * @see this discussion
      * http://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
      *
      * As stated, i imagine the method below is highly inefficent for large files.
      *
      * Also of note from Mozilla,
      *
      * "However, this is slow and error-prone, due to the need for multiple conversions (especially if the binary data is not actually byte-format data, but, for example, 32-bit integers or floats)."
      *
      * https://developer.mozilla.org/en-US/Add-ons/Code_snippets/StringView
      *
      * Although i'm strugglig to see how StringView solves this issue? Doesn't appear to be a direct method for conversion?
      *
      * Async method using Blob and FileReader could be best, but i'm not sure how to fit it into the flow?
      */
    	jsPDFAPI.arrayBufferToBinaryString = function (buffer) {
    		if ('TextDecoder' in window) {
    			var decoder = new TextDecoder('ascii');
    			return decoder.decode(buffer);
    		}

    		if (this.isArrayBuffer(buffer)) buffer = new Uint8Array(buffer);

    		var binary_string = '';
    		var len = buffer.byteLength;
    		for (var i = 0; i < len; i++) {
    			binary_string += String.fromCharCode(buffer[i]);
    		}
    		return binary_string;
    		/*
       * Another solution is the method below - convert array buffer straight to base64 and then use atob
       */
    		//return atob(this.arrayBufferToBase64(buffer));
    	};

    	/**
      * Converts an ArrayBuffer directly to base64
      *
      * Taken from here
      *
      * http://jsperf.com/encoding-xhr-image-data/31
      *
      * Need to test if this is a better solution for larger files
      *
      */
    	jsPDFAPI.arrayBufferToBase64 = function (arrayBuffer) {
    		var base64 = '';
    		var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    		var bytes = new Uint8Array(arrayBuffer);
    		var byteLength = bytes.byteLength;
    		var byteRemainder = byteLength % 3;
    		var mainLength = byteLength - byteRemainder;

    		var a, b, c, d;
    		var chunk;

    		// Main loop deals with bytes in chunks of 3
    		for (var i = 0; i < mainLength; i = i + 3) {
    			// Combine the three bytes into a single integer
    			chunk = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];

    			// Use bitmasks to extract 6-bit segments from the triplet
    			a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    			b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    			c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    			d = chunk & 63; // 63       = 2^6 - 1

    			// Convert the raw binary segments to the appropriate ASCII encoding
    			base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    		}

    		// Deal with the remaining bytes and padding
    		if (byteRemainder == 1) {
    			chunk = bytes[mainLength];

    			a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    			// Set the 4 least significant bits to zero
    			b = (chunk & 3) << 4; // 3   = 2^2 - 1

    			base64 += encodings[a] + encodings[b] + '==';
    		} else if (byteRemainder == 2) {
    			chunk = bytes[mainLength] << 8 | bytes[mainLength + 1];

    			a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    			b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    			// Set the 2 least significant bits to zero
    			c = (chunk & 15) << 2; // 15    = 2^4 - 1

    			base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    		}

    		return base64;
    	};

    	jsPDFAPI.createImageInfo = function (data, wd, ht, cs, bpc, f, imageIndex, alias, dp, trns, pal, smask) {
    		var info = {
    			alias: alias,
    			w: wd,
    			h: ht,
    			cs: cs,
    			bpc: bpc,
    			i: imageIndex,
    			data: data
    			// n: objectNumber will be added by putImage code
    		};

    		if (f) info.f = f;
    		if (dp) info.dp = dp;
    		if (trns) info.trns = trns;
    		if (pal) info.pal = pal;
    		if (smask) info.smask = smask;

    		return info;
    	};

    	jsPDFAPI.addImage = function (imageData, format, x, y, w, h, alias, compression, rotation) {
    		'use strict';

    		if (typeof format !== 'string') {
    			var tmp = h;
    			h = w;
    			w = y;
    			y = x;
    			x = format;
    			format = tmp;
    		}

    		if ((typeof imageData === 'undefined' ? 'undefined' : babelHelpers.typeof(imageData)) === 'object' && !isDOMElement(imageData) && "imageData" in imageData) {
    			var options = imageData;

    			imageData = options.imageData;
    			format = options.format || format;
    			x = options.x || x || 0;
    			y = options.y || y || 0;
    			w = options.w || w;
    			h = options.h || h;
    			alias = options.alias || alias;
    			compression = options.compression || compression;
    			rotation = options.rotation || options.angle || rotation;
    		}

    		if (isNaN(x) || isNaN(y)) {
    			console.error('jsPDF.addImage: Invalid coordinates', arguments);
    			throw new Error('Invalid coordinates passed to jsPDF.addImage');
    		}

    		var images = getImages.call(this),
    		    info;

    		if (!(info = checkImagesForAlias(imageData, images))) {
    			var dataAsBinaryString;

    			if (isDOMElement(imageData)) imageData = createDataURIFromElement(imageData, format, rotation);

    			if (notDefined(alias)) alias = generateAliasFromData(imageData);

    			if (!(info = checkImagesForAlias(alias, images))) {

    				if (this.isString(imageData)) {

    					var base64Info = this.extractInfoFromBase64DataURI(imageData);

    					if (base64Info) {

    						format = base64Info[2];
    						imageData = atob(base64Info[3]); //convert to binary string
    					} else {

    						if (imageData.charCodeAt(0) === 0x89 && imageData.charCodeAt(1) === 0x50 && imageData.charCodeAt(2) === 0x4e && imageData.charCodeAt(3) === 0x47) format = 'png';
    					}
    				}
    				format = (format || 'JPEG').toLowerCase();

    				if (doesNotSupportImageType(format)) throw new Error('addImage currently only supports formats ' + supported_image_types + ', not \'' + format + '\'');

    				if (processMethodNotEnabled(format)) throw new Error('please ensure that the plugin for \'' + format + '\' support is added');

    				/**
         * need to test if it's more efficent to convert all binary strings
         * to TypedArray - or should we just leave and process as string?
         */
    				if (this.supportsArrayBuffer()) {
    					// no need to convert if imageData is already uint8array
    					if (!(imageData instanceof Uint8Array)) {
    						dataAsBinaryString = imageData;
    						imageData = this.binaryStringToUint8Array(imageData);
    					}
    				}

    				info = this['process' + format.toUpperCase()](imageData, getImageIndex(images), alias, checkCompressValue(compression), dataAsBinaryString);

    				if (!info) throw new Error('An unkwown error occurred whilst processing the image');
    			}
    		}

    		writeImageToPDF.call(this, x, y, w, h, info, info.i, images);

    		return this;
    	};

    	/**
      * JPEG SUPPORT
      **/

    	//takes a string imgData containing the raw bytes of
    	//a jpeg image and returns [width, height]
    	//Algorithm from: http://www.64lines.com/jpeg-width-height
    	var getJpegSize = function getJpegSize(imgData) {
    		'use strict';

    		var width, height, numcomponents;
    		// Verify we have a valid jpeg header 0xff,0xd8,0xff,0xe0,?,?,'J','F','I','F',0x00
    		if (!imgData.charCodeAt(0) === 0xff || !imgData.charCodeAt(1) === 0xd8 || !imgData.charCodeAt(2) === 0xff || !imgData.charCodeAt(3) === 0xe0 || !imgData.charCodeAt(6) === 'J'.charCodeAt(0) || !imgData.charCodeAt(7) === 'F'.charCodeAt(0) || !imgData.charCodeAt(8) === 'I'.charCodeAt(0) || !imgData.charCodeAt(9) === 'F'.charCodeAt(0) || !imgData.charCodeAt(10) === 0x00) {
    			throw new Error('getJpegSize requires a binary string jpeg file');
    		}
    		var blockLength = imgData.charCodeAt(4) * 256 + imgData.charCodeAt(5);
    		var i = 4,
    		    len = imgData.length;
    		while (i < len) {
    			i += blockLength;
    			if (imgData.charCodeAt(i) !== 0xff) {
    				throw new Error('getJpegSize could not find the size of the image');
    			}
    			if (imgData.charCodeAt(i + 1) === 0xc0 || //(SOF) Huffman  - Baseline DCT
    			imgData.charCodeAt(i + 1) === 0xc1 || //(SOF) Huffman  - Extended sequential DCT
    			imgData.charCodeAt(i + 1) === 0xc2 || // Progressive DCT (SOF2)
    			imgData.charCodeAt(i + 1) === 0xc3 || // Spatial (sequential) lossless (SOF3)
    			imgData.charCodeAt(i + 1) === 0xc4 || // Differential sequential DCT (SOF5)
    			imgData.charCodeAt(i + 1) === 0xc5 || // Differential progressive DCT (SOF6)
    			imgData.charCodeAt(i + 1) === 0xc6 || // Differential spatial (SOF7)
    			imgData.charCodeAt(i + 1) === 0xc7) {
    				height = imgData.charCodeAt(i + 5) * 256 + imgData.charCodeAt(i + 6);
    				width = imgData.charCodeAt(i + 7) * 256 + imgData.charCodeAt(i + 8);
    				numcomponents = imgData.charCodeAt(i + 9);
    				return [width, height, numcomponents];
    			} else {
    				i += 2;
    				blockLength = imgData.charCodeAt(i) * 256 + imgData.charCodeAt(i + 1);
    			}
    		}
    	},
    	    getJpegSizeFromBytes = function getJpegSizeFromBytes(data) {

    		var hdr = data[0] << 8 | data[1];

    		if (hdr !== 0xFFD8) throw new Error('Supplied data is not a JPEG');

    		var len = data.length,
    		    block = (data[4] << 8) + data[5],
    		    pos = 4,
    		    bytes,
    		    width,
    		    height,
    		    numcomponents;

    		while (pos < len) {
    			pos += block;
    			bytes = readBytes(data, pos);
    			block = (bytes[2] << 8) + bytes[3];
    			if ((bytes[1] === 0xC0 || bytes[1] === 0xC2) && bytes[0] === 0xFF && block > 7) {
    				bytes = readBytes(data, pos + 5);
    				width = (bytes[2] << 8) + bytes[3];
    				height = (bytes[0] << 8) + bytes[1];
    				numcomponents = bytes[4];
    				return { width: width, height: height, numcomponents: numcomponents };
    			}

    			pos += 2;
    		}

    		throw new Error('getJpegSizeFromBytes could not find the size of the image');
    	},
    	    readBytes = function readBytes(data, offset) {
    		return data.subarray(offset, offset + 5);
    	};

    	jsPDFAPI.processJPEG = function (data, index, alias, compression, dataAsBinaryString) {
    		'use strict';

    		var colorSpace = this.color_spaces.DEVICE_RGB,
    		    filter = this.decode.DCT_DECODE,
    		    bpc = 8,
    		    dims;

    		if (this.isString(data)) {
    			dims = getJpegSize(data);
    			return this.createImageInfo(data, dims[0], dims[1], dims[3] == 1 ? this.color_spaces.DEVICE_GRAY : colorSpace, bpc, filter, index, alias);
    		}

    		if (this.isArrayBuffer(data)) data = new Uint8Array(data);

    		if (this.isArrayBufferView(data)) {

    			dims = getJpegSizeFromBytes(data);

    			// if we already have a stored binary string rep use that
    			data = dataAsBinaryString || this.arrayBufferToBinaryString(data);

    			return this.createImageInfo(data, dims.width, dims.height, dims.numcomponents == 1 ? this.color_spaces.DEVICE_GRAY : colorSpace, bpc, filter, index, alias);
    		}

    		return null;
    	};

    	jsPDFAPI.processJPG = function () /*data, index, alias, compression, dataAsBinaryString*/{
    		return this.processJPEG.apply(this, arguments);
    	};
    })(jsPDF.API);

    /**
     * jsPDF Annotations PlugIn
     * Copyright (c) 2014 Steven Spungin (TwelveTone LLC)  steven@twelvetone.tv
     *
     * Licensed under the MIT License.
     * http://opensource.org/licenses/mit-license
     */

    /**
     * There are many types of annotations in a PDF document. Annotations are placed
     * on a page at a particular location. They are not 'attached' to an object.
     * <br />
     * This plugin current supports <br />
     * <li> Goto Page (set pageNumber and top in options)
     * <li> Goto Name (set name and top in options)
     * <li> Goto URL (set url in options)
     * <p>
     * 	The destination magnification factor can also be specified when goto is a page number or a named destination. (see documentation below)
     *  (set magFactor in options).  XYZ is the default.
     * </p>
     * <p>
     *  Links, Text, Popup, and FreeText are supported.
     * </p>
     * <p>
     * Options In PDF spec Not Implemented Yet
     * <li> link border
     * <li> named target
     * <li> page coordinates
     * <li> destination page scaling and layout
     * <li> actions other than URL and GotoPage
     * <li> background / hover actions
     * </p>
     */

    /*
        Destination Magnification Factors
        See PDF 1.3 Page 386 for meanings and options

        [supported]
    	XYZ (options; left top zoom)
    	Fit (no options)
    	FitH (options: top)
    	FitV (options: left)

    	[not supported]
    	FitR
    	FitB
    	FitBH
    	FitBV
     */

    (function (jsPDFAPI) {
    	'use strict';

    	var annotationPlugin = {

    		/**
       * An array of arrays, indexed by <em>pageNumber</em>.
       */
    		annotations: [],

    		f2: function f2(number) {
    			return number.toFixed(2);
    		},

    		notEmpty: function notEmpty(obj) {
    			if (typeof obj != 'undefined') {
    				if (obj != '') {
    					return true;
    				}
    			}
    		}
    	};

    	jsPDF.API.annotationPlugin = annotationPlugin;

    	jsPDF.API.events.push(['addPage', function (info) {
    		this.annotationPlugin.annotations[info.pageNumber] = [];
    	}]);

    	jsPDFAPI.events.push(['putPage', function (info) {
    		//TODO store annotations in pageContext so reorder/remove will not affect them.
    		var pageAnnos = this.annotationPlugin.annotations[info.pageNumber];

    		var found = false;
    		for (var a = 0; a < pageAnnos.length && !found; a++) {
    			var anno = pageAnnos[a];
    			switch (anno.type) {
    				case 'link':
    					if (annotationPlugin.notEmpty(anno.options.url) || annotationPlugin.notEmpty(anno.options.pageNumber)) {
    						found = true;
    						break;
    					}
    				case 'reference':
    				case 'text':
    				case 'freetext':
    					found = true;
    					break;
    			}
    		}
    		if (found == false) {
    			return;
    		}

    		this.internal.write("/Annots [");
    		var f2 = this.annotationPlugin.f2;
    		var k = this.internal.scaleFactor;
    		var pageHeight = this.internal.pageSize.height;
    		var pageInfo = this.internal.getPageInfo(info.pageNumber);
    		for (var a = 0; a < pageAnnos.length; a++) {
    			var anno = pageAnnos[a];

    			switch (anno.type) {
    				case 'reference':
    					// References to Widget Anotations (for AcroForm Fields)
    					this.internal.write(' ' + anno.object.objId + ' 0 R ');
    					break;
    				case 'text':
    					// Create a an object for both the text and the popup
    					var objText = this.internal.newAdditionalObject();
    					var objPopup = this.internal.newAdditionalObject();

    					var title = anno.title || 'Note';
    					var rect = "/Rect [" + f2(anno.bounds.x * k) + " " + f2(pageHeight - (anno.bounds.y + anno.bounds.h) * k) + " " + f2((anno.bounds.x + anno.bounds.w) * k) + " " + f2((pageHeight - anno.bounds.y) * k) + "] ";
    					line = '<</Type /Annot /Subtype /' + 'Text' + ' ' + rect + '/Contents (' + anno.contents + ')';
    					line += ' /Popup ' + objPopup.objId + " 0 R";
    					line += ' /P ' + pageInfo.objId + " 0 R";
    					line += ' /T (' + title + ') >>';
    					objText.content = line;

    					var parent = objText.objId + ' 0 R';
    					var popoff = 30;
    					var rect = "/Rect [" + f2((anno.bounds.x + popoff) * k) + " " + f2(pageHeight - (anno.bounds.y + anno.bounds.h) * k) + " " + f2((anno.bounds.x + anno.bounds.w + popoff) * k) + " " + f2((pageHeight - anno.bounds.y) * k) + "] ";
    					//var rect2 = "/Rect [" + f2(anno.bounds.x * k) + " " + f2((pageHeight - anno.bounds.y) * k) + " " + f2(anno.bounds.x + anno.bounds.w * k) + " " + f2(pageHeight - (anno.bounds.y + anno.bounds.h) * k) + "] ";
    					line = '<</Type /Annot /Subtype /' + 'Popup' + ' ' + rect + ' /Parent ' + parent;
    					if (anno.open) {
    						line += ' /Open true';
    					}
    					line += ' >>';
    					objPopup.content = line;

    					this.internal.write(objText.objId, '0 R', objPopup.objId, '0 R');

    					break;
    				case 'freetext':
    					var rect = "/Rect [" + f2(anno.bounds.x * k) + " " + f2((pageHeight - anno.bounds.y) * k) + " " + f2(anno.bounds.x + anno.bounds.w * k) + " " + f2(pageHeight - (anno.bounds.y + anno.bounds.h) * k) + "] ";
    					var color = anno.color || '#000000';
    					line = '<</Type /Annot /Subtype /' + 'FreeText' + ' ' + rect + '/Contents (' + anno.contents + ')';
    					line += ' /DS(font: Helvetica,sans-serif 12.0pt; text-align:left; color:#' + color + ')';
    					line += ' /Border [0 0 0]';
    					line += ' >>';
    					this.internal.write(line);
    					break;
    				case 'link':
    					if (anno.options.name) {
    						var loc = this.annotations._nameMap[anno.options.name];
    						anno.options.pageNumber = loc.page;
    						anno.options.top = loc.y;
    					} else {
    						if (!anno.options.top) {
    							anno.options.top = 0;
    						}
    					}

    					//var pageHeight = this.internal.pageSize.height * this.internal.scaleFactor;
    					var rect = "/Rect [" + f2(anno.x * k) + " " + f2((pageHeight - anno.y) * k) + " " + f2(anno.x + anno.w * k) + " " + f2(pageHeight - (anno.y + anno.h) * k) + "] ";

    					var line = '';
    					if (anno.options.url) {
    						line = '<</Type /Annot /Subtype /Link ' + rect + '/Border [0 0 0] /A <</S /URI /URI (' + anno.options.url + ') >>';
    					} else if (anno.options.pageNumber) {
    						// first page is 0
    						var info = this.internal.getPageInfo(anno.options.pageNumber);
    						line = '<</Type /Annot /Subtype /Link ' + rect + '/Border [0 0 0] /Dest [' + info.objId + " 0 R";
    						anno.options.magFactor = anno.options.magFactor || "XYZ";
    						switch (anno.options.magFactor) {
    							case 'Fit':
    								line += ' /Fit]';
    								break;
    							case 'FitH':
    								//anno.options.top = anno.options.top || f2(pageHeight * k);
    								line += ' /FitH ' + anno.options.top + ']';
    								break;
    							case 'FitV':
    								anno.options.left = anno.options.left || 0;
    								line += ' /FitV ' + anno.options.left + ']';
    								break;
    							case 'XYZ':
    							default:
    								var top = f2((pageHeight - anno.options.top) * k); // || f2(pageHeight * k);
    								anno.options.left = anno.options.left || 0;
    								// 0 or null zoom will not change zoom factor
    								if (typeof anno.options.zoom === 'undefined') {
    									anno.options.zoom = 0;
    								}
    								line += ' /XYZ ' + anno.options.left + ' ' + top + ' ' + anno.options.zoom + ']';
    								break;
    						}
    					} else {
    						// TODO error - should not be here
    					}
    					if (line != '') {
    						line += " >>";
    						this.internal.write(line);
    					}
    					break;
    			}
    		}
    		this.internal.write("]");
    	}]);

    	jsPDFAPI.createAnnotation = function (options) {
    		switch (options.type) {
    			case 'link':
    				this.link(options.bounds.x, options.bounds.y, options.bounds.w, options.bounds.h, options);
    				break;
    			case 'text':
    			case 'freetext':
    				this.annotationPlugin.annotations[this.internal.getCurrentPageInfo().pageNumber].push(options);
    				break;
    		}
    	};

    	/**
      * valid options
      * <li> pageNumber or url [required]
      * <p>If pageNumber is specified, top and zoom may also be specified</p>
      */
    	jsPDFAPI.link = function (x, y, w, h, options) {
    		'use strict';

    		this.annotationPlugin.annotations[this.internal.getCurrentPageInfo().pageNumber].push({
    			x: x,
    			y: y,
    			w: w,
    			h: h,
    			options: options,
    			type: 'link'
    		});
    	};

    	/**
      * valid options
      * <li> pageNumber or url [required]
      * <p>If pageNumber is specified, top and zoom may also be specified</p>
      */
    	jsPDFAPI.link = function (x, y, w, h, options) {
    		'use strict';

    		this.annotationPlugin.annotations[this.internal.getCurrentPageInfo().pageNumber].push({
    			x: x,
    			y: y,
    			w: w,
    			h: h,
    			options: options,
    			type: 'link'
    		});
    	};

    	/**
      * Currently only supports single line text.
      * Returns the width of the text/link
      */
    	jsPDFAPI.textWithLink = function (text, x, y, options) {
    		'use strict';

    		var width = this.getTextWidth(text);
    		var height = this.internal.getLineHeight();
    		this.text(text, x, y);
    		//TODO We really need the text baseline height to do this correctly.
    		// Or ability to draw text on top, bottom, center, or baseline.
    		y += height * .2;
    		this.link(x, y - height, width, height, options);
    		return width;
    	};

    	//TODO move into external library
    	jsPDFAPI.getTextWidth = function (text) {
    		'use strict';

    		var fontSize = this.internal.getFontSize();
    		var txtWidth = this.getStringUnitWidth(text) * fontSize / this.internal.scaleFactor;
    		return txtWidth;
    	};

    	//TODO move into external library
    	jsPDFAPI.getLineHeight = function () {
    		return this.internal.getLineHeight();
    	};

    	return this;
    })(jsPDF.API);

    /**
     * jsPDF Autoprint Plugin
     *
     * Licensed under the MIT License.
     * http://opensource.org/licenses/mit-license
     */

    (function (jsPDFAPI) {
    	'use strict';

    	jsPDFAPI.autoPrint = function () {
    		'use strict';

    		var refAutoPrintTag;

    		this.internal.events.subscribe('postPutResources', function () {
    			refAutoPrintTag = this.internal.newObject();
    			this.internal.write("<< /S/Named /Type/Action /N/Print >>", "endobj");
    		});

    		this.internal.events.subscribe("putCatalog", function () {
    			this.internal.write("/OpenAction " + refAutoPrintTag + " 0" + " R");
    		});
    		return this;
    	};
    })(jsPDF.API);

    /**
     * jsPDF Canvas PlugIn
     * Copyright (c) 2014 Steven Spungin (TwelveTone LLC)  steven@twelvetone.tv
     *
     * Licensed under the MIT License.
     * http://opensource.org/licenses/mit-license
     */

    /**
     * This plugin mimicks the HTML5 Canvas
     * 
     * The goal is to provide a way for current canvas users to print directly to a PDF.
     */

    (function (jsPDFAPI) {
    	'use strict';

    	jsPDFAPI.events.push(['initialized', function () {
    		this.canvas.pdf = this;
    	}]);

    	jsPDFAPI.canvas = {
    		getContext: function getContext(name) {
    			return this.pdf.context2d;
    		},
    		style: {}
    	};

    	Object.defineProperty(jsPDFAPI.canvas, 'width', {
    		get: function get() {
    			return this._width;
    		},
    		set: function set(value) {
    			this._width = value;
    			this.getContext('2d').pageWrapX = value + 1;
    		}
    	});

    	Object.defineProperty(jsPDFAPI.canvas, 'height', {
    		get: function get() {
    			return this._height;
    		},
    		set: function set(value) {
    			this._height = value;
    			this.getContext('2d').pageWrapY = value + 1;
    		}
    	});

    	return this;
    })(jsPDF.API);

    /** ====================================================================
     * jsPDF Cell plugin
     * Copyright (c) 2013 Youssef Beddad, youssef.beddad@gmail.com
     *               2013 Eduardo Menezes de Morais, eduardo.morais@usp.br
     *               2013 Lee Driscoll, https://github.com/lsdriscoll
     *               2014 Juan Pablo Gaviria, https://github.com/juanpgaviria
     *               2014 James Hall, james@parall.ax
     *               2014 Diego Casorran, https://github.com/diegocr
     *
     * 
     * ====================================================================
     */

    (function (jsPDFAPI) {
        'use strict';
        /*jslint browser:true */
        /*global document: false, jsPDF */

        var fontName,
            fontSize,
            fontStyle,
            padding = 3,
            margin = 13,
            headerFunction,
            lastCellPos = { x: undefined, y: undefined, w: undefined, h: undefined, ln: undefined },
            pages = 1,
            setLastCellPosition = function setLastCellPosition(x, y, w, h, ln) {
            lastCellPos = { 'x': x, 'y': y, 'w': w, 'h': h, 'ln': ln };
        },
            getLastCellPosition = function getLastCellPosition() {
            return lastCellPos;
        },
            NO_MARGINS = { left: 0, top: 0, bottom: 0 };

        jsPDFAPI.setHeaderFunction = function (func) {
            headerFunction = func;
        };

        jsPDFAPI.getTextDimensions = function (txt) {
            fontName = this.internal.getFont().fontName;
            fontSize = this.table_font_size || this.internal.getFontSize();
            fontStyle = this.internal.getFont().fontStyle;
            // 1 pixel = 0.264583 mm and 1 mm = 72/25.4 point
            var px2pt = 0.264583 * 72 / 25.4,
                dimensions,
                text;

            text = document.createElement('font');
            text.id = "jsPDFCell";

            try {
                text.style.fontStyle = fontStyle;
            } catch (e) {
                text.style.fontWeight = fontStyle;
            }

            text.style.fontName = fontName;
            text.style.fontSize = fontSize + 'pt';
            try {
                text.textContent = txt;
            } catch (e) {
                text.innerText = txt;
            }

            document.body.appendChild(text);

            dimensions = { w: (text.offsetWidth + 1) * px2pt, h: (text.offsetHeight + 1) * px2pt };

            document.body.removeChild(text);

            return dimensions;
        };

        jsPDFAPI.cellAddPage = function () {
            var margins = this.margins || NO_MARGINS;

            this.addPage();

            setLastCellPosition(margins.left, margins.top, undefined, undefined);
            //setLastCellPosition(undefined, undefined, undefined, undefined, undefined);
            pages += 1;
        };

        jsPDFAPI.cellInitialize = function () {
            lastCellPos = { x: undefined, y: undefined, w: undefined, h: undefined, ln: undefined };
            pages = 1;
        };

        jsPDFAPI.cell = function (x, y, w, h, txt, ln, align) {
            var curCell = getLastCellPosition();
            var pgAdded = false;

            // If this is not the first cell, we must change its position
            if (curCell.ln !== undefined) {
                if (curCell.ln === ln) {
                    //Same line
                    x = curCell.x + curCell.w;
                    y = curCell.y;
                } else {
                    //New line
                    var margins = this.margins || NO_MARGINS;
                    if (curCell.y + curCell.h + h + margin >= this.internal.pageSize.height - margins.bottom) {
                        this.cellAddPage();
                        pgAdded = true;
                        if (this.printHeaders && this.tableHeaderRow) {
                            this.printHeaderRow(ln, true);
                        }
                    }
                    //We ignore the passed y: the lines may have diferent heights
                    y = getLastCellPosition().y + getLastCellPosition().h;
                    if (pgAdded) y = margin + 10;
                }
            }

            if (txt[0] !== undefined) {
                if (this.printingHeaderRow) {
                    this.rect(x, y, w, h, 'FD');
                } else {
                    this.rect(x, y, w, h);
                }
                if (align === 'right') {
                    if (!(txt instanceof Array)) {
                        txt = [txt];
                    }
                    for (var i = 0; i < txt.length; i++) {
                        var currentLine = txt[i];
                        var textSize = this.getStringUnitWidth(currentLine) * this.internal.getFontSize();
                        this.text(currentLine, x + w - textSize - padding, y + this.internal.getLineHeight() * (i + 1));
                    }
                } else {
                    this.text(txt, x + padding, y + this.internal.getLineHeight());
                }
            }
            setLastCellPosition(x, y, w, h, ln);
            return this;
        };

        /**
         * Return the maximum value from an array
         * @param array
         * @param comparisonFn
         * @returns {*}
         */
        jsPDFAPI.arrayMax = function (array, comparisonFn) {
            var max = array[0],
                i,
                ln,
                item;

            for (i = 0, ln = array.length; i < ln; i += 1) {
                item = array[i];

                if (comparisonFn) {
                    if (comparisonFn(max, item) === -1) {
                        max = item;
                    }
                } else {
                    if (item > max) {
                        max = item;
                    }
                }
            }

            return max;
        };

        /**
         * Create a table from a set of data.
         * @param {Integer} [x] : left-position for top-left corner of table
         * @param {Integer} [y] top-position for top-left corner of table
         * @param {Object[]} [data] As array of objects containing key-value pairs corresponding to a row of data.
         * @param {String[]} [headers] Omit or null to auto-generate headers at a performance cost
           * @param {Object} [config.printHeaders] True to print column headers at the top of every page
         * @param {Object} [config.autoSize] True to dynamically set the column widths to match the widest cell value
         * @param {Object} [config.margins] margin values for left, top, bottom, and width
         * @param {Object} [config.fontSize] Integer fontSize to use (optional)
         */

        jsPDFAPI.table = function (x, y, data, headers, config) {
            if (!data) {
                throw 'No data for PDF table';
            }

            var headerNames = [],
                headerPrompts = [],
                header,
                i,
                ln,
                cln,
                columnMatrix = {},
                columnWidths = {},
                columnData,
                column,
                columnMinWidths = [],
                j,
                tableHeaderConfigs = [],
                model,
                jln,
                func,


            //set up defaults. If a value is provided in config, defaults will be overwritten:
            autoSize = false,
                printHeaders = true,
                fontSize = 12,
                margins = NO_MARGINS;

            margins.width = this.internal.pageSize.width;

            if (config) {
                //override config defaults if the user has specified non-default behavior:
                if (config.autoSize === true) {
                    autoSize = true;
                }
                if (config.printHeaders === false) {
                    printHeaders = false;
                }
                if (config.fontSize) {
                    fontSize = config.fontSize;
                }
                if (config.css['font-size']) {
                    fontSize = config.css['font-size'] * 16;
                }
                if (config.margins) {
                    margins = config.margins;
                }
            }

            /**
             * @property {Number} lnMod
             * Keep track of the current line number modifier used when creating cells
             */
            this.lnMod = 0;
            lastCellPos = { x: undefined, y: undefined, w: undefined, h: undefined, ln: undefined }, pages = 1;

            this.printHeaders = printHeaders;
            this.margins = margins;
            this.setFontSize(fontSize);
            this.table_font_size = fontSize;

            // Set header values
            if (headers === undefined || headers === null) {
                // No headers defined so we derive from data
                headerNames = Object.keys(data[0]);
            } else if (headers[0] && typeof headers[0] !== 'string') {
                var px2pt = 0.264583 * 72 / 25.4;

                // Split header configs into names and prompts
                for (i = 0, ln = headers.length; i < ln; i += 1) {
                    header = headers[i];
                    headerNames.push(header.name);
                    headerPrompts.push(header.prompt);
                    columnWidths[header.name] = header.width * px2pt;
                }
            } else {
                headerNames = headers;
            }

            if (autoSize) {
                // Create a matrix of columns e.g., {column_title: [row1_Record, row2_Record]}
                func = function func(rec) {
                    return rec[header];
                };

                for (i = 0, ln = headerNames.length; i < ln; i += 1) {
                    header = headerNames[i];

                    columnMatrix[header] = data.map(func);

                    // get header width
                    columnMinWidths.push(this.getTextDimensions(headerPrompts[i] || header).w);
                    column = columnMatrix[header];

                    // get cell widths
                    for (j = 0, cln = column.length; j < cln; j += 1) {
                        columnData = column[j];
                        columnMinWidths.push(this.getTextDimensions(columnData).w);
                    }

                    // get final column width
                    columnWidths[header] = jsPDFAPI.arrayMax(columnMinWidths);

                    //have to reset
                    columnMinWidths = [];
                }
            }

            // -- Construct the table

            if (printHeaders) {
                var lineHeight = this.calculateLineHeight(headerNames, columnWidths, headerPrompts.length ? headerPrompts : headerNames);

                // Construct the header row
                for (i = 0, ln = headerNames.length; i < ln; i += 1) {
                    header = headerNames[i];
                    tableHeaderConfigs.push([x, y, columnWidths[header], lineHeight, String(headerPrompts.length ? headerPrompts[i] : header)]);
                }

                // Store the table header config
                this.setTableHeaderRow(tableHeaderConfigs);

                // Print the header for the start of the table
                this.printHeaderRow(1, false);
            }

            // Construct the data rows
            for (i = 0, ln = data.length; i < ln; i += 1) {
                var lineHeight;
                model = data[i];
                lineHeight = this.calculateLineHeight(headerNames, columnWidths, model);

                for (j = 0, jln = headerNames.length; j < jln; j += 1) {
                    header = headerNames[j];
                    this.cell(x, y, columnWidths[header], lineHeight, model[header], i + 2, header.align);
                }
            }
            this.lastCellPos = lastCellPos;
            this.table_x = x;
            this.table_y = y;
            return this;
        };
        /**
         * Calculate the height for containing the highest column
         * @param {String[]} headerNames is the header, used as keys to the data
         * @param {Integer[]} columnWidths is size of each column
         * @param {Object[]} model is the line of data we want to calculate the height of
         */
        jsPDFAPI.calculateLineHeight = function (headerNames, columnWidths, model) {
            var header,
                lineHeight = 0;
            for (var j = 0; j < headerNames.length; j++) {
                header = headerNames[j];
                model[header] = this.splitTextToSize(String(model[header]), columnWidths[header] - padding);
                var h = this.internal.getLineHeight() * model[header].length + padding;
                if (h > lineHeight) lineHeight = h;
            }
            return lineHeight;
        };

        /**
         * Store the config for outputting a table header
         * @param {Object[]} config
         * An array of cell configs that would define a header row: Each config matches the config used by jsPDFAPI.cell
         * except the ln parameter is excluded
         */
        jsPDFAPI.setTableHeaderRow = function (config) {
            this.tableHeaderRow = config;
        };

        /**
         * Output the store header row
         * @param lineNumber The line number to output the header at
         */
        jsPDFAPI.printHeaderRow = function (lineNumber, new_page) {
            if (!this.tableHeaderRow) {
                throw 'Property tableHeaderRow does not exist.';
            }

            var tableHeaderCell, tmpArray, i, ln;

            this.printingHeaderRow = true;
            if (headerFunction !== undefined) {
                var position = headerFunction(this, pages);
                setLastCellPosition(position[0], position[1], position[2], position[3], -1);
            }
            this.setFontStyle('bold');
            var tempHeaderConf = [];
            for (i = 0, ln = this.tableHeaderRow.length; i < ln; i += 1) {
                this.setFillColor(200, 200, 200);

                tableHeaderCell = this.tableHeaderRow[i];
                if (new_page) {
                    this.margins.top = margin;
                    tableHeaderCell[1] = this.margins && this.margins.top || 0;
                    tempHeaderConf.push(tableHeaderCell);
                }
                tmpArray = [].concat(tableHeaderCell);
                this.cell.apply(this, tmpArray.concat(lineNumber));
            }
            if (tempHeaderConf.length > 0) {
                this.setTableHeaderRow(tempHeaderConf);
            }
            this.setFontStyle('normal');
            this.printingHeaderRow = false;
        };
    })(jsPDF.API);

    /**
     * jsPDF Context2D PlugIn
     * Copyright (c) 2014 Steven Spungin (TwelveTone LLC)  steven@twelvetone.tv
     *
     * Licensed under the MIT License.
     * http://opensource.org/licenses/mit-license
     */

    /**
     * This plugin mimicks the HTML5 Canvas's context2d.
     * 
     * The goal is to provide a way for current canvas implementations to print directly to a PDF.
     */

    /**
     * require('jspdf.js');
     * require('lib/css_colors.js');
     */

    (function (jsPDFAPI) {
    	'use strict';

    	jsPDFAPI.events.push(['initialized', function () {
    		this.context2d.pdf = this;
    		this.context2d.internal.pdf = this;
    		this.context2d.ctx = new context();
    		this.context2d.ctxStack = [];
    		this.context2d.path = [];
    	}]);

    	jsPDFAPI.context2d = {
    		pageWrapXEnabled: false,
    		pageWrapYEnabled: true,
    		pageWrapX: 9999999,
    		pageWrapY: 9999999,

    		f2: function f2(number) {
    			return number.toFixed(2);
    		},

    		fillRect: function fillRect(x, y, w, h) {
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			this.pdf.rect(x, y, w, h, "f");
    		},

    		strokeRect: function strokeRect(x, y, w, h) {
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			this.pdf.rect(x, y, w, h, "s");
    		},

    		clearRect: function clearRect(x, y, w, h) {
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			this.save();
    			this.setFillStyle('#ffffff');
    			this.pdf.rect(x, y, w, h, "f");
    			this.restore();
    		},

    		save: function save() {
    			this.ctx._fontSize = this.pdf.internal.getFontSize();
    			var ctx = new context();
    			ctx.copy(this.ctx);
    			this.ctxStack.push(this.ctx);
    			this.ctx = ctx;
    		},

    		restore: function restore() {
    			this.ctx = this.ctxStack.pop();
    			this.setFillStyle(this.ctx.fillStyle);
    			this.setStrokeStyle(this.ctx.strokeStyle);
    			this.setFont(this.ctx.font);
    			this.pdf.setFontSize(this.ctx._fontSize);
    			this.setLineCap(this.ctx.lineCap);
    			this.setLineWidth(this.ctx.lineWidth);
    			this.setLineJoin(this.ctx.lineJoin);
    		},

    		beginPath: function beginPath() {
    			this.path = [];
    		},

    		closePath: function closePath() {
    			this.path.push({
    				type: 'close'
    			});
    		},

    		setFillStyle: function setFillStyle(style) {

    			// get the decimal values of r, g, and b;
    			var r, g, b, a;

    			var m = this.internal.rxRgb.exec(style);
    			if (m != null) {
    				r = parseInt(m[1]);
    				g = parseInt(m[2]);
    				b = parseInt(m[3]);
    			} else {
    				m = this.internal.rxRgba.exec(style);
    				if (m != null) {
    					r = parseInt(m[1]);
    					g = parseInt(m[2]);
    					b = parseInt(m[3]);
    					a = parseInt(m[4]);
    				} else {
    					if (style.charAt(0) != '#') {
    						style = CssColors.colorNameToHex(style);
    						if (!style) {
    							style = '#000000';
    						}
    					} else {}
    					this.ctx.fillStyle = style;

    					if (style.length === 4) {
    						r = this.ctx.fillStyle.substring(1, 2);
    						r += r;
    						g = this.ctx.fillStyle.substring(2, 3);
    						g += g;
    						b = this.ctx.fillStyle.substring(3, 4);
    						b += b;
    					} else {
    						r = this.ctx.fillStyle.substring(1, 3);
    						g = this.ctx.fillStyle.substring(3, 5);
    						b = this.ctx.fillStyle.substring(5, 7);
    					}
    					r = parseInt(r, 16);
    					g = parseInt(g, 16);
    					b = parseInt(b, 16);
    				}
    			}
    			this.pdf.setFillColor(r, g, b, {
    				a: a
    			});
    			this.pdf.setTextColor(r, g, b, {
    				a: a
    			});
    		},

    		setStrokeStyle: function setStrokeStyle(style) {
    			if (style.charAt(0) != '#') {
    				style = CssColors.colorNameToHex(style);
    				if (!style) {
    					style = '#000000';
    				}
    			}
    			this.ctx.strokeStyle = style;
    			var r = this.ctx.strokeStyle.substring(1, 3);
    			r = parseInt(r, 16);
    			var g = this.ctx.strokeStyle.substring(3, 5);
    			g = parseInt(g, 16);
    			var b = this.ctx.strokeStyle.substring(5, 7);
    			b = parseInt(b, 16);
    			this.pdf.setDrawColor(r, g, b);
    		},

    		fillText: function fillText(text, x, y, maxWidth) {
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			this.pdf.text(text, x, this._getBaseline(y));
    		},

    		strokeText: function strokeText(text, x, y, maxWidth) {
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			this.pdf.text(text, x, this._getBaseline(y), {
    				stroke: true
    			});
    		},

    		setFont: function setFont(font) {
    			this.ctx.font = font;

    			var rx = /\s*(\w+)\s+(\w+)\s+(\w+)\s+([\d\.]+)(px|pt|em)\s+["']?(\w+)['"]?/;
    			m = rx.exec(font);
    			if (m != null) {
    				var fontStyle = m[1];
    				var fontVariant = m[2];
    				var fontWeight = m[3];
    				var fontSize = m[4];
    				var fontSizeUnit = m[5];
    				var fontFamily = m[6];

    				if ('px' === fontSizeUnit) {
    					fontSize = Math.floor(parseFloat(fontSize));
    					//fontSize = fontSize * 1.25;
    				} else if ('em' === fontSizeUnit) {
    					fontSize = Math.floor(parseFloat(fontSize) * this.pdf.getFontSize());
    				} else {
    					fontSize = Math.floor(parseFloat(fontSize));
    				}

    				this.pdf.setFontSize(fontSize);

    				if (fontWeight === 'bold' || fontWeight === '700') {
    					this.pdf.setFontStyle('bold');
    				} else {
    					if (fontStyle === 'italic') {
    						this.pdf.setFontStyle('italic');
    					} else {
    						this.pdf.setFontStyle('normal');
    					}
    				}
    				//TODO This needs to be parsed
    				var name = fontFamily;
    				this.pdf.setFont(name, style);
    			} else {
    				var rx = /(\d+)(pt|px|em)\s+(\w+)\s*(\w+)?/;
    				var m = rx.exec(font);
    				if (m != null) {
    					var size = m[1];
    					var unit = m[2];
    					var name = m[3];
    					var style = m[4];
    					if (!style) {
    						style = 'normal';
    					}
    					if ('em' === fontSizeUnit) {
    						size = Math.floor(parseFloat(fontSize) * this.pdf.getFontSize());
    					} else {
    						size = Math.floor(parseFloat(size));
    					}
    					this.pdf.setFontSize(size);
    					this.pdf.setFont(name, style);
    				}
    			}
    		},

    		setTextBaseline: function setTextBaseline(baseline) {
    			this.ctx.textBaseline = baseline;
    		},

    		getTextBaseline: function getTextBaseline() {
    			return this.ctx.textBaseline;
    		},

    		setLineWidth: function setLineWidth(width) {
    			this.ctx.lineWidth = width;
    			this.pdf.setLineWidth(width);
    		},

    		setLineCap: function setLineCap(style) {
    			this.ctx.lineCap = style;
    			this.pdf.setLineCap(style);
    		},

    		setLineJoin: function setLineJoin(style) {
    			this.ctx.lineJon = style;
    			this.pdf.setLineJoin(style);
    		},

    		moveTo: function moveTo(x, y) {
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			var obj = {
    				type: 'mt',
    				x: x,
    				y: y
    			};
    			this.path.push(obj);
    		},

    		_wrapX: function _wrapX(x) {
    			if (this.pageWrapXEnabled) {
    				return x % this.pageWrapX;
    			} else {
    				return x;
    			}
    		},

    		_wrapY: function _wrapY(y) {
    			if (this.pageWrapYEnabled) {
    				this._gotoPage(this._page(y));
    				return (y - this.lastBreak) % this.pageWrapY;
    			} else {
    				return y;
    			}
    		},

    		lastBreak: 0,
    		// Y Position of page breaks.
    		pageBreaks: [],
    		// returns: One-based Page Number
    		// Should only be used if pageWrapYEnabled is true
    		_page: function _page(y) {
    			if (this.pageWrapYEnabled) {
    				this.lastBreak = 0;
    				var manualBreaks = 0;
    				var autoBreaks = 0;
    				for (var i = 0; i < this.pageBreaks.length; i++) {
    					if (y >= this.pageBreaks[i]) {
    						manualBreaks++;
    						if (this.lastBreak === 0) {
    							autoBreaks++;
    						}
    						var spaceBetweenLastBreak = this.pageBreaks[i] - this.lastBreak;
    						this.lastBreak = this.pageBreaks[i];
    						var pagesSinceLastBreak = Math.floor(spaceBetweenLastBreak / this.pageWrapY);
    						autoBreaks += pagesSinceLastBreak;
    					}
    				}
    				if (this.lastBreak === 0) {
    					var pagesSinceLastBreak = Math.floor(y / this.pageWrapY) + 1;
    					autoBreaks += pagesSinceLastBreak;
    				}
    				return autoBreaks + manualBreaks;
    			} else {
    				return this.pdf.internal.getCurrentPageInfo().pageNumber;
    			}
    		},

    		_gotoPage: function _gotoPage(pageOneBased) {
    			// This is a stub to be overriden if needed
    		},

    		lineTo: function lineTo(x, y) {
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			var obj = {
    				type: 'lt',
    				x: x,
    				y: y
    			};
    			this.path.push(obj);
    		},

    		bezierCurveTo: function bezierCurveTo(x1, y1, x2, y2, x, y) {
    			x1 = this._wrapX(x1);
    			y1 = this._wrapY(y1);
    			x2 = this._wrapX(x2);
    			y2 = this._wrapY(y2);
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			var obj = {
    				type: 'bct',
    				x1: x1,
    				y1: y1,
    				x2: x2,
    				y2: y2,
    				x: x,
    				y: y
    			};
    			this.path.push(obj);
    		},

    		quadraticCurveTo: function quadraticCurveTo(x1, y1, x, y) {
    			x1 = this._wrapX(x1);
    			y1 = this._wrapY(y1);
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			var obj = {
    				type: 'qct',
    				x1: x1,
    				y1: y1,
    				x: x,
    				y: y
    			};
    			this.path.push(obj);
    		},

    		arc: function arc(x, y, radius, startAngle, endAngle, anticlockwise) {
    			x = this._wrapX(x);
    			y = this._wrapY(y);
    			var obj = {
    				type: 'arc',
    				x: x,
    				y: y,
    				radius: radius,
    				startAngle: startAngle,
    				endAngle: endAngle,
    				anticlockwise: anticlockwise
    			};
    			this.path.push(obj);
    		},

    		drawImage: function drawImage(img, x, y, w, h, x2, y2, w2, h2) {
    			if (x2 !== undefined) {
    				x = x2;
    				y = y2;
    				w = w2;
    				h = h2;
    			}
    			x = this._wrapX(x);
    			y = this._wrapY(y);

    			//TODO implement source clipping and image scaling
    			var format;
    			var rx = /data:image\/(\w+).*/i;
    			var m = rx.exec(img);
    			if (m != null) {
    				format = m[1];
    			} else {
    				//format = "jpeg";
    				format = "png";
    			}
    			this.pdf.addImage(img, format, x, y, w, h);
    		},

    		stroke: function stroke() {
    			var start;
    			var deltas = [];
    			var last;
    			var closed = false;
    			for (var i = 0; i < this.path.length; i++) {
    				var pt = this.path[i];
    				switch (pt.type) {
    					case 'mt':
    						start = pt;
    						if (typeof start != 'undefined') {
    							this.pdf.lines(deltas, start.x, start.y, null, 's');
    							deltas = [];
    						}
    						break;
    					case 'lt':
    						var delta = [pt.x - this.path[i - 1].x, pt.y - this.path[i - 1].y];
    						deltas.push(delta);
    						break;
    					case 'bct':
    						var delta = [pt.x1 - this.path[i - 1].x, pt.y1 - this.path[i - 1].y, pt.x2 - this.path[i - 1].x, pt.y2 - this.path[i - 1].y, pt.x - this.path[i - 1].x, pt.y - this.path[i - 1].y];
    						deltas.push(delta);
    						break;
    					case 'qct':
    						// convert to bezier
    						var x1 = this.path[i - 1].x + 2.0 / 3.0 * (pt.x1 - this.path[i - 1].x);
    						var y1 = this.path[i - 1].y + 2.0 / 3.0 * (pt.y1 - this.path[i - 1].y);
    						var x2 = pt.x + 2.0 / 3.0 * (pt.x1 - pt.x);
    						var y2 = pt.y + 2.0 / 3.0 * (pt.y1 - pt.y);
    						var x3 = pt.x;
    						var y3 = pt.y;
    						var delta = [x1 - this.path[i - 1].x, y1 - this.path[i - 1].y, x2 - this.path[i - 1].x, y2 - this.path[i - 1].y, x3 - this.path[i - 1].x, y3 - this.path[i - 1].y];
    						deltas.push(delta);
    						break;
    					case 'close':
    						closed = true;
    						break;
    				}
    			}

    			if (typeof start != 'undefined') {
    				this.pdf.lines(deltas, start.x, start.y, null, 's', closed);
    			}

    			for (var i = 0; i < this.path.length; i++) {
    				var pt = this.path[i];
    				switch (pt.type) {
    					case 'arc':
    						var start = pt.startAngle * 360 / (2 * Math.PI);
    						var end = pt.endAngle * 360 / (2 * Math.PI);
    						this.internal.arc(pt.x, pt.y, pt.radius, start, end, pt.anticlockwise, 's');
    						break;
    				}
    			}

    			this.path = [];
    		},

    		fill: function fill() {
    			var start;
    			var deltas = [];
    			var last;
    			for (var i = 0; i < this.path.length; i++) {
    				var pt = this.path[i];
    				switch (pt.type) {
    					case 'mt':
    						start = pt;
    						if (typeof start != 'undefined') {
    							this.pdf.lines(deltas, start.x, start.y, null, 'f');
    							deltas = [];
    						}
    						break;
    					case 'lt':
    						var delta = [pt.x - this.path[i - 1].x, pt.y - this.path[i - 1].y];
    						deltas.push(delta);
    						break;
    					case 'bct':
    						var delta = [pt.x1 - this.path[i - 1].x, pt.y1 - this.path[i - 1].y, pt.x2 - this.path[i - 1].x, pt.y2 - this.path[i - 1].y, pt.x - this.path[i - 1].x, pt.y - this.path[i - 1].y];
    						deltas.push(delta);
    						break;
    					case 'qct':
    						// convert to bezier
    						var x1 = this.path[i - 1].x + 2.0 / 3.0 * (pt.x1 - this.path[i - 1].x);
    						var y1 = this.path[i - 1].y + 2.0 / 3.0 * (pt.y1 - this.path[i - 1].y);
    						var x2 = pt.x + 2.0 / 3.0 * (pt.x1 - pt.x);
    						var y2 = pt.y + 2.0 / 3.0 * (pt.y1 - pt.y);
    						var x3 = pt.x;
    						var y3 = pt.y;
    						var delta = [x1 - this.path[i - 1].x, y1 - this.path[i - 1].y, x2 - this.path[i - 1].x, y2 - this.path[i - 1].y, x3 - this.path[i - 1].x, y3 - this.path[i - 1].y];
    						deltas.push(delta);
    						break;
    				}
    			}

    			if (typeof start != 'undefined') {
    				this.pdf.lines(deltas, start.x, start.y, null, 'f');
    			}

    			for (var i = 0; i < this.path.length; i++) {
    				var pt = this.path[i];
    				switch (pt.type) {
    					case 'arc':
    						var start = pt.startAngle * 360 / (2 * Math.PI);
    						var end = pt.endAngle * 360 / (2 * Math.PI);
    						this.internal.arc(pt.x, pt.y, pt.radius, start, end, pt.anticlockwise, 'f');
    						break;
    					case 'close':
    						this.pdf.internal.out('h');
    						break;
    				}
    			}

    			this.path = [];
    		},

    		clip: function clip() {
    			//TODO not implemented
    		},

    		translate: function translate(x, y) {
    			this.ctx._translate = {
    				x: x,
    				y: y
    			};
    			//TODO use translate in other drawing methods.
    		},
    		measureText: function measureText(text) {
    			var pdf = this.pdf;
    			return {
    				getWidth: function getWidth() {
    					var fontSize = pdf.internal.getFontSize();
    					var txtWidth = pdf.getStringUnitWidth(text) * fontSize / pdf.internal.scaleFactor;
    					return txtWidth;
    				},

    				get width() {
    					return this.getWidth(text);
    				}
    			};
    		},
    		_getBaseline: function _getBaseline(y) {
    			var height = parseInt(this.pdf.internal.getFontSize());
    			//TODO Get descent from font descriptor
    			var descent = height * .25;
    			switch (this.ctx.textBaseline) {
    				case 'bottom':
    					return y - descent;
    				case 'top':
    					return y + height;
    				case 'hanging':
    					return y + height - descent;
    				case 'middle':
    					return y + height / 2 - descent;
    				case 'ideographic':
    					//TODO not implemented
    					return y;
    				case 'alphabetic':
    				default:
    					return y;
    			}
    		}
    	};

    	var c2d = jsPDFAPI.context2d;

    	// accessor methods
    	Object.defineProperty(c2d, 'fillStyle', {
    		set: function set(value) {
    			this.setFillStyle(value);
    		},
    		get: function get() {
    			return this.ctx.fillStyle;
    		}
    	});
    	Object.defineProperty(c2d, 'textBaseline', {
    		set: function set(value) {
    			this.setTextBaseline(value);
    		},
    		get: function get() {
    			return this.getTextBaseline();
    		}
    	});
    	Object.defineProperty(c2d, 'font', {
    		set: function set(value) {
    			this.setFont(value);
    		},
    		get: function get() {
    			return this.getFont();
    		}
    	});

    	c2d.internal = {};

    	c2d.internal.rxRgb = /rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+\s*)\)/;
    	c2d.internal.rxRgba = /rgba\s*\(\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/;

    	// http://hansmuller-flex.blogspot.com/2011/10/more-about-approximating-circular-arcs.html
    	c2d.internal.arc = function (xc, yc, r, a1, a2, anticlockwise, style) {

    		var k = this.pdf.internal.scaleFactor;
    		var pageHeight = this.pdf.internal.pageSize.height;
    		var f2 = this.pdf.internal.f2;

    		var a1r = a1 * (Math.PI / 180);
    		var a2r = a2 * (Math.PI / 180);
    		var curves = this.createArc(r, a1r, a2r, anticlockwise);
    		var pathData = null;

    		for (var i = 0; i < curves.length; i++) {
    			var curve = curves[i];
    			if (i == 0) {
    				this.pdf.internal.out([f2((curve.x1 + xc) * k), f2((pageHeight - (curve.y1 + yc)) * k), 'm', f2((curve.x2 + xc) * k), f2((pageHeight - (curve.y2 + yc)) * k), f2((curve.x3 + xc) * k), f2((pageHeight - (curve.y3 + yc)) * k), f2((curve.x4 + xc) * k), f2((pageHeight - (curve.y4 + yc)) * k), 'c'].join(' '));
    			} else {
    				this.pdf.internal.out([f2((curve.x2 + xc) * k), f2((pageHeight - (curve.y2 + yc)) * k), f2((curve.x3 + xc) * k), f2((pageHeight - (curve.y3 + yc)) * k), f2((curve.x4 + xc) * k), f2((pageHeight - (curve.y4 + yc)) * k), 'c'].join(' '));
    			}
    			//f2((curve.x1 + xc) * k), f2((pageHeight - (curve.y1 + yc)) * k), 'm', f2((curve.x2 + xc) * k), f2((pageHeight - (curve.y2 + yc)) * k), f2((curve.x3 + xc) * k), f2((pageHeight - (curve.y3 + yc)) * k), f2((curve.x4 + xc) * k), f2((pageHeight - (curve.y4 + yc)) * k), 'c'
    		}

    		if (style !== null) {
    			this.pdf.internal.out(this.pdf.internal.getStyle(style));
    		}
    	};

    	/**
      *  Return a array of objects that represent bezier curves which approximate the 
      *  circular arc centered at the origin, from startAngle to endAngle (radians) with 
      *  the specified radius.
      *  
      *  Each bezier curve is an object with four points, where x1,y1 and 
      *  x4,y4 are the arc's end points and x2,y2 and x3,y3 are the cubic bezier's 
      *  control points.
      */

    	c2d.internal.createArc = function (radius, startAngle, endAngle, anticlockwise) {

    		var EPSILON = 0.00001; // Roughly 1/1000th of a degree, see below    

    		// normalize startAngle, endAngle to [-2PI, 2PI]
    		var twoPI = Math.PI * 2;
    		var startAngleN = startAngle;
    		if (startAngleN < twoPI || startAngleN > twoPI) {
    			startAngleN = startAngleN % twoPI;
    		}
    		var endAngleN = endAngle;
    		if (endAngleN < twoPI || endAngleN > twoPI) {
    			endAngleN = endAngleN % twoPI;
    		}

    		// Compute the sequence of arc curves, up to PI/2 at a time.  
    		// Total arc angle is less than 2PI.
    		var curves = [];
    		var piOverTwo = Math.PI / 2.0;
    		//var sgn = (startAngle < endAngle) ? +1 : -1; // clockwise or counterclockwise
    		var sgn = anticlockwise ? -1 : +1;

    		var a1 = startAngle;
    		for (var totalAngle = Math.min(twoPI, Math.abs(endAngleN - startAngleN)); totalAngle > EPSILON;) {
    			var a2 = a1 + sgn * Math.min(totalAngle, piOverTwo);
    			curves.push(this.createSmallArc(radius, a1, a2));
    			totalAngle -= Math.abs(a2 - a1);
    			a1 = a2;
    		}

    		return curves;
    	};

    	/**
      *  Cubic bezier approximation of a circular arc centered at the origin, 
      *  from (radians) a1 to a2, where a2-a1 < pi/2.  The arc's radius is r.
      * 
      *  Returns an object with four points, where x1,y1 and x4,y4 are the arc's end points
      *  and x2,y2 and x3,y3 are the cubic bezier's control points.
      * 
      *  This algorithm is based on the approach described in:
      *  A. Riškus, "Approximation of a Cubic Bezier Curve by Circular Arcs and Vice Versa," 
      *  Information Technology and Control, 35(4), 2006 pp. 371-378.
      */

    	c2d.internal.createSmallArc = function (r, a1, a2) {
    		// Compute all four points for an arc that subtends the same total angle
    		// but is centered on the X-axis

    		var a = (a2 - a1) / 2.0;

    		var x4 = r * Math.cos(a);
    		var y4 = r * Math.sin(a);
    		var x1 = x4;
    		var y1 = -y4;

    		var q1 = x1 * x1 + y1 * y1;
    		var q2 = q1 + x1 * x4 + y1 * y4;
    		var k2 = 4 / 3 * (Math.sqrt(2 * q1 * q2) - q2) / (x1 * y4 - y1 * x4);

    		var x2 = x1 - k2 * y1;
    		var y2 = y1 + k2 * x1;
    		var x3 = x2;
    		var y3 = -y2;

    		// Find the arc points' actual locations by computing x1,y1 and x4,y4 
    		// and rotating the control points by a + a1

    		var ar = a + a1;
    		var cos_ar = Math.cos(ar);
    		var sin_ar = Math.sin(ar);

    		return {
    			x1: r * Math.cos(a1),
    			y1: r * Math.sin(a1),
    			x2: x2 * cos_ar - y2 * sin_ar,
    			y2: x2 * sin_ar + y2 * cos_ar,
    			x3: x3 * cos_ar - y3 * sin_ar,
    			y3: x3 * sin_ar + y3 * cos_ar,
    			x4: r * Math.cos(a2),
    			y4: r * Math.sin(a2)
    		};
    	};

    	function context() {
    		this.fillStyle = '#000000';
    		this.strokeStyle = '#000000';
    		this.font = "12pt times";
    		this.textBaseline = 'alphabetic'; //top,bottom,middle,ideographic,alphabetic,hanging
    		this.lineWidth = 1;
    		this.lineJoin = 'miter'; //round, bevel, miter
    		this.lineCap = 'butt'; //butt, round, square
    		this._translate = {
    			x: 0,
    			y: 0
    		};
    		//TODO miter limit //default 10

    		this.copy = function (ctx) {
    			this.fillStyle = ctx.fillStyle;
    			this.strokeStyle = ctx.strokeStyle;
    			this.font = ctx.font;
    			this.lineWidth = ctx.lineWidth;
    			this.lineJoin = ctx.lineJoin;
    			this.lineCap = ctx.lineCap;
    			this.textBaseline = ctx.textBaseline;
    			this._fontSize = ctx._fontSize;
    			this._translate = {
    				x: ctx._translate.x,
    				y: ctx._translate.y
    			};
    		};
    	}

    	return this;
    })(jsPDF.API);

    /** @preserve
     * jsPDF fromHTML plugin. BETA stage. API subject to change. Needs browser
     * Copyright (c) 2012 Willow Systems Corporation, willow-systems.com
     *               2014 Juan Pablo Gaviria, https://github.com/juanpgaviria
     *               2014 Diego Casorran, https://github.com/diegocr
     *               2014 Daniel Husar, https://github.com/danielhusar
     *               2014 Wolfgang Gassler, https://github.com/woolfg
     *               2014 Steven Spungin, https://github.com/flamenco
     *
     * 
     * ====================================================================
     */

    (function (jsPDFAPI) {
    	var clone, _DrillForContent, FontNameDB, FontStyleMap, TextAlignMap, FontWeightMap, FloatMap, ClearMap, GetCSS, PurgeWhiteSpace, Renderer, ResolveFont, ResolveUnitedNumber, UnitedNumberMap, elementHandledElsewhere, images, loadImgs, checkForFooter, process, tableToJson;
    	clone = function () {
    		return function (obj) {
    			Clone.prototype = obj;
    			return new Clone();
    		};
    		function Clone() {}
    	}();
    	PurgeWhiteSpace = function PurgeWhiteSpace(array) {
    		var fragment, i, l, lTrimmed, r, rTrimmed, trailingSpace;
    		i = 0;
    		l = array.length;
    		fragment = void 0;
    		lTrimmed = false;
    		rTrimmed = false;
    		while (!lTrimmed && i !== l) {
    			fragment = array[i] = array[i].trimLeft();
    			if (fragment) {
    				lTrimmed = true;
    			}
    			i++;
    		}
    		i = l - 1;
    		while (l && !rTrimmed && i !== -1) {
    			fragment = array[i] = array[i].trimRight();
    			if (fragment) {
    				rTrimmed = true;
    			}
    			i--;
    		}
    		r = /\s+$/g;
    		trailingSpace = true;
    		i = 0;
    		while (i !== l) {
    			// Leave the line breaks intact
    			if (array[i] != "\u2028") {
    				fragment = array[i].replace(/\s+/g, " ");
    				if (trailingSpace) {
    					fragment = fragment.trimLeft();
    				}
    				if (fragment) {
    					trailingSpace = r.test(fragment);
    				}
    				array[i] = fragment;
    			}
    			i++;
    		}
    		return array;
    	};
    	Renderer = function Renderer(pdf, x, y, settings) {
    		this.pdf = pdf;
    		this.x = x;
    		this.y = y;
    		this.settings = settings;
    		//list of functions which are called after each element-rendering process
    		this.watchFunctions = [];
    		this.init();
    		return this;
    	};
    	ResolveFont = function ResolveFont(css_font_family_string) {
    		var name, part, parts;
    		name = void 0;
    		parts = css_font_family_string.split(",");
    		part = parts.shift();
    		while (!name && part) {
    			name = FontNameDB[part.trim().toLowerCase()];
    			part = parts.shift();
    		}
    		return name;
    	};
    	ResolveUnitedNumber = function ResolveUnitedNumber(css_line_height_string) {

    		//IE8 issues
    		css_line_height_string = css_line_height_string === "auto" ? "0px" : css_line_height_string;
    		if (css_line_height_string.indexOf("em") > -1 && !isNaN(Number(css_line_height_string.replace("em", "")))) {
    			css_line_height_string = Number(css_line_height_string.replace("em", "")) * 18.719 + "px";
    		}
    		if (css_line_height_string.indexOf("pt") > -1 && !isNaN(Number(css_line_height_string.replace("pt", "")))) {
    			css_line_height_string = Number(css_line_height_string.replace("pt", "")) * 1.333 + "px";
    		}

    		var normal, undef, value;
    		undef = void 0;
    		normal = 16.00;
    		value = UnitedNumberMap[css_line_height_string];
    		if (value) {
    			return value;
    		}
    		value = {
    			"xx-small": 9,
    			"x-small": 11,
    			small: 13,
    			medium: 16,
    			large: 19,
    			"x-large": 23,
    			"xx-large": 28,
    			auto: 0
    		}[{ css_line_height_string: css_line_height_string }];

    		if (value !== undef) {
    			return UnitedNumberMap[css_line_height_string] = value / normal;
    		}
    		if (value = parseFloat(css_line_height_string)) {
    			return UnitedNumberMap[css_line_height_string] = value / normal;
    		}
    		value = css_line_height_string.match(/([\d\.]+)(px)/);
    		if (value.length === 3) {
    			return UnitedNumberMap[css_line_height_string] = parseFloat(value[1]) / normal;
    		}
    		return UnitedNumberMap[css_line_height_string] = 1;
    	};
    	GetCSS = function GetCSS(element) {
    		var css, tmp, computedCSSElement;
    		computedCSSElement = function (el) {
    			var compCSS;
    			compCSS = function (el) {
    				if (document.defaultView && document.defaultView.getComputedStyle) {
    					return document.defaultView.getComputedStyle(el, null);
    				} else if (el.currentStyle) {
    					return el.currentStyle;
    				} else {
    					return el.style;
    				}
    			}(el);
    			return function (prop) {
    				prop = prop.replace(/-\D/g, function (match) {
    					return match.charAt(1).toUpperCase();
    				});
    				return compCSS[prop];
    			};
    		}(element);
    		css = {};
    		tmp = void 0;
    		css["font-family"] = ResolveFont(computedCSSElement("font-family")) || "times";
    		css["font-style"] = FontStyleMap[computedCSSElement("font-style")] || "normal";
    		css["text-align"] = TextAlignMap[computedCSSElement("text-align")] || "left";
    		tmp = FontWeightMap[computedCSSElement("font-weight")] || "normal";
    		if (tmp === "bold") {
    			if (css["font-style"] === "normal") {
    				css["font-style"] = tmp;
    			} else {
    				css["font-style"] = tmp + css["font-style"];
    			}
    		}
    		css["font-size"] = ResolveUnitedNumber(computedCSSElement("font-size")) || 1;
    		css["line-height"] = ResolveUnitedNumber(computedCSSElement("line-height")) || 1;
    		css["display"] = computedCSSElement("display") === "inline" ? "inline" : "block";

    		tmp = css["display"] === "block";
    		css["margin-top"] = tmp && ResolveUnitedNumber(computedCSSElement("margin-top")) || 0;
    		css["margin-bottom"] = tmp && ResolveUnitedNumber(computedCSSElement("margin-bottom")) || 0;
    		css["padding-top"] = tmp && ResolveUnitedNumber(computedCSSElement("padding-top")) || 0;
    		css["padding-bottom"] = tmp && ResolveUnitedNumber(computedCSSElement("padding-bottom")) || 0;
    		css["margin-left"] = tmp && ResolveUnitedNumber(computedCSSElement("margin-left")) || 0;
    		css["margin-right"] = tmp && ResolveUnitedNumber(computedCSSElement("margin-right")) || 0;
    		css["padding-left"] = tmp && ResolveUnitedNumber(computedCSSElement("padding-left")) || 0;
    		css["padding-right"] = tmp && ResolveUnitedNumber(computedCSSElement("padding-right")) || 0;

    		css["page-break-before"] = computedCSSElement("page-break-before") || "auto";

    		//float and clearing of floats
    		css["float"] = FloatMap[computedCSSElement("cssFloat")] || "none";
    		css["clear"] = ClearMap[computedCSSElement("clear")] || "none";

    		css["color"] = computedCSSElement("color");

    		return css;
    	};
    	elementHandledElsewhere = function elementHandledElsewhere(element, renderer, elementHandlers) {
    		var handlers, i, isHandledElsewhere, l, t;
    		isHandledElsewhere = false;
    		i = void 0;
    		l = void 0;
    		t = void 0;
    		handlers = elementHandlers["#" + element.id];
    		if (handlers) {
    			if (typeof handlers === "function") {
    				isHandledElsewhere = handlers(element, renderer);
    			} else {
    				i = 0;
    				l = handlers.length;
    				while (!isHandledElsewhere && i !== l) {
    					isHandledElsewhere = handlers[i](element, renderer);
    					i++;
    				}
    			}
    		}
    		handlers = elementHandlers[element.nodeName];
    		if (!isHandledElsewhere && handlers) {
    			if (typeof handlers === "function") {
    				isHandledElsewhere = handlers(element, renderer);
    			} else {
    				i = 0;
    				l = handlers.length;
    				while (!isHandledElsewhere && i !== l) {
    					isHandledElsewhere = handlers[i](element, renderer);
    					i++;
    				}
    			}
    		}
    		return isHandledElsewhere;
    	};
    	tableToJson = function tableToJson(table, renderer) {
    		var data, headers, i, j, rowData, tableRow, table_obj, table_with, cell, l;
    		data = [];
    		headers = [];
    		i = 0;
    		l = table.rows[0].cells.length;
    		table_with = table.clientWidth;
    		while (i < l) {
    			cell = table.rows[0].cells[i];
    			headers[i] = {
    				name: cell.textContent.toLowerCase().replace(/\s+/g, ''),
    				prompt: cell.textContent.replace(/\r?\n/g, ''),
    				width: cell.clientWidth / table_with * renderer.pdf.internal.pageSize.width
    			};
    			i++;
    		}
    		i = 1;
    		while (i < table.rows.length) {
    			tableRow = table.rows[i];
    			rowData = {};
    			j = 0;
    			while (j < tableRow.cells.length) {
    				rowData[headers[j].name] = tableRow.cells[j].textContent.replace(/\r?\n/g, '');
    				j++;
    			}
    			data.push(rowData);
    			i++;
    		}
    		return table_obj = {
    			rows: data,
    			headers: headers
    		};
    	};
    	var SkipNode = {
    		SCRIPT: 1,
    		STYLE: 1,
    		NOSCRIPT: 1,
    		OBJECT: 1,
    		EMBED: 1,
    		SELECT: 1
    	};
    	var listCount = 1;
    	_DrillForContent = function DrillForContent(element, renderer, elementHandlers) {
    		var cn, cns, fragmentCSS, i, isBlock, l, px2pt, table2json, cb;
    		cns = element.childNodes;
    		cn = void 0;
    		fragmentCSS = GetCSS(element);
    		isBlock = fragmentCSS.display === "block";
    		if (isBlock) {
    			renderer.setBlockBoundary();
    			renderer.setBlockStyle(fragmentCSS);
    		}
    		px2pt = 0.264583 * 72 / 25.4;
    		i = 0;
    		l = cns.length;
    		while (i < l) {
    			cn = cns[i];
    			if ((typeof cn === "undefined" ? "undefined" : babelHelpers.typeof(cn)) === "object") {

    				//execute all watcher functions to e.g. reset floating
    				renderer.executeWatchFunctions(cn);

    				/*** HEADER rendering **/
    				if (cn.nodeType === 1 && cn.nodeName === 'HEADER') {
    					var header = cn;
    					//store old top margin
    					var oldMarginTop = renderer.pdf.margins_doc.top;
    					//subscribe for new page event and render header first on every page
    					renderer.pdf.internal.events.subscribe('addPage', function (pageInfo) {
    						//set current y position to old margin
    						renderer.y = oldMarginTop;
    						//render all child nodes of the header element
    						_DrillForContent(header, renderer, elementHandlers);
    						//set margin to old margin + rendered header + 10 space to prevent overlapping
    						//important for other plugins (e.g. table) to start rendering at correct position after header
    						renderer.pdf.margins_doc.top = renderer.y + 10;
    						renderer.y += 10;
    					}, false);
    				}

    				if (cn.nodeType === 8 && cn.nodeName === "#comment") {
    					if (~cn.textContent.indexOf("ADD_PAGE")) {
    						renderer.pdf.addPage();
    						renderer.y = renderer.pdf.margins_doc.top;
    					}
    				} else if (cn.nodeType === 1 && !SkipNode[cn.nodeName]) {
    					/*** IMAGE RENDERING ***/
    					var cached_image;
    					if (cn.nodeName === "IMG") {
    						var url = cn.getAttribute("src");
    						cached_image = images[renderer.pdf.sHashCode(url) || url];
    					}
    					if (cached_image) {
    						if (renderer.pdf.internal.pageSize.height - renderer.pdf.margins_doc.bottom < renderer.y + cn.height && renderer.y > renderer.pdf.margins_doc.top) {
    							renderer.pdf.addPage();
    							renderer.y = renderer.pdf.margins_doc.top;
    							//check if we have to set back some values due to e.g. header rendering for new page
    							renderer.executeWatchFunctions(cn);
    						}

    						var imagesCSS = GetCSS(cn);
    						var imageX = renderer.x;
    						var fontToUnitRatio = 12 / renderer.pdf.internal.scaleFactor;

    						//define additional paddings, margins which have to be taken into account for margin calculations
    						var additionalSpaceLeft = (imagesCSS["margin-left"] + imagesCSS["padding-left"]) * fontToUnitRatio;
    						var additionalSpaceRight = (imagesCSS["margin-right"] + imagesCSS["padding-right"]) * fontToUnitRatio;
    						var additionalSpaceTop = (imagesCSS["margin-top"] + imagesCSS["padding-top"]) * fontToUnitRatio;
    						var additionalSpaceBottom = (imagesCSS["margin-bottom"] + imagesCSS["padding-bottom"]) * fontToUnitRatio;

    						//if float is set to right, move the image to the right border
    						//add space if margin is set
    						if (imagesCSS['float'] !== undefined && imagesCSS['float'] === 'right') {
    							imageX += renderer.settings.width - cn.width - additionalSpaceRight;
    						} else {
    							imageX += additionalSpaceLeft;
    						}

    						renderer.pdf.addImage(cached_image, imageX, renderer.y + additionalSpaceTop, cn.width, cn.height);
    						cached_image = undefined;
    						//if the float prop is specified we have to float the text around the image
    						if (imagesCSS['float'] === 'right' || imagesCSS['float'] === 'left') {
    							//add functiont to set back coordinates after image rendering
    							renderer.watchFunctions.push(function (diffX, thresholdY, diffWidth, el) {
    								//undo drawing box adaptions which were set by floating
    								if (renderer.y >= thresholdY) {
    									renderer.x += diffX;
    									renderer.settings.width += diffWidth;
    									return true;
    								} else if (el && el.nodeType === 1 && !SkipNode[el.nodeName] && renderer.x + el.width > renderer.pdf.margins_doc.left + renderer.pdf.margins_doc.width) {
    									renderer.x += diffX;
    									renderer.y = thresholdY;
    									renderer.settings.width += diffWidth;
    									return true;
    								} else {
    									return false;
    								}
    							}.bind(this, imagesCSS['float'] === 'left' ? -cn.width - additionalSpaceLeft - additionalSpaceRight : 0, renderer.y + cn.height + additionalSpaceTop + additionalSpaceBottom, cn.width));
    							//reset floating by clear:both divs
    							//just set cursorY after the floating element
    							renderer.watchFunctions.push(function (yPositionAfterFloating, pages, el) {
    								if (renderer.y < yPositionAfterFloating && pages === renderer.pdf.internal.getNumberOfPages()) {
    									if (el.nodeType === 1 && GetCSS(el).clear === 'both') {
    										renderer.y = yPositionAfterFloating;
    										return true;
    									} else {
    										return false;
    									}
    								} else {
    									return true;
    								}
    							}.bind(this, renderer.y + cn.height, renderer.pdf.internal.getNumberOfPages()));

    							//if floating is set we decrease the available width by the image width
    							renderer.settings.width -= cn.width + additionalSpaceLeft + additionalSpaceRight;
    							//if left just add the image width to the X coordinate
    							if (imagesCSS['float'] === 'left') {
    								renderer.x += cn.width + additionalSpaceLeft + additionalSpaceRight;
    							}
    						} else {
    							//if no floating is set, move the rendering cursor after the image height
    							renderer.y += cn.height + additionalSpaceTop + additionalSpaceBottom;
    						}

    						/*** TABLE RENDERING ***/
    					} else if (cn.nodeName === "TABLE") {
    						table2json = tableToJson(cn, renderer);
    						renderer.y += 10;
    						renderer.pdf.table(renderer.x, renderer.y, table2json.rows, table2json.headers, {
    							autoSize: false,
    							printHeaders: elementHandlers.printHeaders,
    							margins: renderer.pdf.margins_doc,
    							css: GetCSS(cn)
    						});
    						renderer.y = renderer.pdf.lastCellPos.y + renderer.pdf.lastCellPos.h + 20;
    					} else if (cn.nodeName === "OL" || cn.nodeName === "UL") {
    						listCount = 1;
    						if (!elementHandledElsewhere(cn, renderer, elementHandlers)) {
    							_DrillForContent(cn, renderer, elementHandlers);
    						}
    						renderer.y += 10;
    					} else if (cn.nodeName === "LI") {
    						var temp = renderer.x;
    						renderer.x += 20 / renderer.pdf.internal.scaleFactor;
    						renderer.y += 3;
    						if (!elementHandledElsewhere(cn, renderer, elementHandlers)) {
    							_DrillForContent(cn, renderer, elementHandlers);
    						}
    						renderer.x = temp;
    					} else if (cn.nodeName === "BR") {
    						renderer.y += fragmentCSS["font-size"] * renderer.pdf.internal.scaleFactor;
    						renderer.addText("\u2028", clone(fragmentCSS));
    					} else {
    						if (!elementHandledElsewhere(cn, renderer, elementHandlers)) {
    							_DrillForContent(cn, renderer, elementHandlers);
    						}
    					}
    				} else if (cn.nodeType ===