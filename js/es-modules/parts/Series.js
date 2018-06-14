/**
 * (c) 2010-2017 Torstein Honsi
 *
 * License: www.highcharts.com/license
 */
'use strict';
import H from './Globals.js';
import './Utilities.js';
import './Options.js';
import './Legend.js';
import './Point.js';
import './SvgRenderer.js';
var addEvent = H.addEvent,
    animObject = H.animObject,
    arrayMax = H.arrayMax,
    arrayMin = H.arrayMin,
    correctFloat = H.correctFloat,
    defaultOptions = H.defaultOptions,
    defaultPlotOptions = H.defaultPlotOptions,
    defined = H.defined,
    each = H.each,
    erase = H.erase,
    extend = H.extend,
    fireEvent = H.fireEvent,
    grep = H.grep,
    isArray = H.isArray,
    isNumber = H.isNumber,
    isString = H.isString,
    LegendSymbolMixin = H.LegendSymbolMixin, // @todo add as a requirement
    merge = H.merge,
    objectEach = H.objectEach,
    pick = H.pick,
    Point = H.Point, // @todo  add as a requirement
    removeEvent = H.removeEvent,
    splat = H.splat,
    SVGElement = H.SVGElement,
    syncTimeout = H.syncTimeout,
    win = H.win;

/**
 * This is the base series prototype that all other series types inherit from.
 * A new series is initialized either through the
 * {@link https://api.highcharts.com/highcharts/series|series} option structure,
 * or after the chart is initialized, through
 * {@link Highcharts.Chart#addSeries}.
 *
 * The object can be accessed in a number of ways. All series and point event
 * handlers give a reference to the `series` object. The chart object has a
 * {@link Highcharts.Chart.series|series} property that is a collection of all
 * the chart's series. The point objects and axis objects also have the same
 * reference.
 *
 * Another way to reference the series programmatically is by `id`. Add an id
 * in the series configuration options, and get the series object by {@link
 * Highcharts.Chart#get}.
 *
 * Configuration options for the series are given in three levels. Options for
 * all series in a chart are given in the
 * {@link https://api.highcharts.com/highcharts/plotOptions.series|
 * plotOptions.series} object. Then options for all series of a specific type
 * are given in the plotOptions of that type, for example `plotOptions.line`.
 * Next, options for one single series are given in the series array, or as
 * arguements to `chart.addSeries`.
 *
 * The data in the series is stored in various arrays.
 *
 * - First, `series.options.data` contains all the original config options for
 * each point whether added by options or methods like `series.addPoint`.
 * - Next, `series.data` contains those values converted to points, but in case
 * the series data length exceeds the `cropThreshold`, or if the data is
 * grouped, `series.data` doesn't contain all the points. It only contains the
 * points that have been created on demand.
 * - Then there's `series.points` that contains all currently visible point
 * objects. In case of cropping, the cropped-away points are not part of this
 * array. The `series.points` array starts at `series.cropStart` compared to
 * `series.data` and `series.options.data`. If however the series data is
 * grouped, these can't be correlated one to one.
 * - `series.xData` and `series.processedXData` contain clean x values,
 * equivalent to `series.data` and `series.points`.
 * - `series.yData` and `series.processedYData` contain clean y values,
 * equivalent to `series.data` and `series.points`.
 *
 * @class Highcharts.Series
 * @param  {Highcharts.Chart} chart
 *         The chart instance.
 * @param  {Options.plotOptions.series} options
 *         The series options.
 *
 */

/**
 * General options for all series types.
 * @optionparent plotOptions.series
 */
H.Series = H.seriesType('line', null, { // base series options
    

    /**
     * For some series, there is a limit that shuts down initial animation
     * by default when the total number of points in the chart is too high.
     * For example, for a column chart and its derivatives, animation doesn't
     * run if there is more than 250 points totally. To disable this cap, set
     * `animationLimit` to `Infinity`.
     *
     * @type {Number}
     * @apioption plotOptions.series.animationLimit
     */

    /**
     * Allow this series' points to be selected by clicking on the graphic
     * (columns, point markers, pie slices, map areas etc).
     *
     * @see [Chart#getSelectedPoints](Highcharts.Chart#getSelectedPoints).
     *
     * @type {Boolean}
     * @sample {highcharts} highcharts/plotoptions/series-allowpointselect-line/
     *         Line
     * @sample {highcharts}
     *         highcharts/plotoptions/series-allowpointselect-column/
     *         Column
     * @sample {highcharts} highcharts/plotoptions/series-allowpointselect-pie/
     *         Pie
     * @sample {highmaps} maps/plotoptions/series-allowpointselect/
     *         Map area
     * @sample {highmaps} maps/plotoptions/mapbubble-allowpointselect/
     *         Map bubble
     * @default false
     * @since 1.2.0
     */
    allowPointSelect: false,



    /**
     * If true, a checkbox is displayed next to the legend item to allow
     * selecting the series. The state of the checkbox is determined by
     * the `selected` option.
     *
     * @productdesc {highmaps}
     * Note that if a `colorAxis` is defined, the color axis is represented in
     * the legend, not the series.
     *
     * @type {Boolean}
     * @sample {highcharts} highcharts/plotoptions/series-showcheckbox-true/
     *         Show select box
     * @default false
     * @since 1.2.0
     */
    showCheckbox: false,



    /**
     * Enable or disable the initial animation when a series is displayed.
     * The animation can also be set as a configuration object. Please
     * note that this option only applies to the initial animation of the
     * series itself. For other animations, see [chart.animation](
     * #chart.animation) and the animation parameter under the API methods. The
     * following properties are supported:
     *
     * <dl>
     *
     * <dt>duration</dt>
     *
     * <dd>The duration of the animation in milliseconds.</dd>
     *
     * <dt>easing</dt>
     *
     * <dd>A string reference to an easing function set on the `Math` object.
     * See the _Custom easing function_ demo below.</dd>
     *
     * </dl>
     *
     * Due to poor performance, animation is disabled in old IE browsers
     * for several chart types.
     *
     * @type {Boolean}
     * @sample {highcharts} highcharts/plotoptions/series-animation-disabled/
     *         Animation disabled
     * @sample {highcharts} highcharts/plotoptions/series-animation-slower/
     *         Slower animation
     * @sample {highcharts} highcharts/plotoptions/series-animation-easing/
     *         Custom easing function
     * @sample {highstock} stock/plotoptions/animation-slower/
     *         Slower animation
     * @sample {highstock} stock/plotoptions/animation-easing/
     *         Custom easing function
     * @sample {highmaps} maps/plotoptions/series-animation-true/
     *         Animation enabled on map series
     * @sample {highmaps} maps/plotoptions/mapbubble-animation-false/
     *         Disabled on mapbubble series
     * @default {highcharts} true
     * @default {highstock} true
     * @default {highmaps} false
     */
    animation: {
        duration: 1000
    },

    /**
     * An additional class name to apply to the series' graphical elements. This
     * option does not replace default class names of the graphical element.
     * @type {String}
     * @since 5.0.0
     * @apioption plotOptions.series.className
     */

    /**
     * The main color of the series. In line type series it applies to the
     * line and the point markers unless otherwise specified. In bar type
     * series it applies to the bars unless a color is specified per point.
     * The default value is pulled from the `options.colors` array.
     *
     * In styled mode, the color can be defined by the
     * [colorIndex](#plotOptions.series.colorIndex) option. Also, the series
     * color can be set with the `.highcharts-series`, `.highcharts-color-{n}`,
     * `.highcharts-{type}-series` or `.highcharts-series-{n}` class, or
     * individual classes given by the `className` option.
     *
     * @productdesc {highmaps}
     * In maps, the series color is rarely used, as most choropleth maps use the
     * color to denote the value of each point. The series color can however be
     * used in a map with multiple series holding categorized data.
     *
     * @type {Color}
     * @sample {highcharts} highcharts/plotoptions/series-color-general/
     *         General plot option
     * @sample {highcharts} highcharts/plotoptions/series-color-specific/
     *         One specific series
     * @sample {highcharts} highcharts/plotoptions/series-color-area/
     *         Area color
     * @sample {highmaps} maps/demo/category-map/
     *         Category map by multiple series
     * @apioption plotOptions.series.color
     */

    /**
     * Styled mode only. A specific color index to use for the series, so its
     * graphic representations are given the class name `highcharts-color-{n}`.
     *
     * @type {Number}
     * @since 5.0.0
     * @apioption plotOptions.series.colorIndex
     */


    /**
     * Whether to connect a graph line across null points, or render a gap
     * between the two points on either side of the null.
     *
     * @type {Boolean}
     * @default  false
     * @sample {highcharts} highcharts/plotoptions/series-connectnulls-false/
     *         False by default
     * @sample {highcharts} highcharts/plotoptions/series-connectnulls-true/
     *         True
     * @product highcharts highstock
     * @apioption plotOptions.series.connectNulls
     */


    /**
     * You can set the cursor to "pointer" if you have click events attached
     * to the series, to signal to the user that the points and lines can
     * be clicked.
     *
     * @validvalue [null, "default", "none", "help", "pointer", "crosshair"]
     * @type {String}
     * @see In styled mode, the series cursor can be set with the same classes
     * as listed under [series.color](#plotOptions.series.color).
     * @sample {highcharts} highcharts/plotoptions/series-cursor-line/
     *         On line graph
     * @sample {highcharts} highcharts/plotoptions/series-cursor-column/
     *         On columns
     * @sample {highcharts} highcharts/plotoptions/series-cursor-scatter/
     *         On scatter markers
     * @sample {highstock} stock/plotoptions/cursor/
     *         Pointer on a line graph
     * @sample {highmaps} maps/plotoptions/series-allowpointselect/
     *         Map area
     * @sample {highmaps} maps/plotoptions/mapbubble-allowpointselect/
     *         Map bubble
     * @apioption plotOptions.series.cursor
     */


    /**
     * A name for the dash style to use for the graph, or for some series types
     * the outline of each shape. The value for the `dashStyle` include:
     *
     * *   Solid
     * *   ShortDash
     * *   ShortDot
     * *   ShortDashDot
     * *   ShortDashDotDot
     * *   Dot
     * *   Dash
     * *   LongDash
     * *   DashDot
     * *   LongDashDot
     * *   LongDashDotDot
     *
     * @validvalue ["Solid", "ShortDash", "ShortDot", "ShortDashDot",
     *             "ShortDashDotDot", "Dot", "Dash" ,"LongDash", "DashDot",
     *             "LongDashDot", "LongDashDotDot"]
     * @type {String}
     * @see In styled mode, the [stroke dash-array](http://jsfiddle.net/gh/get/
     * library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/
     * series-dashstyle/) can be set with the same classes as listed under
     * [series.color](#plotOptions.series.color).
     *
     * @sample {highcharts} highcharts/plotoptions/series-dashstyle-all/
     *         Possible values demonstrated
     * @sample {highcharts} highcharts/plotoptions/series-dashstyle/
     *         Chart suitable for printing in black and white
     * @sample {highstock} highcharts/plotoptions/series-dashstyle-all/
     *         Possible values demonstrated
     * @sample {highmaps} highcharts/plotoptions/series-dashstyle-all/
     *         Possible values demonstrated
     * @sample {highmaps} maps/plotoptions/series-dashstyle/
     *         Dotted borders on a map
     * @default Solid
     * @since 2.1
     * @apioption plotOptions.series.dashStyle
     */

    /**
     * Requires the Accessibility module.
     *
     * A description of the series to add to the screen reader information
     * about the series.
     *
     * @type {String}
     * @default undefined
     * @since 5.0.0
     * @apioption plotOptions.series.description
     */





    /**
     * Enable or disable the mouse tracking for a specific series. This
     * includes point tooltips and click events on graphs and points. For
     * large datasets it improves performance.
     *
     * @type {Boolean}
     * @sample {highcharts}
     *         highcharts/plotoptions/series-enablemousetracking-false/
     *         No mouse tracking
     * @sample {highmaps}
     *         maps/plotoptions/series-enablemousetracking-false/
     *         No mouse tracking
     * @default true
     * @apioption plotOptions.series.enableMouseTracking
     */

    /**
     * By default, series are exposed to screen readers as regions. By enabling
     * this option, the series element itself will be exposed in the same
     * way as the data points. This is useful if the series is not used
     * as a grouping entity in the chart, but you still want to attach a
     * description to the series.
     *
     * Requires the Accessibility module.
     *
     * @type {Boolean}
     * @sample highcharts/accessibility/art-grants/
     *         Accessible data visualization
     * @default undefined
     * @since 5.0.12
     * @apioption plotOptions.series.exposeElementToA11y
     */

    /**
     * Whether to use the Y extremes of the total chart width or only the
     * zoomed area when zooming in on parts of the X axis. By default, the
     * Y axis adjusts to the min and max of the visible data. Cartesian
     * series only.
     *
     * @type {Boolean}
     * @default false
     * @since 4.1.6
     * @product highcharts highstock
     * @apioption plotOptions.series.getExtremesFromAll
     */

    /**
     * An id for the series. This can be used after render time to get a
     * pointer to the series object through `chart.get()`.
     *
     * @type {String}
     * @sample {highcharts} highcharts/plotoptions/series-id/ Get series by id
     * @since 1.2.0
     * @apioption series.id
     */

    /**
     * The index of the series in the chart, affecting the internal index
     * in the `chart.series` array, the visible Z index as well as the order
     * in the legend.
     *
     * @type {Number}
     * @default undefined
     * @since 2.3.0
     * @apioption series.index
     */

    /**
     * An array specifying which option maps to which key in the data point
     * array. This makes it convenient to work with unstructured data arrays
     * from different sources.
     *
     * @type {Array<String>}
     * @see [series.data](#series.line.data)
     * @sample {highcharts|highstock} highcharts/series/data-keys/
     *         An extended data array with keys
     * @sample {highcharts|highstock} highcharts/series/data-nested-keys/
     *         Nested keys used to access object properties
     * @since 4.1.6
     * @product highcharts highstock
     * @apioption plotOptions.series.keys
     */

    /**
     * The sequential index of the series in the legend.
     *
     * @sample {highcharts|highstock} highcharts/series/legendindex/
     *         Legend in opposite order
     * @type   {Number}
     * @see    [legend.reversed](#legend.reversed),
     *         [yAxis.reversedStacks](#yAxis.reversedStacks)
     * @apioption series.legendIndex
     */

    /**
     * The line cap used for line ends and line joins on the graph.
     *
     * @validvalue ["round", "square"]
     * @type {String}
     * @default round
     * @product highcharts highstock
     * @apioption plotOptions.series.linecap
     */

    /**
     * The [id](#series.id) of another series to link to. Additionally,
     * the value can be ":previous" to link to the previous series. When
     * two series are linked, only the first one appears in the legend.
     * Toggling the visibility of this also toggles the linked series.
     *
     * @type {String}
     * @sample {highcharts} highcharts/demo/arearange-line/ Linked series
     * @sample {highstock} highcharts/demo/arearange-line/ Linked series
     * @since 3.0
     * @product highcharts highstock
     * @apioption plotOptions.series.linkedTo
     */

    /**
     * The name of the series as shown in the legend, tooltip etc.
     *
     * @type {String}
     * @sample {highcharts} highcharts/series/name/ Series name
     * @sample {highmaps} maps/demo/category-map/ Series name
     * @apioption series.name
     */

    /**
     * The color for the parts of the graph or points that are below the
     * [threshold](#plotOptions.series.threshold).
     *
     * @type {Color}
     * @see In styled mode, a negative color is applied by setting this
     * option to `true` combined with the `.highcharts-negative` class name.
     *
     * @sample {highcharts} highcharts/plotoptions/series-negative-color/
     *         Spline, area and column
     * @sample {highcharts} highcharts/plotoptions/arearange-negativecolor/
     *         Arearange
     * @sample {highcharts} highcharts/css/series-negative-color/
     *         Styled mode
     * @sample {highstock} highcharts/plotoptions/series-negative-color/
     *         Spline, area and column
     * @sample {highstock} highcharts/plotoptions/arearange-negativecolor/
     *         Arearange
     * @sample {highmaps} highcharts/plotoptions/series-negative-color/
     *         Spline, area and column
     * @sample {highmaps} highcharts/plotoptions/arearange-negativecolor/
     *         Arearange
     * @default null
     * @since 3.0
     * @apioption plotOptions.series.negativeColor
     */

    /**
     * Same as [accessibility.pointDescriptionFormatter](
     * #accessibility.pointDescriptionFormatter), but for an individual series.
     * Overrides the chart wide configuration.
     *
     * @type {Function}
     * @since 5.0.12
     * @apioption plotOptions.series.pointDescriptionFormatter
     */

    /**
     * If no x values are given for the points in a series, `pointInterval`
     * defines the interval of the x values. For example, if a series contains
     * one value every decade starting from year 0, set `pointInterval` to
     * `10`. In true `datetime` axes, the `pointInterval` is set in
     * milliseconds.
     *
     * It can be also be combined with `pointIntervalUnit` to draw irregular
     * time intervals.
     *
     * Please note that this options applies to the _series data_, not the
     * interval of the axis ticks, which is independent.
     *
     * @type {Number}
     * @sample {highcharts} highcharts/plotoptions/series-pointstart-datetime/
     *         Datetime X axis
     * @sample {highstock} stock/plotoptions/pointinterval-pointstart/
     *         Using pointStart and pointInterval
     * @default 1
     * @product highcharts highstock
     * @apioption plotOptions.series.pointInterval
     */

    /**
     * On datetime series, this allows for setting the
     * [pointInterval](#plotOptions.series.pointInterval) to irregular time
     * units, `day`, `month` and `year`. A day is usually the same as 24 hours,
     * but `pointIntervalUnit` also takes the DST crossover into consideration
     * when dealing with local time. Combine this option with `pointInterval`
     * to draw weeks, quarters, 6 months, 10 years etc.
     *
     * Please note that this options applies to the _series data_, not the
     * interval of the axis ticks, which is independent.
     *
     * @validvalue [null, "day", "month", "year"]
     * @type {String}
     * @sample {highcharts} highcharts/plotoptions/series-pointintervalunit/
     *         One point a month
     * @sample {highstock} highcharts/plotoptions/series-pointintervalunit/
     *         One point a month
     * @since 4.1.0
     * @product highcharts highstock
     * @apioption plotOptions.series.pointIntervalUnit
     */

    /**
     * Possible values: `null`, `"on"`, `"between"`.
     *
     * In a column chart, when pointPlacement is `"on"`, the point will
     * not create any padding of the X axis. In a polar column chart this
     * means that the first column points directly north. If the pointPlacement
     * is `"between"`, the columns will be laid out between ticks. This
     * is useful for example for visualising an amount between two points
     * in time or in a certain sector of a polar chart.
     *
     * Since Highcharts 3.0.2, the point placement can also be numeric,
     * where 0 is on the axis value, -0.5 is between this value and the
     * previous, and 0.5 is between this value and the next. Unlike the
     * textual options, numeric point placement options won't affect axis
     * padding.
     *
     * Note that pointPlacement needs a [pointRange](
     * #plotOptions.series.pointRange) to work. For column series this is
     * computed, but for line-type series it needs to be set.
     *
     * Defaults to `null` in cartesian charts, `"between"` in polar charts.
     *
     * @validvalue [null, "on", "between"]
     * @type {String|Number}
     * @see [xAxis.tickmarkPlacement](#xAxis.tickmarkPlacement)
     * @sample {highcharts|highstock}
     *         highcharts/plotoptions/series-pointplacement-between/
     *         Between in a column chart
     * @sample {highcharts|highstock}
     *         highcharts/plotoptions/series-pointplacement-numeric/
     *         Numeric placement for custom layout
     * @default null
     * @since 2.3.0
     * @product highcharts highstock
     * @apioption plotOptions.series.pointPlacement
     */

    /**
     * If no x values are given for the points in a series, pointStart defines
     * on what value to start. For example, if a series contains one yearly
     * value starting from 1945, set pointStart to 1945.
     *
     * @type {Number}
     * @sample {highcharts} highcharts/plotoptions/series-pointstart-linear/
     *         Linear
     * @sample {highcharts} highcharts/plotoptions/series-pointstart-datetime/
     *         Datetime
     * @sample {highstock} stock/plotoptions/pointinterval-pointstart/
     *         Using pointStart and pointInterval
     * @default 0
     * @product highcharts highstock
     * @apioption plotOptions.series.pointStart
     */

    /**
     * Whether to select the series initially. If `showCheckbox` is true,
     * the checkbox next to the series name in the legend will be checked for a
     * selected series.
     *
     * @type {Boolean}
     * @sample {highcharts} highcharts/plotoptions/series-selected/
     *         One out of two series selected
     * @default false
     * @since 1.2.0
     * @apioption plotOptions.series.selected
     */

    /**
     * Whether to apply a drop shadow to the graph line. Since 2.3 the shadow
     * can be an object configuration containing `color`, `offsetX`, `offsetY`,
     *  `opacity` and `width`.
     *
     * @type {Boolean|Object}
     * @sample {highcharts} highcharts/plotoptions/series-shadow/ Shadow enabled
     * @default false
     * @apioption plotOptions.series.shadow
     */

    /**
     * Whether to display this particular series or series type in the legend.
     * The default value is `true` for standalone series, `false` for linked
     * series.
     *
     * @type {Boolean}
     * @sample {highcharts} highcharts/plotoptions/series-showinlegend/
     *         One series in the legend, one hidden
     * @default true
     * @apioption plotOptions.series.showInLegend
     */

    /**
     * If set to `True`, the accessibility module will skip past the points
     * in this series for keyboard navigation.
     *
     * @type {Boolean}
     * @since 5.0.12
     * @apioption plotOptions.series.skipKeyboardNavigation
     */

    /**
     * This option allows grouping series in a stacked chart. The stack
     * option can be a string or a number or anything else, as long as the
     * grouped series' stack options match each other.
     *
     * @type {String}
     * @sample {highcharts} highcharts/series/stack/ Stacked and grouped columns
     * @default null
     * @since 2.1
     * @product highcharts highstock
     * @apioption series.stack
     */

    /**
     * Whether to stack the values of each series on top of each other.
     * Possible values are `null` to disable, `"normal"` to stack by value or
     * `"percent"`. When stacking is enabled, data must be sorted in ascending
     * X order. A special stacking option is with the streamgraph series type,
     * where the stacking option is set to `"stream"`.
     *
     * @validvalue [null, "normal", "percent"]
     * @type {String}
     * @see [yAxis.reversedStacks](#yAxis.reversedStacks)
     * @sample {highcharts} highcharts/plotoptions/series-stacking-line/
     *         Line
     * @sample {highcharts} highcharts/plotoptions/series-stacking-column/
     *         Column
     * @sample {highcharts} highcharts/plotoptions/series-stacking-bar/
     *         Bar
     * @sample {highcharts} highcharts/plotoptions/series-stacking-area/
     *         Area
     * @sample {highcharts} highcharts/plotoptions/series-stacking-percent-line/
     *         Line
     * @sample {highcharts}
     *         highcharts/plotoptions/series-stacking-percent-column/
     *         Column
     * @sample {highcharts} highcharts/plotoptions/series-stacking-percent-bar/
     *         Bar
     * @sample {highcharts} highcharts/plotoptions/series-stacking-percent-area/
     *         Area
     * @sample {highstock} stock/plotoptions/stacking/
     *         Area
     * @default null
     * @product highcharts highstock
     * @apioption plotOptions.series.stacking
     */

    /**
     * Whether to apply steps to the line. Possible values are `left`, `center`
     * and `right`.
     *
     * @validvalue [null, "left", "center", "right"]
     * @type {String}
     * @sample {highcharts} highcharts/plotoptions/line-step/
     *         Different step line options
     * @sample {highcharts} highcharts/plotoptions/area-step/
     *         Stepped, stacked area
     * @sample {highstock} stock/plotoptions/line-step/
     *         Step line
     * @default {highcharts} null
     * @default {highstock} false
     * @since 1.2.5
     * @product highcharts highstock
     * @apioption plotOptions.series.step
     */

    /**
     * The threshold, also called zero level or base level. For line type
     * series this is only used in conjunction with
     * [negativeColor](#plotOptions.series.negativeColor).
     *
     * @type {Number}
     * @see [softThreshold](#plotOptions.series.softThreshold).
     * @default 0
     * @since 3.0
     * @product highcharts highstock
     * @apioption plotOptions.series.threshold
     */

    /**
     * The type of series, for example `line` or `column`. By default, the
     * series type is inherited from [chart.type](#chart.type), so unless the
     * chart is a combination of series types, there is no need to set it on the
     * series level.
     *
     * @validvalue [null, "line", "spline", "column", "area", "areaspline",
     *       "pie", "arearange", "areasplinerange", "boxplot", "bubble",
     *       "columnrange", "errorbar", "funnel", "gauge", "scatter",
     *       "waterfall"]
     * @type {String}
     * @sample {highcharts} highcharts/series/type/
     *         Line and column in the same chart
     * @sample {highmaps} maps/demo/mapline-mappoint/
     *         Multiple types in the same map
     * @apioption series.type
     */

    /**
     * Set the initial visibility of the series.
     *
     * @type {Boolean}
     * @sample {highcharts} highcharts/plotoptions/series-visible/
     *         Two series, one hidden and one visible
     * @sample {highstock} stock/plotoptions/series-visibility/
     *         Hidden series
     * @default true
     * @apioption plotOptions.series.visible
     */

    /**
     * When using dual or multiple x axes, this number defines which xAxis
     * the particular series is connected to. It refers to either the [axis
     * id](#xAxis.id) or the index of the axis in the xAxis array, with
     * 0 being the first.
     *
     * @type {Number|String}
     * @default 0
     * @product highcharts highstock
     * @apioption series.xAxis
     */

    /**
     * When using dual or multiple y axes, this number defines which yAxis
     * the particular series is connected to. It refers to either the [axis
     * id](#yAxis.id) or the index of the axis in the yAxis array, with
     * 0 being the first.
     *
     * @type {Number|String}
     * @sample {highcharts} highcharts/series/yaxis/
     *         Apply the column series to the secondary Y axis
     * @default 0
     * @product highcharts highstock
     * @apioption series.yAxis
     */

    /**
     * Defines the Axis on which the zones are applied.
     *
     * @type {String}
     * @see [zones](#plotOptions.series.zones)
     * @sample {highcharts} highcharts/series/color-zones-zoneaxis-x/
     *         Zones on the X-Axis
     * @sample {highstock} highcharts/series/color-zones-zoneaxis-x/
     *         Zones on the X-Axis
     * @default y
     * @since 4.1.0
     * @product highcharts highstock
     * @apioption plotOptions.series.zoneAxis
     */

    /**
     * Define the visual z index of the series.
     *
     * @type {Number}
     * @sample {highcharts} highcharts/plotoptions/series-zindex-default/
     *         With no z index, the series defined last are on top
     * @sample {highcharts} highcharts/plotoptions/series-zindex/
     *         With a z index, the series with the highest z index is on top
     * @sample {highstock} highcharts/plotoptions/series-zindex-default/
     *         With no z index, the series defined last are on top
     * @sample {highstock} highcharts/plotoptions/series-zindex/
     *         With a z index, the series with the highest z index is on top
     * @product highcharts highstock
     * @apioption series.zIndex
     */

    /**
     * General event handlers for the series items. These event hooks can also
     * be attached to the series at run time using the `Highcharts.addEvent`
     * function.
     */

    /**
     * Fires after the series has finished its initial animation, or in
     * case animation is disabled, immediately as the series is displayed.
     *
     * @type {Function}
     * @context Series
     * @sample {highcharts}
     *         highcharts/plotoptions/series-events-afteranimate/
     *         Show label after animate
     * @sample {highstock}
     *         highcharts/plotoptions/series-events-afteranimate/
     *         Show label after animate
     * @since 4.0
     * @product highcharts highstock
     * @apioption plotOptions.series.events.afterAnimate
     */

    /**
     * Fires when the checkbox next to the series' name in the legend is
     * clicked. One parameter, `event`, is passed to the function. The state
     * of the checkbox is found by `event.checked`. The checked item is
     * found by `event.item`. Return `false` to prevent the default action
     * which is to toggle the select state of the series.
     *
     * @type {Function}
     * @context Series
     * @sample {highcharts}
     *         highcharts/plotoptions/series-events-checkboxclick/
     *         Alert checkbox status
     * @since 1.2.0
     * @apioption plotOptions.series.events.checkboxClick
     */

    /**
     * Fires when the series is clicked. One parameter, `event`, is passed
     * to the function, containing common event information. Additionally,
     * `event.point` holds a pointer to the nearest point on the graph.
     *
     * @type {Function}
     * @context Series
     * @sample {highcharts} highcharts/plotoptions/series-events-click/
     *         Alert click info
     * @sample {highstock} stock/plotoptions/series-events-click/
     *         Alert click info
     * @sample {highmaps} maps/plotoptions/series-events-click/
     *         Display click info in subtitle
     * @apioption plotOptions.series.events.click
     */

    /**
     * Fires when the series is hidden after chart generation time, either
     * by clicking the legend item or by calling `.hide()`.
     *
     * @type {Function}
     * @context Series
     * @sample {highcharts} highcharts/plotoptions/series-events-hide/
     *         Alert when the series is hidden by clicking the legend item
     * @since 1.2.0
     * @apioption plotOptions.series.events.hide
     */

    /**
     * Fires when the legend item belonging to the series is clicked. One
     * parameter, `event`, is passed to the function. The default action
     * is to toggle the visibility of the series. This can be prevented
     * by returning `false` or calling `event.preventDefault()`.
     *
     * @type {Function}
     * @context Series
     * @sample {highcharts}
     *         highcharts/plotoptions/series-events-legenditemclick/
     *         Confirm hiding and showing
     * @apioption plotOptions.series.events.legendItemClick
     */

    /**
     * Fires when the mouse leaves the graph. One parameter, `event`, is
     * passed to the function, containing common event information. If the
     * [stickyTracking](#plotOptions.series) option is true, `mouseOut`
     * doesn't happen before the mouse enters another graph or leaves the
     * plot area.
     *
     * @type {Function}
     * @context Series
     * @sample {highcharts}
     *         highcharts/plotoptions/series-events-mouseover-sticky/
     *         With sticky tracking    by default
     * @sample {highcharts}
     *         highcharts/plotoptions/series-events-mouseover-no-sticky/
     *         Without sticky tracking
     * @apioption plotOptions.series.events.mouseOut
     */

    /**
     * Fires when the mouse enters the graph. One parameter, `event`, is
     * passed to the function, containing common event information.
     *
     * @type {Function}
     * @context Series
     * @sample {highcharts}
     *         highcharts/plotoptions/series-events-mouseover-sticky/
     *         With sticky tracking by default
     * @sample {highcharts}
     *         highcharts/plotoptions/series-events-mouseover-no-sticky/
     *         Without sticky tracking
     * @apioption plotOptions.series.events.mouseOver
     */

    /**
     * Fires when the series is shown after chart generation time, either
     * by clicking the legend item or by calling `.show()`.
     *
     * @type {Function}
     * @context Series
     * @sample {highcharts} highcharts/plotoptions/series-events-show/
     *         Alert when the series is shown by clicking the legend item.
     * @since 1.2.0
     * @apioption plotOptions.series.events.show
     */
    events: {},



    /**
     * Options for the point markers of line-like series. Properties like
     * `fillColor`, `lineColor` and `lineWidth` define the visual appearance
     * of the markers. Other series types, like column series, don't have
     * markers, but have visual options on the series level instead.
     *
     * In styled mode, the markers can be styled with the `.highcharts-point`,
     * `.highcharts-point-hover` and `.highcharts-point-select`
     * class names.
     */
    marker: {
        

        /**
         * Enable or disable the point marker. If `null`, the markers are hidden
         * when the data is dense, and shown for more widespread data points.
         *
         * @type {Boolean}
         * @sample {highcharts} highcharts/plotoptions/series-marker-enabled/
         *         Disabled markers
         * @sample {highcharts}
         *         highcharts/plotoptions/series-marker-enabled-false/
         *         Disabled in normal state but enabled on hover
         * @sample {highstock} stock/plotoptions/series-marker/
         *         Enabled markers
         * @default {highcharts} null
         * @default {highstock} false
         * @apioption plotOptions.series.marker.enabled
         */

        /**
         * Image markers only. Set the image width explicitly. When using this
         * option, a `width` must also be set.
         *
         * @type {Number}
         * @sample {highcharts}
         *         highcharts/plotoptions/series-marker-width-height/
         *         Fixed width and height
         * @sample {highstock}
         *         highcharts/plotoptions/series-marker-width-height/
         *         Fixed width and height
         * @default null
         * @since 4.0.4
         * @apioption plotOptions.series.marker.height
         */

        /**
         * A predefined shape or symbol for the marker. When null, the symbol
         * is pulled from options.symbols. Other possible values are "circle",
         * "square", "diamond", "triangle" and "triangle-down".
         *
         * Additionally, the URL to a graphic can be given on this form:
         * "url(graphic.png)". Note that for the image to be applied to exported
         * charts, its URL needs to be accessible by the export server.
         *
         * Custom callbacks for symbol path generation can also be added to
         * `Highcharts.SVGRenderer.prototype.symbols`. The callback is then
         * used by its method name, as shown in the demo.
         *
         * @validvalue [null, "circle", "square", "diamond", "triangle",
         *         "triangle-down"]
         * @type {String}
         * @sample {highcharts} highcharts/plotoptions/series-marker-symbol/
         *         Predefined, graphic and custom markers
         * @sample {highstock} highcharts/plotoptions/series-marker-symbol/
         *         Predefined, graphic and custom markers
         * @default null
         * @apioption plotOptions.series.marker.symbol
         */

        /**
         * The threshold for how dense the point markers should be before they
         * are hidden, given that `enabled` is not defined. The number indicates
         * the horizontal distance between the two closest points in the series,
         * as multiples of the `marker.radius`. In other words, the default
         * value of 2 means points are hidden if overlapping horizontally.
         *
         * @since  6.0.5
         * @sample highcharts/plotoptions/series-marker-enabledthreshold
         *         A higher threshold
         */
        enabledThreshold: 2,

        /**
         * The radius of the point marker.
         *
         * @sample {highcharts} highcharts/plotoptions/series-marker-radius/
         *         Bigger markers
         */
        radius: 4,

        /**
         * Image markers only. Set the image width explicitly. When using this
         * option, a `height` must also be set.
         *
         * @type {Number}
         * @sample {highcharts}
         *         highcharts/plotoptions/series-marker-width-height/
         *         Fixed width and height
         * @sample {highstock}
         *         highcharts/plotoptions/series-marker-width-height/
         *         Fixed width and height
         * @default null
         * @since 4.0.4
         * @apioption plotOptions.series.marker.width
         */


        /**
         * States for a single point marker.
         */
        states: {

            /**
             * The normal state of a single point marker. Currently only used
             * for setting animation when returning to normal state from hover.
             *
             * @type {Object}
             */
            normal: {
                /**
                 * Animation when returning to normal state after hovering.
                 *
                 * @type {Boolean|Object}
                 */
                animation: true
            },

            /**
             * The hover state for a single point marker.
             *
             * @type {Object}
             */
            hover: {

                /**
                 * Animation when hovering over the marker.
                 *
                 * @type {Boolean|Object}
                 */
                animation: {
                    duration: 50
                },

                /**
                 * Enable or disable the point marker.
                 *
                 * @sample {highcharts}
                 *         highcharts/plotoptions/series-marker-states-hover-enabled/
                 *         Disabled hover state
                 */
                enabled: true,

                /**
                 * The fill color of the marker in hover state. When `null`, the
                 * series' or point's fillColor for normal state is used.
                 *
                 * @type      {Color}
                 * @default   null
                 * @apioption plotOptions.series.marker.states.hover.fillColor
                 */

                /**
                 * The color of the point marker's outline. When `null`, the
                 * series' or point's lineColor for normal state is used.
                 *
                 * @type      {Color}
                 * @sample    {highcharts}
                 *            highcharts/plotoptions/series-marker-states-hover-linecolor/
                 *            White fill color, black line color
                 * @default   null
                 * @apioption plotOptions.series.marker.states.hover.lineColor
                 */

                /**
                 * The width of the point marker's outline. When `null`, the
                 * series' or point's lineWidth for normal state is used.
                 *
                 * @type      {Number}
                 * @sample    {highcharts}
                 *            highcharts/plotoptions/series-marker-states-hover-linewidth/
                 *            3px line width
                 * @default   null
                 * @apioption plotOptions.series.marker.states.hover.lineWidth
                 */

                /**
                 * The radius of the point marker. In hover state, it defaults
                 * to the normal state's radius + 2 as per the [radiusPlus](
                 * #plotOptions.series.marker.states.hover.radiusPlus)
                 * option.
                 *
                 * @type {Number}
                 * @sample {highcharts}
                 *         highcharts/plotoptions/series-marker-states-hover-radius/
                 *         10px radius
                 * @apioption plotOptions.series.marker.states.hover.radius
                 */

                /**
                 * The number of pixels to increase the radius of the hovered
                 * point.
                 *
                 * @sample {highcharts}
                 *         highcharts/plotoptions/series-states-hover-linewidthplus/
                 *         5 pixels greater radius on hover
                 * @sample {highstock}
                 *         highcharts/plotoptions/series-states-hover-linewidthplus/
                 *         5 pixels greater radius on hover
                 * @since 4.0.3
                 */
                radiusPlus: 2

                
            }
            
        }
    },



    /**
     * Properties for each single point.
     */
    point: {


        /**
         * Fires when a point is clicked. One parameter, `event`, is passed
         * to the function, containing common event information.
         *
         * If the `series.allowPointSelect` option is true, the default
         * action for the point's click event is to toggle the point's
         * select state. Returning `false` cancels this action.
         *
         * @type {Function}
         * @context Point
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-click/
         *         Click marker to alert values
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-click-column/
         *         Click column
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-click-url/
         *         Go to URL
         * @sample {highmaps}
         *         maps/plotoptions/series-point-events-click/
         *         Click marker to display values
         * @sample {highmaps}
         *         maps/plotoptions/series-point-events-click-url/
         *         Go to URL
         * @apioption plotOptions.series.point.events.click
         */

        /**
         * Fires when the mouse leaves the area close to the point. One
         * parameter, `event`, is passed to the function, containing common
         * event information.
         *
         * @type {Function}
         * @context Point
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-mouseover/
         *         Show values in the chart's corner on mouse over
         * @apioption plotOptions.series.point.events.mouseOut
         */

        /**
         * Fires when the mouse enters the area close to the point. One
         * parameter, `event`, is passed to the function, containing common
         * event information.
         *
         * @type {Function}
         * @context Point
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-mouseover/
         *         Show values in the chart's corner on mouse over
         * @apioption plotOptions.series.point.events.mouseOver
         */

        /**
         * Fires when the point is removed using the `.remove()` method. One
         * parameter, `event`, is passed to the function. Returning `false`
         * cancels the operation.
         *
         * @type {Function}
         * @context Point
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-remove/
         *         Remove point and confirm
         * @since 1.2.0
         * @apioption plotOptions.series.point.events.remove
         */

        /**
         * Fires when the point is selected either programmatically or
         * following a click on the point. One parameter, `event`, is passed
         * to the function. Returning `false` cancels the operation.
         *
         * @type {Function}
         * @context Point
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-select/
         *         Report the last selected point
         * @sample {highmaps}
         *         maps/plotoptions/series-allowpointselect/
         *         Report select and unselect
         * @since 1.2.0
         * @apioption plotOptions.series.point.events.select
         */

        /**
         * Fires when the point is unselected either programmatically or
         * following a click on the point. One parameter, `event`, is passed
         * to the function.
         *  Returning `false` cancels the operation.
         *
         * @type {Function}
         * @context Point
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-unselect/
         *         Report the last unselected point
         * @sample {highmaps}
         *         maps/plotoptions/series-allowpointselect/
         *         Report select and unselect
         * @since 1.2.0
         * @apioption plotOptions.series.point.events.unselect
         */

        /**
         * Fires when the point is updated programmatically through the
         * `.update()` method. One parameter, `event`, is passed to the
         * function. The new point options can be accessed through
         * `event.options`. Returning `false` cancels the operation.
         *
         * @type {Function}
         * @context Point
         * @sample {highcharts}
         *         highcharts/plotoptions/series-point-events-update/
         *         Confirm point updating
         * @since 1.2.0
         * @apioption plotOptions.series.point.events.update
         */

        /**
         * Events for each single point.
         */
        events: {}
    },



    /**
     * Options for the series data labels, appearing next to each data
     * point.
     *
     * In styled mode, the data labels can be styled wtih the
     * `.highcharts-data-label-box` and `.highcharts-data-label` class names
     * ([see example](http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/series-datalabels)).
     */
    dataLabels: {


        /**
         * The alignment of the data label compared to the point. If `right`,
         * the right side of the label should be touching the point. For
         * points with an extent, like columns, the alignments also dictates
         * how to align it inside the box, as given with the
         * [inside](#plotOptions.column.dataLabels.inside) option. Can be one of
         * `left`, `center` or `right`.
         *
         * @validvalue ["left", "center", "right"]
         * @type {String}
         * @sample {highcharts}
         *         highcharts/plotoptions/series-datalabels-align-left/
         *         Left aligned
         * @default center
         */
        align: 'center',


        /**
         * Whether to allow data labels to overlap. To make the labels less
         * sensitive for overlapping, the [dataLabels.padding](
         * #plotOptions.series.dataLabels.padding) can be set to 0.
         *
         * @type {Boolean}
         * @sample highcharts/plotoptions/series-datalabels-allowoverlap-false/
         *         Don't allow overlap
         * @default false
         * @since 4.1.0
         * @apioption plotOptions.series.dataLabels.allowOverlap
         */


        /**
         * The border radius in pixels for the data label.
         *
         * @type {Number}
         * @sample {highcharts} highcharts/plotoptions/series-datalabels-box/
         *         Data labels box options
         * @sample {highstock} highcharts/plotoptions/series-datalabels-box/
         *         Data labels box options
         * @sample {highmaps} maps/plotoptions/series-datalabels-box/
         *         Data labels box options
         * @default 0
         * @since 2.2.1
         * @apioption plotOptions.series.dataLabels.borderRadius
         */


        /**
         * The border width in pixels for the data label.
         *
         * @type {Number}
         * @sample {highcharts} highcharts/plotoptions/series-datalabels-box/
         *         Data labels box options
         * @sample {highstock} highcharts/plotoptions/series-datalabels-box/
         *         Data labels box options
         * @default 0
         * @since 2.2.1
         * @apioption plotOptions.series.dataLabels.borderWidth
         */

        /**
         * A class name for the data label. Particularly in styled mode, this
         * can be used to give each series' or point's data label unique
         * styling. In addition to this option, a default color class name is
         * added so that we can give the labels a
         * [contrast text shadow](http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/data-label-contrast/).
         *
         * @type {String}
         * @sample {highcharts} highcharts/css/series-datalabels/ Styling by CSS
         * @sample {highstock} highcharts/css/series-datalabels/ Styling by CSS
         * @sample {highmaps} highcharts/css/series-datalabels/ Styling by CSS
         * @since 5.0.0
         * @apioption plotOptions.series.dataLabels.className
         */

        /**
         * The text color for the data labels. Defaults to `null`. For certain
         * series types, like column or map, the data labels can be drawn inside
         * the points. In this case the data label will be drawn with maximum
         * contrast by default. Additionally, it will be given a `text-outline`
         * style with the opposite color, to further increase the contrast. This
         * can be overridden by setting the `text-outline` style to `none` in
         * the `dataLabels.style` option.
         *
         * @type {Color}
         * @sample {highcharts} highcharts/plotoptions/series-datalabels-color/
         *         Red data labels
         * @sample {highmaps} maps/demo/color-axis/
         *         White data labels
         * @apioption plotOptions.series.dataLabels.color
         */

        /**
         * Whether to hide data labels that are outside the plot area. By
         * default, the data label is moved inside the plot area according to
         * the [overflow](#plotOptions.series.dataLabels.overflow) option.
         *
         * @type {Boolean}
         * @default true
         * @since 2.3.3
         * @apioption plotOptions.series.dataLabels.crop
         */

        /**
         * Whether to defer displaying the data labels until the initial series
         * animation has finished.
         *
         * @type {Boolean}
         * @default true
         * @since 4.0
         * @product highcharts highstock
         * @apioption plotOptions.series.dataLabels.defer
         */

        /**
         * Enable or disable the data labels.
         *
         * @type {Boolean}
         * @sample {highcharts}
         *         highcharts/plotoptions/series-datalabels-enabled/
         *         Data labels enabled
         * @sample {highmaps} maps/demo/color-axis/ Data labels enabled
         * @default false
         * @apioption plotOptions.series.dataLabels.enabled
         */

        /**
         * A [format string](http://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting)
         * for the data label. Available variables are the same as for
         * `formatter`.
         *
         * @type {String}
         * @sample {highcharts|highstock}
         *         highcharts/plotoptions/series-datalabels-format/
         *         Add a unit
         * @sample {highmaps}
         *         maps/plotoptions/series-datalabels-format/
         *         Formatted value in the data label
         * @default {highcharts} {y}
         * @default {highstock} {y}
         * @default {highmaps} {point.value}
         * @since 3.0
         * @apioption plotOptions.series.dataLabels.format
         */

        /**
         * Callback JavaScript function to format the data label. Note that if a
         * `format` is defined, the format takes precedence and the formatter is
         * ignored. Available data are:
         *
         * <table>
         *
         * <tbody>
         *
         * <tr>
         *
         * <td>`this.percentage`</td>
         *
         * <td>Stacked series and pies only. The point's percentage of the
         * total.</td>
         *
         * </tr>
         *
         * <tr>
         *
         * <td>`this.point`</td>
         *
         * <td>The point object. The point name, if defined, is available
         * through `this.point.name`.</td>
         *
         * </tr>
         *
         * <tr>
         *
         * <td>`this.series`:</td>
         *
         * <td>The series object. The series name is available through
         * `this.series.name`.</td>
         *
         * </tr>
         *
         * <tr>
         *
         * <td>`this.total`</td>
         *
         * <td>Stacked series only. The total value at this point's x value.
         * </td>
         *
         * </tr>
         *
         * <tr>
         *
         * <td>`this.x`:</td>
         *
         * <td>The x value.</td>
         *
         * </tr>
         *
         * <tr>
         *
         * <td>`this.y`:</td>
         *
         * <td>The y value.</td>
         *
         * </tr>
         *
         * </tbody>
         *
         * </table>
         *
         * @type {Function}
         * @sample {highmaps} maps/plotoptions/series-datalabels-format/
         *         Formatted value
         */
        formatter: function () {
            return this.y === null ? '' : H.numberFormat(this.y, -1);
        },
        

        /**
         * For points with an extent, like columns or map areas, whether to
         * align the data label inside the box or to the actual value point.
         * Defaults to `false` in most cases, `true` in stacked columns.
         *
         * @type {Boolean}
         * @since 3.0
         * @apioption plotOptions.series.dataLabels.inside
         */

        /**
         * How to handle data labels that flow outside the plot area. The
         * default is `justify`, which aligns them inside the plot area. For
         * columns and bars, this means it will be moved inside the bar. To
         * display data labels outside the plot area, set `crop` to `false` and
         * `overflow` to `"none"`.
         *
         * @validvalue ["justify", "none"]
         * @type {String}
         * @default justify
         * @since 3.0.6
         * @apioption plotOptions.series.dataLabels.overflow
         */

        /**
         * Text rotation in degrees. Note that due to a more complex structure,
         * backgrounds, borders and padding will be lost on a rotated data
         * label.
         *
         * @type {Number}
         * @sample {highcharts}
         *         highcharts/plotoptions/series-datalabels-rotation/
         *         Vertical labels
         * @default 0
         * @apioption plotOptions.series.dataLabels.rotation
         */

        /**
         * Whether to
         * [use HTML](http://www.highcharts.com/docs/chart-concepts/labels-and-string-formatting#html)
         * to render the labels.
         *
         * @type {Boolean}
         * @default false
         * @apioption plotOptions.series.dataLabels.useHTML
         */

        /**
         * The vertical alignment of a data label. Can be one of `top`, `middle`
         * or `bottom`. The default value depends on the data, for instance
         * in a column chart, the label is above positive values and below
         * negative values.
         *
         * @validvalue ["top", "middle", "bottom"]
         * @type {String}
         * @since 2.3.3
         */
        verticalAlign: 'bottom', // above singular point


        /**
         * The x position offset of the label relative to the point in pixels.
         *
         * @type {Number}
         * @sample {highcharts}
         *         highcharts/plotoptions/series-datalabels-rotation/
         *         Vertical and positioned
         * @default 0
         */
        x: 0,


        /**
         * The y position offset of the label relative to the point in pixels.
         *
         * @type {Number}
         * @sample {highcharts}
         *         highcharts/plotoptions/series-datalabels-rotation/
         *         Vertical and positioned
         * @default -6
         */
        y: 0,


        /**
         * When either the `borderWidth` or the `backgroundColor` is set,
         * this is the padding within the box.
         *
         * @type {Number}
         * @sample {highcharts|highstock}
         *         highcharts/plotoptions/series-datalabels-box/
         *         Data labels box options
         * @sample {highmaps}
         *         maps/plotoptions/series-datalabels-box/
         *         Data labels box options
         * @default {highcharts} 5
         * @default {highstock} 5
         * @default {highmaps} 0
         * @since 2.2.1
         */
        padding: 5
    },

    /**
     * When the series contains less points than the crop threshold, all
     * points are drawn, even if the points fall outside the visible plot
     * area at the current zoom. The advantage of drawing all points (including
     * markers and columns), is that animation is performed on updates.
     * On the other hand, when the series contains more points than the
     * crop threshold, the series data is cropped to only contain points
     * that fall within the plot area. The advantage of cropping away invisible
     * points is to increase performance on large series.
     *
     * @type {Number}
     * @default 300
     * @since 2.2
     * @product highcharts highstock
     */
    cropThreshold: 300,



    /**
     * The width of each point on the x axis. For example in a column chart
     * with one value each day, the pointRange would be 1 day (= 24 * 3600
     * * 1000 milliseconds). This is normally computed automatically, but
     * this option can be used to override the automatic value.
     *
     * @type {Number}
     * @default 0
     * @product highstock
     */
    pointRange: 0,

    /**
     * When this is true, the series will not cause the Y axis to cross
     * the zero plane (or [threshold](#plotOptions.series.threshold) option)
     * unless the data actually crosses the plane.
     *
     * For example, if `softThreshold` is `false`, a series of 0, 1, 2,
     * 3 will make the Y axis show negative values according to the `minPadding`
     * option. If `softThreshold` is `true`, the Y axis starts at 0.
     *
     * @type {Boolean}
     * @default true
     * @since 4.1.9
     * @product highcharts highstock
     */
    softThreshold: true,



    /**
     * A wrapper object for all the series options in specific states.
     *
     * @type {plotOptions.series.states}
     */
    states: {

        /**
         * The normal state of a series, or for point items in column, pie and
         * similar series. Currently only used for setting animation when
         * returning to normal state from hover.
         * @type {Object}
         */
        normal: {
            /**
             * Animation when returning to normal state after hovering.
             * @type {Boolean|Object}
             */
            animation: true
        },

        /**
         * Options for the hovered series. These settings override the normal
         * state options when a series is moused over or touched.
         *
         */
        hover: {

            /**
             * Enable separate styles for the hovered series to visualize that
             * the user hovers either the series itself or the legend. .
             *
             * @type {Boolean}
             * @sample {highcharts}
             *         highcharts/plotoptions/series-states-hover-enabled/
             *         Line
             * @sample {highcharts}
             *         highcharts/plotoptions/series-states-hover-enabled-column/
             *         Column
             * @sample {highcharts}
             *         highcharts/plotoptions/series-states-hover-enabled-pie/
             *         Pie
             * @default true
             * @since 1.2
             * @apioption plotOptions.series.states.hover.enabled
             */


            /**
             * Animation setting for hovering the graph in line-type series.
             *
             * @type {Boolean|Object}
             * @default { "duration": 50 }
             * @since 5.0.8
             * @product highcharts
             */
            animation: {
                /**
                 * The duration of the hover animation in milliseconds. By
                 * default the hover state animates quickly in, and slowly back
                 * to normal.
                 */
                duration: 50
            },

            /**
             * Pixel width of the graph line. By default this property is
             * undefined, and the `lineWidthPlus` property dictates how much
             * to increase the linewidth from normal state.
             *
             * @type {Number}
             * @sample {highcharts}
             *         highcharts/plotoptions/series-states-hover-linewidth/
             *         5px line on hover
             * @default undefined
             * @product highcharts highstock
             * @apioption plotOptions.series.states.hover.lineWidth
             */


            /**
             * The additional line width for the graph of a hovered series.
             *
             * @type {Number}
             * @sample {highcharts}
             *         highcharts/plotoptions/series-states-hover-linewidthplus/
             *         5 pixels wider
             * @sample {highstock}
             *         highcharts/plotoptions/series-states-hover-linewidthplus/
             *         5 pixels wider
             * @default 1
             * @since 4.0.3
             * @product highcharts highstock
             */
            lineWidthPlus: 1,



            /**
             * In Highcharts 1.0, the appearance of all markers belonging to the
             * hovered series. For settings on the hover state of the individual
             * point, see
             * [marker.states.hover](#plotOptions.series.marker.states.hover).
             *
             * @extends plotOptions.series.marker
             * @deprecated
             * @product highcharts highstock
             */
            marker: {
                // lineWidth: base + 1,
     