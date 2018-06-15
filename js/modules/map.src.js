/**
 * @license Highmaps JS v6.1.0-modified (2018-06-16)
 * Highmaps as a plugin for Highcharts or Highstock.
 *
 * (c) 2011-2017 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
'use strict';
(function (factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory;
	} else {
		factory(Highcharts);
	}
}(function (Highcharts) {
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var addEvent = H.addEvent,
		    Axis = H.Axis,
		    each = H.each,
		    pick = H.pick;

		/**
		 * Override to use the extreme coordinates from the SVG shape, not the
		 * data values
		 */
		addEvent(Axis, 'getSeriesExtremes', function () {
		    var xData = [];

		    // Remove the xData array and cache it locally so that the proceed method
		    // doesn't use it
		    if (this.isXAxis) {
		        each(this.series, function (series, i) {
		            if (series.useMapGeometry) {
		                xData[i] = series.xData;
		                series.xData = [];
		            }
		        });
		        this.seriesXData = xData;
		    }

		});

		addEvent(Axis, 'afterGetSeriesExtremes', function () {

		    var xData = this.seriesXData,
		        dataMin,
		        dataMax,
		        useMapGeometry;

		    // Run extremes logic for map and mapline
		    if (this.isXAxis) {
		        dataMin = pick(this.dataMin, Number.MAX_VALUE);
		        dataMax = pick(this.dataMax, -Number.MAX_VALUE);
		        each(this.series, function (series, i) {
		            if (series.useMapGeometry) {
		                dataMin = Math.min(dataMin, pick(series.minX, dataMin));
		                dataMax = Math.max(dataMax, pick(series.maxX, dataMax));
		                series.xData = xData[i]; // Reset xData array
		                useMapGeometry = true;
		            }
		        });
		        if (useMapGeometry) {
		            this.dataMin = dataMin;
		            this.dataMax = dataMax;
		        }

		        delete this.seriesXData;
		    }

		});

		/**
		 * Override axis translation to make sure the aspect ratio is always kept
		 */
		addEvent(Axis, 'afterSetAxisTranslation', function () {
		    var chart = this.chart,
		        mapRatio,
		        plotRatio = chart.plotWidth / chart.plotHeight,
		        adjustedAxisLength,
		        xAxis = chart.xAxis[0],
		        padAxis,
		        fixTo,
		        fixDiff,
		        preserveAspectRatio;

		    // Check for map-like series
		    if (this.coll === 'yAxis' && xAxis.transA !== undefined) {
		        each(this.series, function (series) {
		            if (series.preserveAspectRatio) {
		                preserveAspectRatio = true;
		            }
		        });
		    }

		    // On Y axis, handle both
		    if (preserveAspectRatio) {

		        // Use the same translation for both axes
		        this.transA = xAxis.transA = Math.min(this.transA, xAxis.transA);

		        mapRatio = plotRatio /
		            ((xAxis.max - xAxis.min) / (this.max - this.min));

		        // What axis to pad to put the map in the middle
		        padAxis = mapRatio < 1 ? this : xAxis;

		        // Pad it
		        adjustedAxisLength = (padAxis.max - padAxis.min) * padAxis.transA;
		        padAxis.pixelPadding = padAxis.len - adjustedAxisLength;
		        padAxis.minPixelPadding = padAxis.pixelPadding / 2;

		        fixTo = padAxis.fixTo;
		        if (fixTo) {
		            fixDiff = fixTo[1] - padAxis.toValue(fixTo[0], true);
		            fixDiff *= padAxis.transA;
		            if (
		                Math.abs(fixDiff) > padAxis.minPixelPadding ||
		                (
		                    padAxis.min === padAxis.dataMin &&
		                    padAxis.max === padAxis.dataMax
		                )
		            ) { // zooming out again, keep within restricted area
		                fixDiff = 0;
		            }
		            padAxis.minPixelPadding -= fixDiff;
		        }
		    }
		});

		/**
		 * Override Axis.render in order to delete the fixTo prop
		 */
		addEvent(Axis, 'render', function () {
		    this.fixTo = null;
		});

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var addEvent = H.addEvent,
		    Axis = H.Axis,
		    Chart = H.Chart,
		    color = H.color,
		    ColorAxis,
		    each = H.each,
		    extend = H.extend,
		    isNumber = H.isNumber,
		    Legend = H.Legend,
		    LegendSymbolMixin = H.LegendSymbolMixin,
		    noop = H.noop,
		    merge = H.merge,
		    pick = H.pick;

		// If ColorAxis already exists, we may be loading the heatmap module on top of
		// Highmaps.
		if (!H.ColorAxis) {

		    /**
		     * The ColorAxis object for inclusion in gradient legends
		     */
		    ColorAxis = H.ColorAxis = function () {
		        this.init.apply(this, arguments);
		    };
		    extend(ColorAxis.prototype, Axis.prototype);
		    extend(ColorAxis.prototype, {
		        /**
		         * A color axis for choropleth maps and heat maps. Visually, the color
		         * axis will appear as a gradient or as separate items inside the
		         * legend, depending on whether the axis is scalar or based on data
		         * classes.
		         *
		         * For supported color formats, see the
		         * [docs article about colors](http://www.highcharts.com/docs/chart-design-and-style/colors).
		         *
		         * A scalar color axis is represented by a gradient. The colors either
		         * range between the [minColor](#colorAxis.minColor) and the
		         * [maxColor](#colorAxis.maxColor), or for more fine grained control the
		         * colors can be defined in [stops](#colorAxis.stops). Often times, the
		         * color axis needs to be adjusted to get the right color spread for the
		         * data. In addition to stops, consider using a logarithmic
		         * [axis type](#colorAxis.type), or setting [min](#colorAxis.min) and
		         * [max](#colorAxis.max) to avoid the colors being determined by
		         * outliers.
		         *
		         * When [dataClasses](#colorAxis.dataClasses) are used, the ranges are
		         * subdivided into separate classes like categories based on their
		         * values. This can be used for ranges between two values, but also for
		         * a true category. However, when your data is categorized, it may be as
		         * convenient to add each category to a separate series.
		         *
		         * See [the Axis object](/class-reference/Highcharts.Axis) for
		         * programmatic access to the axis.
		         *
		         * @extends {xAxis}
		         * @excluding allowDecimals,alternateGridColor,breaks,categories,
		         *            crosshair,dateTimeLabelFormats,lineWidth,linkedTo,maxZoom,
		         *            minRange,minTickInterval,offset,opposite,plotBands,
		         *            plotLines,showEmpty,title
		         * @product highcharts highmaps
		         * @optionparent colorAxis
		         */
		        defaultColorAxisOptions: {

		            /**
		             * Whether to allow decimals on the color axis.
		             * @type {Boolean}
		             * @default true
		             * @product highcharts highmaps
		             * @apioption colorAxis.allowDecimals
		             */

		            /**
		             * Determines how to set each data class' color if no individual
		             * color is set. The default value, `tween`, computes intermediate
		             * colors between `minColor` and `maxColor`. The other possible
		             * value, `category`, pulls colors from the global or chart specific
		             * [colors](#colors) array.
		             *
		             * @validvalue ["tween", "category"]
		             * @type {String}
		             * @sample {highmaps} maps/coloraxis/dataclasscolor/ Category colors
		             * @default tween
		             * @product highcharts highmaps
		             * @apioption colorAxis.dataClassColor
		             */

		            /**
		             * An array of data classes or ranges for the choropleth map. If
		             * none given, the color axis is scalar and values are distributed
		             * as a gradient between the minimum and maximum colors.
		             *
		             * @type {Array<Object>}
		             * @sample {highmaps} maps/demo/data-class-ranges/ Multiple ranges
		             * @sample {highmaps} maps/demo/data-class-two-ranges/ Two ranges
		             * @product highcharts highmaps
		             * @apioption colorAxis.dataClasses
		             */

		            /**
		             * The color of each data class. If not set, the color is pulled
		             * from the global or chart-specific [colors](#colors) array. In
		             * styled mode, this option is ignored. Instead, use colors defined
		             * in CSS.
		             *
		             * @type {Color}
		             * @sample {highmaps} maps/demo/data-class-two-ranges/
		             *         Explicit colors
		             * @product highcharts highmaps
		             * @apioption colorAxis.dataClasses.color
		             */

		            /**
		             * The start of the value range that the data class represents,
		             * relating to the point value.
		             *
		             * The range of each `dataClass` is closed in both ends, but can be
		             * overridden by the next `dataClass`.
		             *
		             * @type      {Number}
		             * @product   highcharts highmaps
		             * @apioption colorAxis.dataClasses.from
		             */

		            /**
		             * The name of the data class as it appears in the legend.
		             * If no name is given, it is automatically created based on the
		             * `from` and `to` values. For full programmatic control,
		             * [legend.labelFormatter](#legend.labelFormatter) can be used.
		             * In the formatter, `this.from` and `this.to` can be accessed.
		             *
		             * @type      {String}
		             * @sample    {highmaps} maps/coloraxis/dataclasses-name/
		             *            Named data classes
		             * @sample    {highmaps} maps/coloraxis/dataclasses-labelformatter/
		             *            Formatted data classes
		             * @product   highcharts highmaps
		             * @apioption colorAxis.dataClasses.name
		             */

		            /**
		             * The end of the value range that the data class represents,
		             * relating to the point value.
		             *
		             * The range of each `dataClass` is closed in both ends, but can be
		             * overridden by the next `dataClass`.
		             *
		             * @type      {Number}
		             * @product   highcharts highmaps
		             * @apioption colorAxis.dataClasses.to
		             */

		            /**
		              * @ignore-option
		              */
		            lineWidth: 0,

		            /**
		             * Padding of the min value relative to the length of the axis. A
		             * padding of 0.05 will make a 100px axis 5px longer.
		             *
		             * @type {Number}
		             * @product highcharts highmaps
		             */
		            minPadding: 0,

		            /**
		             * The maximum value of the axis in terms of map point values. If
		             * `null`, the max value is automatically calculated. If the
		             * `endOnTick` option is true, the max value might be rounded up.
		             *
		             * @type {Number}
		             * @sample {highmaps} maps/coloraxis/gridlines/
		             *         Explicit min and max to reduce the effect of outliers
		             * @product highcharts highmaps
		             * @apioption colorAxis.max
		             */

		            /**
		             * The minimum value of the axis in terms of map point values. If
		             * `null`, the min value is automatically calculated. If the
		             * `startOnTick` option is true, the min value might be rounded
		             * down.
		             *
		             * @type {Number}
		             * @sample {highmaps} maps/coloraxis/gridlines/
		             *         Explicit min and max to reduce the effect of outliers
		             * @product highcharts highmaps
		             * @apioption colorAxis.min
		             */

		            /**
		             * Padding of the max value relative to the length of the axis. A
		             * padding of 0.05 will make a 100px axis 5px longer.
		             *
		             * @type {Number}
		             * @product highcharts highmaps
		             */
		            maxPadding: 0,

		            /**
		             * Color of the grid lines extending from the axis across the
		             * gradient.
		             *
		             * @type {Color}
		             * @sample {highmaps} maps/coloraxis/gridlines/
		             *         Grid lines demonstrated
		             * @default #e6e6e6
		             * @product highcharts highmaps
		             * @apioption colorAxis.gridLineColor
		             */

		            /**
		             * The width of the grid lines extending from the axis across the
		             * gradient of a scalar color axis.
		             *
		             * @type {Number}
		             * @sample {highmaps} maps/coloraxis/gridlines/
		             *         Grid lines demonstrated
		             * @default 1
		             * @product highcharts highmaps
		             */
		            gridLineWidth: 1,

		            /**
		             * The interval of the tick marks in axis units. When `null`, the
		             * tick interval is computed to approximately follow the
		             * `tickPixelInterval`.
		             *
		             * @type {Number}
		             * @product highcharts highmaps
		             * @apioption colorAxis.tickInterval
		             */

		            /**
		             * If [tickInterval](#colorAxis.tickInterval) is `null` this option
		             * sets the approximate pixel interval of the tick marks.
		             *
		             * @type {Number}
		             * @default 72
		             * @product highcharts highmaps
		             */
		            tickPixelInterval: 72,

		            /**
		             * Whether to force the axis to start on a tick. Use this option
		             * with the `maxPadding` option to control the axis start.
		             *
		             * @type {Boolean}
		             * @default true
		             * @product highcharts highmaps
		             */
		            startOnTick: true,

		            /**
		             * Whether to force the axis to end on a tick. Use this option with
		             * the [maxPadding](#colorAxis.maxPadding) option to control the
		             * axis end.
		             *
		             * @type {Boolean}
		             * @default true
		             * @product highcharts highmaps
		             */
		            endOnTick: true,

		            /**    @ignore */
		            offset: 0,

		            /**
		             * The triangular marker on a scalar color axis that points to the
		             * value of the hovered area. To disable the marker, set
		             * `marker: null`.
		             *
		             * @type {Object}
		             * @sample {highmaps} maps/coloraxis/marker/ Black marker
		             * @product highcharts highmaps
		             */
		            marker: {

		                /**
		                 * Animation for the marker as it moves between values. Set to
		                 * `false` to disable animation. Defaults to `{ duration: 50 }`.
		                 *
		                 * @type {Object|Boolean}
		                 * @product highcharts highmaps
		                 */
		                animation: {
		                    duration: 50
		                },

		                /**
		                 * @ignore
		                 */
		                width: 0.01
                
		            },

		            /**
		             * The axis labels show the number for each tick.
		             *
		             * For more live examples on label options, see [xAxis.labels in the
		             * Highcharts API.](/highcharts#xAxis.labels)
		             *
		             * @type {Object}
		             * @extends xAxis.labels
		             * @product highcharts highmaps
		             */
		            labels: {

		                /**
		                 * How to handle overflowing labels on horizontal color axis.
		                 * Can be undefined or "justify". If "justify", labels will not
		                 * render outside the legend area. If there is room to move it,
		                 * it will be aligned to the edge, else it will be removed.
		                 *
		                 * @validvalue [null, "justify"]
		                 * @type {String}
		                 * @default justify
		                 * @product highcharts highmaps
		                 */
		                overflow: 'justify',

		                rotation: 0
		            },

		            /**
		             * The color to represent the minimum of the color axis. Unless
		             * [dataClasses](#colorAxis.dataClasses) or
		             * [stops](#colorAxis.stops) are set, the gradient starts at this
		             * value.
		             *
		             * If dataClasses are set, the color is based on minColor and
		             * maxColor unless a color is set for each data class, or the
		             * [dataClassColor](#colorAxis.dataClassColor) is set.
		             *
		             * @type {Color}
		             * @sample {highmaps} maps/coloraxis/mincolor-maxcolor/
		             *         Min and max colors on scalar (gradient) axis
		             * @sample {highmaps} maps/coloraxis/mincolor-maxcolor-dataclasses/
		             *         On data classes
		             * @default #e6ebf5
		             * @product highcharts highmaps
		             */
		            minColor: '#e6ebf5',

		            /**
		             * The color to represent the maximum of the color axis. Unless
		             * [dataClasses](#colorAxis.dataClasses) or
		             * [stops](#colorAxis.stops) are set, the gradient ends at this
		             * value.
		             *
		             * If dataClasses are set, the color is based on minColor and
		             * maxColor unless a color is set for each data class, or the
		             * [dataClassColor](#colorAxis.dataClassColor) is set.
		             *
		             * @type {Color}
		             * @sample {highmaps} maps/coloraxis/mincolor-maxcolor/
		             *         Min and max colors on scalar (gradient) axis
		             * @sample {highmaps} maps/coloraxis/mincolor-maxcolor-dataclasses/
		             *         On data classes
		             * @default #003399
		             * @product highcharts highmaps
		             */
		            maxColor: '#003399',

		            /**
		             * Color stops for the gradient of a scalar color axis. Use this in
		             * cases where a linear gradient between a `minColor` and `maxColor`
		             * is not sufficient. The stops is an array of tuples, where the
		             * first item is a float between 0 and 1 assigning the relative
		             * position in the gradient, and the second item is the color.
		             *
		             * @type {Array<Array>}
		             * @sample {highmaps} maps/demo/heatmap/
		             *         Heatmap with three color stops
		             * @product highcharts highmaps
		             * @apioption colorAxis.stops
		             */

		            /**
		             * The pixel length of the main tick marks on the color axis.
		             */
		            tickLength: 5,

		            /**
		             * The type of interpolation to use for the color axis. Can be
		             * `linear` or `logarithmic`.
		             *
		             * @validvalue ["linear", "logarithmic"]
		             * @type {String}
		             * @default linear
		             * @product highcharts highmaps
		             * @apioption colorAxis.type
		             */

		            /**
		             * Whether to reverse the axis so that the highest number is closest
		             * to the origin. Defaults to `false` in a horizontal legend and
		             * `true` in a vertical legend, where the smallest value starts on
		             * top.
		             *
		             * @type {Boolean}
		             * @product highcharts highmaps
		             * @apioption colorAxis.reversed
		             */

		            /**
		             * Fires when the legend item belonging to the colorAxis is clicked.
		             * One parameter, `event`, is passed to the function.
		             *
		             * @type      {Function}
		             * @product   highcharts highmaps
		             * @apioption colorAxis.events.legendItemClick
		             */

		            /**
		             * Whether to display the colorAxis in the legend.
		             *
		             * @type {Boolean}
		             * @see [heatmap.showInLegend](#series.heatmap.showInLegend)
		             * @default true
		             * @since 4.2.7
		             * @product highcharts highmaps
		             */
		            showInLegend: true
		        },

		        // Properties to preserve after destroy, for Axis.update (#5881, #6025)
		        keepProps: [
		            'legendGroup',
		            'legendItemHeight',
		            'legendItemWidth',
		            'legendItem',
		            'legendSymbol'
		        ].concat(Axis.prototype.keepProps),

		        /**
		         * Initialize the color axis
		         */
		        init: function (chart, userOptions) {
		            var horiz = chart.options.legend.layout !== 'vertical',
		                options;

		            this.coll = 'colorAxis';

		            // Build the options
		            options = merge(this.defaultColorAxisOptions, {
		                side: horiz ? 2 : 1,
		                reversed: !horiz
		            }, userOptions, {
		                opposite: !horiz,
		                showEmpty: false,
		                title: null,
		                visible: chart.options.legend.enabled
		            });

		            Axis.prototype.init.call(this, chart, options);

		            // Base init() pushes it to the xAxis array, now pop it again
		            // chart[this.isXAxis ? 'xAxis' : 'yAxis'].pop();

		            // Prepare data classes
		            if (userOptions.dataClasses) {
		                this.initDataClasses(userOptions);
		            }
		            this.initStops();

		            // Override original axis properties
		            this.horiz = horiz;
		            this.zoomEnabled = false;

		            // Add default values
		            this.defaultLegendLength = 200;
		        },

		        initDataClasses: function (userOptions) {
		            var chart = this.chart,
		                dataClasses,
		                colorCounter = 0,
		                colorCount = chart.options.chart.colorCount,
		                options = this.options,
		                len = userOptions.dataClasses.length;
		            this.dataClasses = dataClasses = [];
		            this.legendItems = [];

		            each(userOptions.dataClasses, function (dataClass, i) {
		                var colors;

		                dataClass = merge(dataClass);
		                dataClasses.push(dataClass);

                
		                if (options.dataClassColor === 'category') {
                    
		                    dataClass.colorIndex = colorCounter;

		                    // increase and loop back to zero
		                    colorCounter++;
		                    if (colorCounter === colorCount) {
		                        colorCounter = 0;
		                    }
		                } else {
		                    dataClass.color = color(options.minColor).tweenTo(
		                        color(options.maxColor),
		                        len < 2 ? 0.5 : i / (len - 1) // #3219
		                    );
		                }
		            });
		        },

		        /**
		         * Override so that ticks are not added in data class axes (#6914)
		         */
		        setTickPositions: function () {
		            if (!this.dataClasses) {
		                return Axis.prototype.setTickPositions.call(this);
		            }
		        },


		        initStops: function () {
		            this.stops = this.options.stops || [
		                [0, this.options.minColor],
		                [1, this.options.maxColor]
		            ];
		            each(this.stops, function (stop) {
		                stop.color = color(stop[1]);
		            });
		        },

		        /**
		         * Extend the setOptions method to process extreme colors and color
		         * stops.
		         */
		        setOptions: function (userOptions) {
		            Axis.prototype.setOptions.call(this, userOptions);

		            this.options.crosshair = this.options.marker;
		        },

		        setAxisSize: function () {
		            var symbol = this.legendSymbol,
		                chart = this.chart,
		                legendOptions = chart.options.legend || {},
		                x,
		                y,
		                width,
		                height;

		            if (symbol) {
		                this.left = x = symbol.attr('x');
		                this.top = y = symbol.attr('y');
		                this.width = width = symbol.attr('width');
		                this.height = height = symbol.attr('height');
		                this.right = chart.chartWidth - x - width;
		                this.bottom = chart.chartHeight - y - height;

		                this.len = this.horiz ? width : height;
		                this.pos = this.horiz ? x : y;
		            } else {
		                // Fake length for disabled legend to avoid tick issues
		                // and such (#5205)
		                this.len = (
		                        this.horiz ?
		                            legendOptions.symbolWidth :
		                            legendOptions.symbolHeight
		                    ) || this.defaultLegendLength;
		            }
		        },

		        normalizedValue: function (value) {
		            if (this.isLog) {
		                value = this.val2lin(value);
		            }
		            return 1 - ((this.max - value) / ((this.max - this.min) || 1));
		        },

		        /**
		         * Translate from a value to a color
		         */
		        toColor: function (value, point) {
		            var pos,
		                stops = this.stops,
		                from,
		                to,
		                color,
		                dataClasses = this.dataClasses,
		                dataClass,
		                i;

		            if (dataClasses) {
		                i = dataClasses.length;
		                while (i--) {
		                    dataClass = dataClasses[i];
		                    from = dataClass.from;
		                    to = dataClass.to;
		                    if (
		                        (from === undefined || value >= from) &&
		                        (to === undefined || value <= to)
		                    ) {
                        
		                        if (point) {
		                            point.dataClass = i;
		                            point.colorIndex = dataClass.colorIndex;
		                        }
		                        break;
		                    }
		                }

		            } else {

		                pos = this.normalizedValue(value);
		                i = stops.length;
		                while (i--) {
		                    if (pos > stops[i][0]) {
		                        break;
		                    }
		                }
		                from = stops[i] || stops[i + 1];
		                to = stops[i + 1] || from;

		                // The position within the gradient
		                pos = 1 - (to[0] - pos) / ((to[0] - from[0]) || 1);

		                color = from.color.tweenTo(
		                    to.color,
		                    pos
		                );
		            }
		            return color;
		        },

		        /**
		         * Override the getOffset method to add the whole axis groups inside
		         * the legend.
		         */
		        getOffset: function () {
		            var group = this.legendGroup,
		                sideOffset = this.chart.axisOffset[this.side];

		            if (group) {

		                // Hook for the getOffset method to add groups to this parent
		                // group
		                this.axisParent = group;

		                // Call the base
		                Axis.prototype.getOffset.call(this);

		                // First time only
		                if (!this.added) {

		                    this.added = true;

		                    this.labelLeft = 0;
		                    this.labelRight = this.width;
		                }
		                // Reset it to avoid color axis reserving space
		                this.chart.axisOffset[this.side] = sideOffset;
		            }
		        },

		        /**
		         * Create the color gradient
		         */
		        setLegendColor: function () {
		            var grad,
		                horiz = this.horiz,
		                reversed = this.reversed,
		                one = reversed ? 1 : 0,
		                zero = reversed ? 0 : 1;

		            grad = horiz ? [one, 0, zero, 0] : [0, zero, 0, one]; // #3190
		            this.legendColor = {
		                linearGradient: {
		                    x1: grad[0], y1: grad[1],
		                    x2: grad[2], y2: grad[3]
		                },
		                stops: this.stops
		            };
		        },

		        /**
		         * The color axis appears inside the legend and has its own legend
		         * symbol
		         */
		        drawLegendSymbol: function (legend, item) {
		            var padding = legend.padding,
		                legendOptions = legend.options,
		                horiz = this.horiz,
		                width = pick(
		                    legendOptions.symbolWidth,
		                    horiz ? this.defaultLegendLength : 12
		                ),
		                height = pick(
		                    legendOptions.symbolHeight,
		                    horiz ? 12 : this.defaultLegendLength
		                ),
		                labelPadding = pick(
		                    legendOptions.labelPadding,
		                    horiz ? 16 : 30
		                ),
		                itemDistance = pick(legendOptions.itemDistance, 10);

		            this.setLegendColor();

		            // Create the gradient
		            item.legendSymbol = this.chart.renderer.rect(
		                0,
		                legend.baseline - 11,
		                width,
		                height
		            ).attr({
		                zIndex: 1
		            }).add(item.legendGroup);

		            // Set how much space this legend item takes up
		            this.legendItemWidth = width + padding +
		                (horiz ? itemDistance : labelPadding);
		            this.legendItemHeight = height + padding +
		                (horiz ? labelPadding : 0);
		        },
		        /**
		         * Fool the legend
		         */
		        setState: function (state) {
		            each(this.series, function (series) {
		                series.setState(state);
		            });
		        },
		        visible: true,
		        setVisible: noop,
		        getSeriesExtremes: function () {
		            var series = this.series,
		                i = series.length;
		            this.dataMin = Infinity;
		            this.dataMax = -Infinity;
		            while (i--) {
		                series[i].getExtremes();
		                if (series[i].valueMin !== undefined) {
		                    this.dataMin = Math.min(this.dataMin, series[i].valueMin);
		                    this.dataMax = Math.max(this.dataMax, series[i].valueMax);
		                }
		            }
		        },
		        drawCrosshair: function (e, point) {
		            var plotX = point && point.plotX,
		                plotY = point && point.plotY,
		                crossPos,
		                axisPos = this.pos,
		                axisLen = this.len;

		            if (point) {
		                crossPos = this.toPixels(point[point.series.colorKey]);
		                if (crossPos < axisPos) {
		                    crossPos = axisPos - 2;
		                } else if (crossPos > axisPos + axisLen) {
		                    crossPos = axisPos + axisLen + 2;
		                }

		                point.plotX = crossPos;
		                point.plotY = this.len - crossPos;
		                Axis.prototype.drawCrosshair.call(this, e, point);
		                point.plotX = plotX;
		                point.plotY = plotY;

		                if (
		                    this.cross &&
		                    !this.cross.addedToColorAxis &&
		                    this.legendGroup
		                ) {
		                    this.cross
		                        .addClass('highcharts-coloraxis-marker')
		                        .add(this.legendGroup);

		                    this.cross.addedToColorAxis = true;

                    

		                }
		            }
		        },
		        getPlotLinePath: function (a, b, c, d, pos) {
		            // crosshairs only
		            return isNumber(pos) ? // pos can be 0 (#3969)
		                (
		                    this.horiz ? [
		                        'M',
		                        pos - 4, this.top - 6,
		                        'L',
		                        pos + 4, this.top - 6,
		                        pos, this.top,
		                        'Z'
		                    ] :    [
		                        'M',
		                        this.left, pos,
		                        'L',
		                        this.left - 6, pos + 6,
		                        this.left - 6, pos - 6,
		                        'Z'
		                    ]
		                ) :
		                Axis.prototype.getPlotLinePath.call(this, a, b, c, d);
		        },

		        update: function (newOptions, redraw) {
		            var chart = this.chart,
		                legend = chart.legend;

		            each(this.series, function (series) {
		                // Needed for Axis.update when choropleth colors change
		                series.isDirtyData = true;
		            });

		            // When updating data classes, destroy old items and make sure new
		            // ones are created (#3207)
		            if (newOptions.dataClasses && legend.allItems) {
		                each(legend.allItems, function (item) {
		                    if (item.isDataClass && item.legendGroup) {
		                        item.legendGroup.destroy();
		                    }
		                });
		                chart.isDirtyLegend = true;
		            }

		            // Keep the options structure updated for export. Unlike xAxis and
		            // yAxis, the colorAxis is not an array. (#3207)
		            chart.options[this.coll] = merge(this.userOptions, newOptions);

		            Axis.prototype.update.call(this, newOptions, redraw);
		            if (this.legendItem) {
		                this.setLegendColor();
		                legend.colorizeItem(this, true);
		            }
		        },

		        /**
		         * Extend basic axis remove by also removing the legend item.
		         */
		        remove: function () {
		            if (this.legendItem) {
		                this.chart.legend.destroyItem(this);
		            }
		            Axis.prototype.remove.call(this);
		        },

		        /**
		         * Get the legend item symbols for data classes
		         */
		        getDataClassLegendSymbols: function () {
		            var axis = this,
		                chart = this.chart,
		                legendItems = this.legendItems,
		                legendOptions = chart.options.legend,
		                valueDecimals = legendOptions.valueDecimals,
		                valueSuffix = legendOptions.valueSuffix || '',
		                name;

		            if (!legendItems.length) {
		                each(this.dataClasses, function (dataClass, i) {
		                    var vis = true,
		                        from = dataClass.from,
		                        to = dataClass.to;

		                    // Assemble the default name. This can be overridden
		                    // by legend.options.labelFormatter
		                    name = '';
		                    if (from === undefined) {
		                        name = '< ';
		                    } else if (to === undefined) {
		                        name = '> ';
		                    }
		                    if (from !== undefined) {
		                        name += H.numberFormat(from, valueDecimals) +
		                            valueSuffix;
		                    }
		                    if (from !== undefined && to !== undefined) {
		                        name += ' - ';
		                    }
		                    if (to !== undefined) {
		                        name += H.numberFormat(to, valueDecimals) + valueSuffix;
		                    }
		                    // Add a mock object to the legend items
		                    legendItems.push(extend({
		                        chart: chart,
		                        name: name,
		                        options: {},
		                        drawLegendSymbol: LegendSymbolMixin.drawRectangle,
		                        visible: true,
		                        setState: noop,
		                        isDataClass: true,
		                        setVisible: function () {
		                            vis = this.visible = !vis;
		                            each(axis.series, function (series) {
		                                each(series.points, function (point) {
		                                    if (point.dataClass === i) {
		                                        point.setVisible(vis);
		                                    }
		                                });
		                            });

		                            chart.legend.colorizeItem(this, vis);
		                        }
		                    }, dataClass));
		                });
		            }
		            return legendItems;
		        },
		        name: '' // Prevents 'undefined' in legend in IE8
		    });

		    /**
		     * Handle animation of the color attributes directly
		     */
		    each(['fill', 'stroke'], function (prop) {
		        H.Fx.prototype[prop + 'Setter'] = function () {
		            this.elem.attr(
		                prop,
		                color(this.start).tweenTo(
		                    color(this.end),
		                    this.pos
		                ),
		                null,
		                true
		            );
		        };
		    });

		    /**
		     * Extend the chart getAxes method to also get the color axis
		     */
		    addEvent(Chart, 'afterGetAxes', function () {

		        var options = this.options,
		            colorAxisOptions = options.colorAxis;

		        this.colorAxis = [];
		        if (colorAxisOptions) {
		            new ColorAxis(this, colorAxisOptions); // eslint-disable-line no-new
		        }
		    });


		    /**
		     * Add the color axis. This also removes the axis' own series to prevent
		     * them from showing up individually.
		     */
		    addEvent(Legend, 'afterGetAllItems', function (e) {
		        var colorAxisItems = [],
		            colorAxis = this.chart.colorAxis[0];

		        if (colorAxis && colorAxis.options) {
		            if (colorAxis.options.showInLegend) {
		                // Data classes
		                if (colorAxis.options.dataClasses) {
		                    colorAxisItems = colorAxis.getDataClassLegendSymbols();
		                // Gradient legend
		                } else {
		                    // Add this axis on top
		                    colorAxisItems.push(colorAxis);
		                }

		                // Don't add the color axis' series
		                each(colorAxis.series, function (series) {
		                    H.erase(e.allItems, series);
		                });
		            }
		        }

		        while (colorAxisItems.length) {
		            e.allItems.unshift(colorAxisItems.pop());
		        }
		    });

		    addEvent(Legend, 'afterColorizeItem', function (e) {
		        if (e.visible && e.item.legendColor) {
		            e.item.legendSymbol.attr({
		                fill: e.item.legendColor
		            });
		        }
		    });

		    // Updates in the legend need to be reflected in the color axis (6888)
		    addEvent(Legend, 'afterUpdate', function () {
		        if (this.chart.colorAxis[0]) {
		            this.chart.colorAxis[0].update({}, arguments[2]);
		        }
		    });
		}

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var defined = H.defined,
		    each = H.each,
		    noop = H.noop,
		    seriesTypes = H.seriesTypes;

		/**
		 * Mixin for maps and heatmaps
		 */
		H.colorPointMixin = {
		    /**
		     * Color points have a value option that determines whether or not it is
		     * a null point
		     */
		    isValid: function () {
		        // undefined is allowed
		        return (
		            this.value !== null &&
		            this.value !== Infinity &&
		            this.value !== -Infinity
		        );
		    },

		    /**
		     * Set the visibility of a single point
		     */
		    setVisible: function (vis) {
		        var point = this,
		            method = vis ? 'show' : 'hide';

		        // Show and hide associated elements
		        each(['graphic', 'dataLabel'], function (key) {
		            if (point[key]) {
		                point[key][method]();
		            }
		        });
		    },
		    setState: function (state) {
		        H.Point.prototype.setState.call(this, state);
		        if (this.graphic) {
		            this.graphic.attr({
		                zIndex: state === 'hover' ? 1 : 0
		            });
		        }
		    }
		};

		H.colorSeriesMixin = {
		    pointArrayMap: ['value'],
		    axisTypes: ['xAxis', 'yAxis', 'colorAxis'],
		    optionalAxis: 'colorAxis',
		    trackerGroups: ['group', 'markerGroup', 'dataLabelsGroup'],
		    getSymbol: noop,
		    parallelArrays: ['x', 'y', 'value'],
		    colorKey: 'value',

    

		    /**
		     * In choropleth maps, the color is a result of the value, so this needs
		     * translation too
		     */
		    translateColors: function () {
		        var series = this,
		            nullColor = this.options.nullColor,
		            colorAxis = this.colorAxis,
		            colorKey = this.colorKey;

		        each(this.data, function (point) {
		            var value = point[colorKey],
		                color;

		            color = point.options.color ||
		                (
		                    point.isNull ?
		                        nullColor :
		                        (colorAxis && value !== undefined) ?
		                            colorAxis.toColor(value, point) :
		                            point.color || series.color
		                );

		            if (color) {
		                point.color = color;
		            }
		        });
		    },

		    /**
		     * Get the color attibutes to apply on the graphic
		     */
		    colorAttribs: function (point) {
		        var ret = {};
		        if (defined(point.color)) {
		            ret[this.colorProp || 'fill'] = point.color;
		        }
		        return ret;
		    }
		};

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var addEvent = H.addEvent,
		    Chart = H.Chart,
		    doc = H.doc,
		    each = H.each,
		    extend = H.extend,
		    merge = H.merge,
		    pick = H.pick;

		function stopEvent(e) {
		    if (e) {
		        if (e.preventDefault) {
		            e.preventDefault();
		        }
		        if (e.stopPropagation) {
		            e.stopPropagation();
		        }
		        e.cancelBubble = true;
		    }
		}

		/**
		 * The MapNavigation handles buttons for navigation in addition to mousewheel
		 * and doubleclick handlers for chart zooming.
		 * @param {Chart} chart The Chart instance.
		 */
		function MapNavigation(chart) {
		    this.init(chart);
		}

		/**
		 * Initiator function.
		 * @param  {Chart} chart The Chart instance.
		 */
		MapNavigation.prototype.init = function (chart) {
		    this.chart = chart;
		    chart.mapNavButtons = [];
		};

		/**
		 * Update the map navigation with new options. Calling this is the same as
		 * calling `chart.update({ mapNavigation: {} })`.
		 * @param  {Object} options New options for the map navigation.
		 */
		MapNavigation.prototype.update = function (options) {
		    var chart = this.chart,
		        o = chart.options.mapNavigation,
		        buttonOptions,
		        attr,
		        states,
		        hoverStates,
		        selectStates,
		        outerHandler = function (e) {
		            this.handler.call(chart, e);
		            stopEvent(e); // Stop default click event (#4444)
		        },
		        mapNavButtons = chart.mapNavButtons;

		    // Merge in new options in case of update, and register back to chart
		    // options.
		    if (options) {
		        o = chart.options.mapNavigation =
		            merge(chart.options.mapNavigation, options);
		    }

		    // Destroy buttons in case of dynamic update
		    while (mapNavButtons.length) {
		        mapNavButtons.pop().destroy();
		    }

		    if (pick(o.enableButtons, o.enabled) && !chart.renderer.forExport) {

		        H.objectEach(o.buttons, function (button, n) {
		            buttonOptions = merge(o.buttonOptions, button);

            

		            button = chart.renderer.button(
		                buttonOptions.text,
		                0,
		                0,
		                outerHandler,
		                attr,
		                hoverStates,
		                selectStates,
		                0,
		                n === 'zoomIn' ? 'topbutton' : 'bottombutton'
		            )
		            .addClass('highcharts-map-navigation')
		            .attr({
		                width: buttonOptions.width,
		                height: buttonOptions.height,
		                title: chart.options.lang[n],
		                padding: buttonOptions.padding,
		                zIndex: 5
		            })
		            .add();
		            button.handler = buttonOptions.onclick;
		            button.align(
		                extend(buttonOptions, {
		                    width: button.width,
		                    height: 2 * button.height
		                }),
		                null,
		                buttonOptions.alignTo
		            );
		            // Stop double click event (#4444)
		            addEvent(button.element, 'dblclick', stopEvent);

		            mapNavButtons.push(button);

		        });
		    }

		    this.updateEvents(o);
		};

		/**
		 * Update events, called internally from the update function. Add new event
		 * handlers, or unbinds events if disabled.
		 * @param  {Object} options Options for map navigation.
		 */
		MapNavigation.prototype.updateEvents = function (options) {
		    var chart = this.chart;

		    // Add the double click event
		    if (
		        pick(options.enableDoubleClickZoom,    options.enabled) ||
		        options.enableDoubleClickZoomTo
		    ) {
		        this.unbindDblClick = this.unbindDblClick || addEvent(
		            chart.container,
		            'dblclick',
		            function (e) {
		                chart.pointer.onContainerDblClick(e);
		            }
		        );
		    } else if (this.unbindDblClick) {
		        // Unbind and set unbinder to undefined
		        this.unbindDblClick = this.unbindDblClick();
		    }

		    // Add the mousewheel event
		    if (pick(options.enableMouseWheelZoom, options.enabled)) {
		        this.unbindMouseWheel = this.unbindMouseWheel || addEvent(
		            chart.container,
		            doc.onmousewheel === undefined ? 'DOMMouseScroll' : 'mousewheel',
		            function (e) {
		                chart.pointer.onContainerMouseWheel(e);
		                // Issue #5011, returning false from non-jQuery event does
		                // not prevent default
		                stopEvent(e);
		                return false;
		            }
		        );
		    } else if (this.unbindMouseWheel) {
		        // Unbind and set unbinder to undefined
		        this.unbindMouseWheel = this.unbindMouseWheel();
		    }

		};

		// Add events to the Chart object itself
		extend(Chart.prototype, /** @lends Chart.prototype */ {

		    /**
		     * Fit an inner box to an outer. If the inner box overflows left or right,
		     * align it to the sides of the outer. If it overflows both sides, fit it
		     * within the outer. This is a pattern that occurs more places in
		     * Highcharts, perhaps it should be elevated to a common utility function.
		     *
		     * @private
		     */
		    fitToBox: function (inner, outer) {
		        each([['x', 'width'], ['y', 'height']], function (dim) {
		            var pos = dim[0],
		                size = dim[1];

		            if (inner[pos] + inner[size] > outer[pos] + outer[size]) { // right
		                // the general size is greater, fit fully to outer
		                if (inner[size] > outer[size]) {
		                    inner[size] = outer[size];
		                    inner[pos] = outer[pos];
		                } else { // align right
		                    inner[pos] = outer[pos] + outer[size] - inner[size];
		                }
		            }
		            if (inner[size] > outer[size]) {
		                inner[size] = outer[size];
		            }
		            if (inner[pos] < outer[pos]) {
		                inner[pos] = outer[pos];
		            }
		        });


		        return inner;
		    },

		    /**
		     * Highmaps only. Zoom in or out of the map. See also {@link Point#zoomTo}.
		     * See {@link Chart#fromLatLonToPoint} for how to get the `centerX` and
		     * `centerY` parameters for a geographic location.
		     *
		     * @param  {Number} [howMuch]
		     *         How much to zoom the map. Values less than 1 zooms in. 0.5 zooms
		     *         in to half the current view. 2 zooms to twice the current view.
		     *         If omitted, the zoom is reset.
		     * @param  {Number} [centerX]
		     *         The X axis position to center around if available space.
		     * @param  {Number} [centerY]
		     *         The Y axis position to center around if available space.
		     * @param  {Number} [mouseX]
		     *         Fix the zoom to this position if possible. This is used for
		     *         example in mousewheel events, where the area under the mouse
		     *         should be fixed as we zoom in.
		     * @param  {Number} [mouseY]
		     *         Fix the zoom to this position if possible.
		     */
		    mapZoom: function (howMuch, centerXArg, centerYArg, mouseX, mouseY) {
		        var chart = this,
		            xAxis = chart.xAxis[0],
		            xRange = xAxis.max - xAxis.min,
		            centerX = pick(centerXArg, xAxis.min + xRange / 2),
		            newXRange = xRange * howMuch,
		            yAxis = chart.yAxis[0],
		            yRange = yAxis.max - yAxis.min,
		            centerY = pick(centerYArg, yAxis.min + yRange / 2),
		            newYRange = yRange * howMuch,
		            fixToX = mouseX ? ((mouseX - xAxis.pos) / xAxis.len) : 0.5,
		            fixToY = mouseY ? ((mouseY - yAxis.pos) / yAxis.len) : 0.5,
		            newXMin = centerX - newXRange * fixToX,
		            newYMin = centerY - newYRange * fixToY,
		            newExt = chart.fitToBox({
		                x: newXMin,
		                y: newYMin,
		                width: newXRange,
		                height: newYRange
		            }, {
		                x: xAxis.dataMin,
		                y: yAxis.dataMin,
		                width: xAxis.dataMax - xAxis.dataMin,
		                height: yAxis.dataMax - yAxis.dataMin
		            }),
		            zoomOut = newExt.x <= xAxis.dataMin &&
		                newExt.width >= xAxis.dataMax - xAxis.dataMin &&
		                newExt.y <= yAxis.dataMin &&
		                newExt.height >= yAxis.dataMax - yAxis.dataMin;

		        // When mousewheel zooming, fix the point under the mouse
		        if (mouseX) {
		            xAxis.fixTo = [mouseX - xAxis.pos, centerXArg];
		        }
		        if (mouseY) {
		            yAxis.fixTo = [mouseY - yAxis.pos, centerYArg];
		        }

		        // Zoom
		        if (howMuch !== undefined && !zoomOut) {
		            xAxis.setExtremes(newExt.x, newExt.x + newExt.width, false);
		            yAxis.setExtremes(newExt.y, newExt.y + newExt.height, false);

		        // Reset zoom
		        } else {
		            xAxis.setExtremes(undefined, undefined, false);
		            yAxis.setExtremes(undefined, undefined, false);
		        }

		        // Prevent zooming until this one is finished animating
		        /*
		        chart.holdMapZoom = true;
		        setTimeout(function () {
		            chart.holdMapZoom = false;
		        }, 200);
		        */
		        /*
		        delay = animation ? animation.duration || 500 : 0;
		        if (delay) {
		            chart.isMapZooming = true;
		            setTimeout(function () {
		                chart.isMapZooming = false;
		                if (chart.mapZoomQueue) {
		                    chart.mapZoom.apply(chart, chart.mapZoomQueue);
		                }
		                chart.mapZoomQueue = null;
		            }, delay);
		        }
		        */

		        chart.redraw();
		    }
		});

		/**
		 * Extend the Chart.render method to add zooming and panning
		 */
		addEvent(Chart, 'beforeRender', function () {
		    // Render the plus and minus buttons. Doing this before the shapes makes
		    // getBBox much quicker, at least in Chrome.
		    this.mapNavigation = new MapNavigation(this);
		    this.mapNavigation.update();
		});

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var extend = H.extend,
		    pick = H.pick,
		    Pointer = H.Pointer,
		    wrap = H.wrap;

		// Extend the Pointer
		extend(Pointer.prototype, {

		    /**
		     * The event handler for the doubleclick event
		     */
		    onContainerDblClick: function (e) {
		        var chart = this.chart;

		        e = this.normalize(e);

		        if (chart.options.mapNavigation.enableDoubleClickZoomTo) {
		            if (
		                chart.pointer.inClass(e.target, 'highcharts-tracker') &&
		                chart.hoverPoint
		            ) {
		                chart.hoverPoint.zoomTo();
		            }
		        } else if (
		            chart.isInsidePlot(
		                e.chartX - chart.plotLeft,
		                e.chartY - chart.plotTop
		            )
		        ) {
		            chart.mapZoom(
		                0.5,
		                chart.xAxis[0].toValue(e.chartX),
		                chart.yAxis[0].toValue(e.chartY),
		                e.chartX,
		                e.chartY
		            );
		        }
		    },

		    /**
		     * The event handler for the mouse scroll event
		     */
		    onContainerMouseWheel: function (e) {
		        var chart = this.chart,
		            delta;

		        e = this.normalize(e);

		        // Firefox uses e.detail, WebKit and IE uses wheelDelta
		        delta = e.detail || -(e.wheelDelta / 120);
		        if (chart.isInsidePlot(
		            e.chartX - chart.plotLeft,
		            e.chartY - chart.plotTop)
		        ) {
		            chart.mapZoom(
		                Math.pow(
		                    chart.options.mapNavigation.mouseWheelSensitivity,
		                    delta
		                ),
		                chart.xAxis[0].toValue(e.chartX),
		                chart.yAxis[0].toValue(e.chartY),
		                e.chartX,
		                e.chartY
		            );
		        }
		    }
		});

		// The pinchType is inferred from mapNavigation options.
		wrap(Pointer.prototype, 'zoomOption', function (proceed) {


		    var mapNavigation = this.chart.options.mapNavigation;

		    // Pinch status
		    if (pick(mapNavigation.enableTouchZoom, mapNavigation.enabled)) {
		        this.chart.options.chart.pinchType = 'xy';
		    }

		    proceed.apply(this, [].slice.call(arguments, 1));

		});

		// Extend the pinchTranslate method to preserve fixed ratio when zooming
		wrap(
		    Pointer.prototype,
		    'pinchTranslate',
		    function (
		        proceed,
		        pinchDown,
		        touches,
		        transform,
		        selectionMarker,
		        clip,
		        lastValidTouch
		    ) {
		        var xBigger;
		        proceed.call(
		            this,
		            pinchDown,
		            touches,
		            transform,
		            selectionMarker,
		            clip,
		            lastValidTouch
		        );

		        // Keep ratio
		        if (this.chart.options.chart.type === 'map' && this.hasZoom) {
		            xBigger = transform.scaleX > transform.scaleY;
		            this.pinchTranslateDirection(
		                !xBigger,
		                pinchDown,
		                touches,
		                transform,
		                selectionMarker,
		                clip,
		                lastValidTouch,
		                xBigger ? transform.scaleX : transform.scaleY
		            );
		        }
		    }
		);

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var colorPointMixin = H.colorPointMixin,
		    colorSeriesMixin = H.colorSeriesMixin,
		    each = H.each,
		    extend = H.extend,
		    isNumber = H.isNumber,
		    LegendSymbolMixin = H.LegendSymbolMixin,
		    map = H.map,
		    merge = H.merge,
		    noop = H.noop,
		    pick = H.pick,
		    isArray = H.isArray,
		    Point = H.Point,
		    Series = H.Series,
		    seriesType = H.seriesType,
		    seriesTypes = H.seriesTypes,
		    splat = H.splat;

		/**
		 * The map series is used for basic choropleth maps, where each map area has a
		 * color based on its value.
		 *
		 * @sample maps/demo/base/ Choropleth map
		 * @extends {plotOptions.scatter}
		 * @excluding marker
		 * @product highmaps
		 * @optionparent plotOptions.map
		 */
		seriesType('map', 'scatter', {

		    /**
		     * Define the z index of the series.
		     *
		     * @type {Number}
		     * @product highmaps
		     * @apioption plotOptions.series.zIndex
		     */

		    /**
		     * Whether all areas of the map defined in `mapData` should be rendered.
		     * If `true`, areas which don't correspond to a data point, are rendered
		     * as `null` points. If `false`, those areas are skipped.
		     *
		     * @type {Boolean}
		     * @sample {highmaps} maps/plotoptions/series-allareas-false/
		     *         All areas set to false
		     * @default true
		     * @product highmaps
		     * @apioption plotOptions.series.allAreas
		     */
		    allAreas: true,

		    animation: false, // makes the complex shapes slow

    

		    /**
		     * Whether to allow pointer interaction like tooltips and mouse events
		     * on null points.
		     *
		     * @type {Boolean}
		     * @default false
		     * @since 4.2.7
		     * @product highmaps
		     * @apioption plotOptions.map.nullInteraction
		     */

		    /**
		     * Set this option to `false` to prevent a series from connecting to
		     * the global color axis. This will cause the series to have its own
		     * legend item.
		     *
		     * @type {Boolean}
		     * @default undefined
		     * @product highmaps
		     * @apioption plotOptions.series.colorAxis
		     */

		    /**
		     * @ignore-option
		     */
		    marker: null,

		    stickyTracking: false,

		    /**
		     * What property to join the `mapData` to the value data. For example,
		     * if joinBy is "code", the mapData items with a specific code is merged
		     * into the data with the same code. For maps loaded from GeoJSON, the
		     * keys may be held in each point's `properties` object.
		     *
		     * The joinBy option can also be an array of two values, where the first
		     * points to a key in the `mapData`, and the second points to another
		     * key in the `data`.
		     *
		     * When joinBy is `null`, the map items are joined by their position
		     * in the array, which performs much better in maps with many data points.
		     * This is the recommended option if you are printing more than a thousand
		     * data points and have a backend that can preprocess the data into
		     * a parallel array of the mapData.
		     *
		     * @type {String|Array<String>}
		     * @sample {highmaps} maps/plotoptions/series-border/ Joined by "code"
		     * @sample {highmaps} maps/demo/geojson/ GeoJSON joined by an array
		     * @sample {highmaps} maps/series/joinby-null/ Simple data joined by null
		     * @product highmaps
		     * @apioption plotOptions.series.joinBy
		     */
		    joinBy: 'hc-key',

		    dataLabels: {
		        formatter: function () { // #2945
		            return this.point.value;
		        },
		        inside: true, // for the color
		        verticalAlign: 'middle',
		        crop: false,
		        overflow: false,
		        padding: 0
		    },

		    /**
		     * @ignore
		     */
		    turboThreshold: 0,

		    tooltip: {
		        followPointer: true,
		        pointFormat: '{point.name}: {point.value}<br/>'
		    },

		    states: {

		        /**
		         * Overrides for the normal state.
		         *
		         * @type {Object}
		         * @product highmaps
		         * @apioption plotOptions.series.states.normal
		         */
		        normal: {

		            /**
		             * Animation options for the fill color when returning from hover
		             * state to normal state. The animation adds some latency in order
		             * to reduce the effect of flickering when hovering in and out of
		             * for example an uneven coastline.
		             *
		             * @type {Object|Boolean}
		             * @sample {highmaps}
		             *         maps/plotoptions/series-states-animation-false/
		             *         No animation of fill color
		             * @default true
		             * @product highmaps
		             * @apioption plotOptions.series.states.normal.animation
		             */
		            animation: true
		        },

		        hover: {

		            halo: null,

		            /**
		             * The color of the shape in this state
		             *
		             * @type {Color}
		             * @sample {highmaps} maps/plotoptions/series-states-hover/
		             *         Hover options
		             * @product highmaps
		             * @apioption plotOptions.series.states.hover.color
		             */

		            /**
		             * The border color of the point in this state.
		             *
		             * @type {Color}
		             * @product highmaps
		             * @apioption plotOptions.series.states.hover.borderColor
		             */

		            /**
		             * The border width of the point in this state
		             *
		             * @type {Number}
		             * @product highmaps
		             * @apioption plotOptions.series.states.hover.borderWidth
		             */

		            /**
		             * The relative brightness of the point when hovered, relative to
		             * the normal point color.
		             *
		             * @type {Number}
		             * @default 0.2
		             * @product highmaps
		             * @apioption plotOptions.series.states.hover.brightness
		             */
		            brightness: 0.2

		        }

        
		    }

		// Prototype members
		}, merge(colorSeriesMixin, {
		    type: 'map',
		    getExtremesFromAll: true,
		    useMapGeometry: true, // get axis extremes from paths, not values
		    forceDL: true,
		    searchPoint: noop,
		    // When tooltip is not shared, this series (and derivatives) requires direct
		    // touch/hover. KD-tree does not apply.
		    directTouch: true,
		    // X axis and Y axis must have same translation slope
		    preserveAspectRatio: true,
		    pointArrayMap: ['value'],
		    /**
		     * Get the bounding box of all paths in the map combined.
		     */
		    getBox: function (paths) {
		        var MAX_VALUE = Number.MAX_VALUE,
		            maxX = -MAX_VALUE,
		            minX =  MAX_VALUE,
		            maxY = -MAX_VALUE,
		            minY =  MAX_VALUE,
		            minRange = MAX_VALUE,
		            xAxis = this.xAxis,
		            yAxis = this.yAxis,
		            hasBox;

		        // Find the bounding box
		        each(paths || [], function (point) {

		            if (point.path) {
		                if (typeof point.path === 'string') {
		                    point.path = H.splitPath(point.path);
		                }

		                var path = point.path || [],
		                    i = path.length,
		                    even = false, // while loop reads from the end
		                    pointMaxX = -MAX_VALUE,
		                    pointMinX =  MAX_VALUE