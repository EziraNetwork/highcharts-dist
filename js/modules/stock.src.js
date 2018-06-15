/**
 * @license Highcharts JS v6.1.0-modified (2018-06-15)
 * Highstock as a plugin for Highcharts
 *
 * (c) 2017 Torstein Honsi
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
		/* eslint max-len: 0 */
		var addEvent = H.addEvent,
		    Axis = H.Axis,
		    Chart = H.Chart,
		    css = H.css,
		    defined = H.defined,
		    each = H.each,
		    extend = H.extend,
		    noop = H.noop,
		    pick = H.pick,
		    Series = H.Series,
		    timeUnits = H.timeUnits,
		    wrap = H.wrap;

		/* ****************************************************************************
		 * Start ordinal axis logic                                                   *
		 *****************************************************************************/


		wrap(Series.prototype, 'init', function (proceed) {
		    var series = this,
		        xAxis;

		    // call the original function
		    proceed.apply(this, Array.prototype.slice.call(arguments, 1));

		    xAxis = series.xAxis;

		    // Destroy the extended ordinal index on updated data
		    if (xAxis && xAxis.options.ordinal) {
		        addEvent(series, 'updatedData', function () {
		            delete xAxis.ordinalIndex;
		        });
		    }
		});

		/**
		 * In an ordinal axis, there might be areas with dense consentrations of points, then large
		 * gaps between some. Creating equally distributed ticks over this entire range
		 * may lead to a huge number of ticks that will later be removed. So instead, break the
		 * positions up in segments, find the tick positions for each segment then concatenize them.
		 * This method is used from both data grouping logic and X axis tick position logic.
		 */
		wrap(Axis.prototype, 'getTimeTicks', function (proceed, normalizedInterval, min, max, startOfWeek, positions, closestDistance, findHigherRanks) {

		    var start = 0,
		        end,
		        segmentPositions,
		        higherRanks = {},
		        hasCrossedHigherRank,
		        info,
		        posLength,
		        outsideMax,
		        groupPositions = [],
		        lastGroupPosition = -Number.MAX_VALUE,
		        tickPixelIntervalOption = this.options.tickPixelInterval,
		        time = this.chart.time;

		    // The positions are not always defined, for example for ordinal positions when data
		    // has regular interval (#1557, #2090)
		    if ((!this.options.ordinal && !this.options.breaks) || !positions || positions.length < 3 || min === undefined) {
		        return proceed.call(this, normalizedInterval, min, max, startOfWeek);
		    }

		    // Analyze the positions array to split it into segments on gaps larger than 5 times
		    // the closest distance. The closest distance is already found at this point, so
		    // we reuse that instead of computing it again.
		    posLength = positions.length;

		    for (end = 0; end < posLength; end++) {

		        outsideMax = end && positions[end - 1] > max;

		        if (positions[end] < min) { // Set the last position before min
		            start = end;
		        }

		        if (end === posLength - 1 || positions[end + 1] - positions[end] > closestDistance * 5 || outsideMax) {

		            // For each segment, calculate the tick positions from the getTimeTicks utility
		            // function. The interval will be the same regardless of how long the segment is.
		            if (positions[end] > lastGroupPosition) { // #1475

		                segmentPositions = proceed.call(this, normalizedInterval, positions[start], positions[end], startOfWeek);

		                // Prevent duplicate groups, for example for multiple segments within one larger time frame (#1475)
		                while (segmentPositions.length && segmentPositions[0] <= lastGroupPosition) {
		                    segmentPositions.shift();
		                }
		                if (segmentPositions.length) {
		                    lastGroupPosition = segmentPositions[segmentPositions.length - 1];
		                }

		                groupPositions = groupPositions.concat(segmentPositions);
		            }
		            // Set start of next segment
		            start = end + 1;
		        }

		        if (outsideMax) {
		            break;
		        }
		    }

		    // Get the grouping info from the last of the segments. The info is the same for
		    // all segments.
		    info = segmentPositions.info;

		    // Optionally identify ticks with higher rank, for example when the ticks
		    // have crossed midnight.
		    if (findHigherRanks && info.unitRange <= timeUnits.hour) {
		        end = groupPositions.length - 1;

		        // Compare points two by two
		        for (start = 1; start < end; start++) {
		            if (
		                time.dateFormat('%d', groupPositions[start]) !==
		                time.dateFormat('%d', groupPositions[start - 1])
		            ) {
		                higherRanks[groupPositions[start]] = 'day';
		                hasCrossedHigherRank = true;
		            }
		        }

		        // If the complete array has crossed midnight, we want to mark the first
		        // positions also as higher rank
		        if (hasCrossedHigherRank) {
		            higherRanks[groupPositions[0]] = 'day';
		        }
		        info.higherRanks = higherRanks;
		    }

		    // Save the info
		    groupPositions.info = info;



		    // Don't show ticks within a gap in the ordinal axis, where the space between
		    // two points is greater than a portion of the tick pixel interval
		    if (findHigherRanks && defined(tickPixelIntervalOption)) { // check for squashed ticks

		        var length = groupPositions.length,
		            i = length,
		            itemToRemove,
		            translated,
		            translatedArr = [],
		            lastTranslated,
		            medianDistance,
		            distance,
		            distances = [];

		        // Find median pixel distance in order to keep a reasonably even distance between
		        // ticks (#748)
		        while (i--) {
		            translated = this.translate(groupPositions[i]);
		            if (lastTranslated) {
		                distances[i] = lastTranslated - translated;
		            }
		            translatedArr[i] = lastTranslated = translated;
		        }
		        distances.sort();
		        medianDistance = distances[Math.floor(distances.length / 2)];
		        if (medianDistance < tickPixelIntervalOption * 0.6) {
		            medianDistance = null;
		        }

		        // Now loop over again and remove ticks where needed
		        i = groupPositions[length - 1] > max ? length - 1 : length; // #817
		        lastTranslated = undefined;
		        while (i--) {
		            translated = translatedArr[i];
		            distance = Math.abs(lastTranslated - translated);
		            // #4175 - when axis is reversed, the distance, is negative but
		            // tickPixelIntervalOption positive, so we need to compare the same values

		            // Remove ticks that are closer than 0.6 times the pixel interval from the one to the right,
		            // but not if it is close to the median distance (#748).
		            if (lastTranslated && distance < tickPixelIntervalOption * 0.8 &&
		                    (medianDistance === null || distance < medianDistance * 0.8)) {

		                // Is this a higher ranked position with a normal position to the right?
		                if (higherRanks[groupPositions[i]] && !higherRanks[groupPositions[i + 1]]) {

		                    // Yes: remove the lower ranked neighbour to the right
		                    itemToRemove = i + 1;
		                    lastTranslated = translated; // #709

		                } else {

		                    // No: remove this one
		                    itemToRemove = i;
		                }

		                groupPositions.splice(itemToRemove, 1);

		            } else {
		                lastTranslated = translated;
		            }
		        }
		    }
		    return groupPositions;
		});

		// Extend the Axis prototype
		extend(Axis.prototype, /** @lends Axis.prototype */ {

		    /**
		     * Calculate the ordinal positions before tick positions are calculated.
		     */
		    beforeSetTickPositions: function () {
		        var axis = this,
		            len,
		            ordinalPositions = [],
		            uniqueOrdinalPositions,
		            useOrdinal = false,
		            dist,
		            extremes = axis.getExtremes(),
		            min = extremes.min,
		            max = extremes.max,
		            minIndex,
		            maxIndex,
		            slope,
		            hasBreaks = axis.isXAxis && !!axis.options.breaks,
		            isOrdinal = axis.options.ordinal,
		            overscrollPointsRange = Number.MAX_VALUE,
		            ignoreHiddenSeries = axis.chart.options.chart.ignoreHiddenSeries,
		            isNavigatorAxis = axis.options.className === 'highcharts-navigator-xaxis',
		            i;

		        if (
		            axis.options.overscroll &&
		            axis.max === axis.dataMax &&
		            (
		                // Panning is an execption,
		                // We don't want to apply overscroll when panning over the dataMax
		                !axis.chart.mouseIsDown ||
		                isNavigatorAxis
		            ) && (
		                // Scrollbar buttons are the other execption:
		                !axis.eventArgs ||
		                axis.eventArgs && axis.eventArgs.trigger !== 'navigator'
		            )
		        ) {
		            axis.max += axis.options.overscroll;

		            // Live data and buttons require translation for the min:
		            if (!isNavigatorAxis && defined(axis.userMin)) {
		                axis.min += axis.options.overscroll;
		            }
		        }

		        // Apply the ordinal logic
		        if (isOrdinal || hasBreaks) { // #4167 YAxis is never ordinal ?

		            each(axis.series, function (series, i) {
		                uniqueOrdinalPositions = [];

		                if (
		                    (!ignoreHiddenSeries || series.visible !== false) &&
		                    (series.takeOrdinalPosition !== false || hasBreaks)
		                ) {

		                    // concatenate the processed X data into the existing positions, or the empty array
		                    ordinalPositions = ordinalPositions.concat(series.processedXData);
		                    len = ordinalPositions.length;

		                    // remove duplicates (#1588)
		                    ordinalPositions.sort(function (a, b) {
		                        return a - b; // without a custom function it is sorted as strings
		                    });

		                    overscrollPointsRange = Math.min(
		                        overscrollPointsRange,
		                        pick(
		                            // Check for a single-point series:
		                            series.closestPointRange,
		                            overscrollPointsRange
		                        )
		                    );

		                    if (len) {

		                        i = 0;
		                        while (i < len - 1) {
		                            if (
		                                ordinalPositions[i] !== ordinalPositions[i + 1]
		                            ) {
		                                uniqueOrdinalPositions.push(
		                                    ordinalPositions[i + 1]
		                                );
		                            }
		                            i++;
		                        }

		                        // Check first item:
		                        if (
		                            uniqueOrdinalPositions[0] !== ordinalPositions[0]
		                        ) {
		                            uniqueOrdinalPositions.unshift(
		                                ordinalPositions[0]
		                            );
		                        }

		                        ordinalPositions = uniqueOrdinalPositions;
		                    }
		                }

		            });

		            // cache the length
		            len = ordinalPositions.length;

		            // Check if we really need the overhead of mapping axis data against the ordinal positions.
		            // If the series consist of evenly spaced data any way, we don't need any ordinal logic.
		            if (len > 2) { // two points have equal distance by default
		                dist = ordinalPositions[1] - ordinalPositions[0];
		                i = len - 1;
		                while (i-- && !useOrdinal) {
		                    if (ordinalPositions[i + 1] - ordinalPositions[i] !== dist) {
		                        useOrdinal = true;
		                    }
		                }

		                // When zooming in on a week, prevent axis padding for weekends even though the data within
		                // the week is evenly spaced.
		                if (
		                    !axis.options.keepOrdinalPadding &&
		                    (
		                        ordinalPositions[0] - min > dist ||
		                        max - ordinalPositions[ordinalPositions.length - 1] > dist
		                    )
		                ) {
		                    useOrdinal = true;
		                }
		            } else if (axis.options.overscroll) {
		                if (len === 2) {
		                    // Exactly two points, distance for overscroll is fixed:
		                    overscrollPointsRange = ordinalPositions[1] - ordinalPositions[0];
		                } else if (len === 1) {
		                    // We have just one point, closest distance is unknown.
		                    // Assume then it is last point and overscrolled range:
		                    overscrollPointsRange = axis.options.overscroll;
		                    ordinalPositions = [ordinalPositions[0], ordinalPositions[0] + overscrollPointsRange];
		                } else {
		                    // In case of zooming in on overscrolled range, stick to the old range:
		                    overscrollPointsRange = axis.overscrollPointsRange;
		                }
		            }

		            // Record the slope and offset to compute the linear values from the array index.
		            // Since the ordinal positions may exceed the current range, get the start and
		            // end positions within it (#719, #665b)
		            if (useOrdinal) {

		                if (axis.options.overscroll) {
		                    axis.overscrollPointsRange = overscrollPointsRange;
		                    ordinalPositions = ordinalPositions.concat(axis.getOverscrollPositions());
		                }

		                // Register
		                axis.ordinalPositions = ordinalPositions;

		                // This relies on the ordinalPositions being set. Use Math.max
		                // and Math.min to prevent padding on either sides of the data.
		                minIndex = axis.ordinal2lin( // #5979
		                    Math.max(
		                        min,
		                        ordinalPositions[0]
		                    ),
		                    true
		                );
		                maxIndex = Math.max(axis.ordinal2lin(
		                    Math.min(
		                        max,
		                        ordinalPositions[ordinalPositions.length - 1]
		                    ),
		                    true
		                ), 1); // #3339

		                // Set the slope and offset of the values compared to the indices in the ordinal positions
		                axis.ordinalSlope = slope = (max - min) / (maxIndex - minIndex);
		                axis.ordinalOffset = min - (minIndex * slope);

		            } else {
		                axis.overscrollPointsRange = pick(axis.closestPointRange, axis.overscrollPointsRange);
		                axis.ordinalPositions = axis.ordinalSlope = axis.ordinalOffset = undefined;
		            }
		        }

		        axis.isOrdinal = isOrdinal && useOrdinal; // #3818, #4196, #4926
		        axis.groupIntervalFactor = null; // reset for next run
		    },
		    /**
		     * Translate from a linear axis value to the corresponding ordinal axis position. If there
		     * are no gaps in the ordinal axis this will be the same. The translated value is the value
		     * that the point would have if the axis were linear, using the same min and max.
		     *
		     * @param Number val The axis value
		     * @param Boolean toIndex Whether to return the index in the ordinalPositions or the new value
		     */
		    val2lin: function (val, toIndex) {
		        var axis = this,
		            ordinalPositions = axis.ordinalPositions,
		            ret;

		        if (!ordinalPositions) {
		            ret = val;

		        } else {

		            var ordinalLength = ordinalPositions.length,
		                i,
		                distance,
		                ordinalIndex;

		            // first look for an exact match in the ordinalpositions array
		            i = ordinalLength;
		            while (i--) {
		                if (ordinalPositions[i] === val) {
		                    ordinalIndex = i;
		                    break;
		                }
		            }

		            // if that failed, find the intermediate position between the two nearest values
		            i = ordinalLength - 1;
		            while (i--) {
		                if (val > ordinalPositions[i] || i === 0) { // interpolate
		                    distance = (val - ordinalPositions[i]) / (ordinalPositions[i + 1] - ordinalPositions[i]); // something between 0 and 1
		                    ordinalIndex = i + distance;
		                    break;
		                }
		            }
		            ret = toIndex ?
		                ordinalIndex :
		                axis.ordinalSlope * (ordinalIndex || 0) + axis.ordinalOffset;
		        }
		        return ret;
		    },
		    /**
		     * Translate from linear (internal) to axis value
		     *
		     * @param Number val The linear abstracted value
		     * @param Boolean fromIndex Translate from an index in the ordinal positions rather than a value
		     */
		    lin2val: function (val, fromIndex) {
		        var axis = this,
		            ordinalPositions = axis.ordinalPositions,
		            ret;

		        if (!ordinalPositions) { // the visible range contains only equally spaced values
		            ret = val;

		        } else {

		            var ordinalSlope = axis.ordinalSlope,
		                ordinalOffset = axis.ordinalOffset,
		                i = ordinalPositions.length - 1,
		                linearEquivalentLeft,
		                linearEquivalentRight,
		                distance;


		            // Handle the case where we translate from the index directly, used only
		            // when panning an ordinal axis
		            if (fromIndex) {

		                if (val < 0) { // out of range, in effect panning to the left
		                    val = ordinalPositions[0];
		                } else if (val > i) { // out of range, panning to the right
		                    val = ordinalPositions[i];
		                } else { // split it up
		                    i = Math.floor(val);
		                    distance = val - i; // the decimal
		                }

		            // Loop down along the ordinal positions. When the linear equivalent of i matches
		            // an ordinal position, interpolate between the left and right values.
		            } else {
		                while (i--) {
		                    linearEquivalentLeft = (ordinalSlope * i) + ordinalOffset;
		                    if (val >= linearEquivalentLeft) {
		                        linearEquivalentRight = (ordinalSlope * (i + 1)) + ordinalOffset;
		                        distance = (val - linearEquivalentLeft) / (linearEquivalentRight - linearEquivalentLeft); // something between 0 and 1
		                        break;
		                    }
		                }
		            }

		            // If the index is within the range of the ordinal positions, return the associated
		            // or interpolated value. If not, just return the value
		            return distance !== undefined && ordinalPositions[i] !== undefined ?
		                ordinalPositions[i] + (distance ? distance * (ordinalPositions[i + 1] - ordinalPositions[i]) : 0) :
		                val;
		        }
		        return ret;
		    },
		    /**
		     * Get the ordinal positions for the entire data set. This is necessary in chart panning
		     * because we need to find out what points or data groups are available outside the
		     * visible range. When a panning operation starts, if an index for the given grouping
		     * does not exists, it is created and cached. This index is deleted on updated data, so
		     * it will be regenerated the next time a panning operation starts.
		     */
		    getExtendedPositions: function () {
		        var axis = this,
		            chart = axis.chart,
		            grouping = axis.series[0].currentDataGrouping,
		            ordinalIndex = axis.ordinalIndex,
		            key = grouping ? grouping.count + grouping.unitName : 'raw',
		            overscroll = axis.options.overscroll,
		            extremes = axis.getExtremes(),
		            fakeAxis,
		            fakeSeries;

		        // If this is the first time, or the ordinal index is deleted by updatedData,
		        // create it.
		        if (!ordinalIndex) {
		            ordinalIndex = axis.ordinalIndex = {};
		        }


		        if (!ordinalIndex[key]) {

		            // Create a fake axis object where the extended ordinal positions are emulated
		            fakeAxis = {
		                series: [],
		                chart: chart,
		                getExtremes: function () {
		                    return {
		                        min: extremes.dataMin,
		                        max: extremes.dataMax + overscroll
		                    };
		                },
		                options: {
		                    ordinal: true
		                },
		                val2lin: Axis.prototype.val2lin, // #2590
		                ordinal2lin: Axis.prototype.ordinal2lin // #6276
		            };

		            // Add the fake series to hold the full data, then apply processData to it
		            each(axis.series, function (series) {
		                fakeSeries = {
		                    xAxis: fakeAxis,
		                    xData: series.xData.slice(),
		                    chart: chart,
		                    destroyGroupedData: noop
		                };

		                fakeSeries.xData = fakeSeries.xData.concat(axis.getOverscrollPositions());

		                fakeSeries.options = {
		                    dataGrouping: grouping ? {
		                        enabled: true,
		                        forced: true,
		                        approximation: 'open', // doesn't matter which, use the fastest
		                        units: [[grouping.unitName, [grouping.count]]]
		                    } : {
		                        enabled: false
		                    }
		                };
		                series.processData.apply(fakeSeries);


		                fakeAxis.series.push(fakeSeries);
		            });

		            // Run beforeSetTickPositions to compute the ordinalPositions
		            axis.beforeSetTickPositions.apply(fakeAxis);

		            // Cache it
		            ordinalIndex[key] = fakeAxis.ordinalPositions;
		        }
		        return ordinalIndex[key];
		    },

		    /**
		     * Get ticks for an ordinal axis within a range where points don't exist.
		     * It is required when overscroll is enabled. We can't base on points,
		     * because we may not have any, so we use approximated pointRange and
		     * generate these ticks between <Axis.dataMax, Axis.dataMax + Axis.overscroll>
		     * evenly spaced. Used in panning and navigator scrolling.
		     *
		     * @returns positions {Array} Generated ticks
		     * @private
		     */
		    getOverscrollPositions: function () {
		        var axis = this,
		            extraRange = axis.options.overscroll,
		            distance = axis.overscrollPointsRange,
		            positions = [],
		            max = axis.dataMax;

		        if (H.defined(distance)) {
		            // Max + pointRange because we need to scroll to the last

		            positions.push(max);

		            while (max <= axis.dataMax + extraRange) {
		                max += distance;
		                positions.push(max);
		            }

		        }

		        return positions;
		    },

		    /**
		     * Find the factor to estimate how wide the plot area would have been if ordinal
		     * gaps were included. This value is used to compute an imagined plot width in order
		     * to establish the data grouping interval.
		     *
		     * A real world case is the intraday-candlestick
		     * example. Without this logic, it would show the correct data grouping when viewing
		     * a range within each day, but once moving the range to include the gap between two
		     * days, the interval would include the cut-away night hours and the data grouping
		     * would be wrong. So the below method tries to compensate by identifying the most
		     * common point interval, in this case days.
		     *
		     * An opposite case is presented in issue #718. We have a long array of daily data,
		     * then one point is appended one hour after the last point. We expect the data grouping
		     * not to change.
		     *
		     * In the future, if we find cases where this estimation doesn't work optimally, we
		     * might need to add a second pass to the data grouping logic, where we do another run
		     * with a greater interval if the number of data groups is more than a certain fraction
		     * of the desired group count.
		     */
		    getGroupIntervalFactor: function (xMin, xMax, series) {
		        var i,
		            processedXData = series.processedXData,
		            len = processedXData.length,
		            distances = [],
		            median,
		            groupIntervalFactor = this.groupIntervalFactor;

		        // Only do this computation for the first series, let the other inherit it (#2416)
		        if (!groupIntervalFactor) {

		            // Register all the distances in an array
		            for (i = 0; i < len - 1; i++) {
		                distances[i] = processedXData[i + 1] - processedXData[i];
		            }

		            // Sort them and find the median
		            distances.sort(function (a, b) {
		                return a - b;
		            });
		            median = distances[Math.floor(len / 2)];

		            // Compensate for series that don't extend through the entire axis extent. #1675.
		            xMin = Math.max(xMin, processedXData[0]);
		            xMax = Math.min(xMax, processedXData[len - 1]);

		            this.groupIntervalFactor = groupIntervalFactor = (len * median) / (xMax - xMin);
		        }

		        // Return the factor needed for data grouping
		        return groupIntervalFactor;
		    },

		    /**
		     * Make the tick intervals closer because the ordinal gaps make the ticks spread out or cluster
		     */
		    postProcessTickInterval: function (tickInterval) {
		        // Problem: http://jsfiddle.net/highcharts/FQm4E/1/
		        // This is a case where this algorithm doesn't work optimally. In this case, the
		        // tick labels are spread out per week, but all the gaps reside within weeks. So
		        // we have a situation where the labels are courser than the ordinal gaps, and
		        // thus the tick interval should not be altered
		        var ordinalSlope = this.ordinalSlope,
		            ret;


		        if (ordinalSlope) {
		            if (!this.options.breaks) {
		                ret = tickInterval / (ordinalSlope / this.closestPointRange);
		            } else {
		                ret = this.closestPointRange || tickInterval; // #7275
		            }
		        } else {
		            ret = tickInterval;
		        }
		        return ret;
		    }
		});

		// Record this to prevent overwriting by broken-axis module (#5979)
		Axis.prototype.ordinal2lin = Axis.prototype.val2lin;

		// Extending the Chart.pan method for ordinal axes
		wrap(Chart.prototype, 'pan', function (proceed, e) {
		    var chart = this,
		        xAxis = chart.xAxis[0],
		        overscroll = xAxis.options.overscroll,
		        chartX = e.chartX,
		        runBase = false;

		    if (xAxis.options.ordinal && xAxis.series.length) {

		        var mouseDownX = chart.mouseDownX,
		            extremes = xAxis.getExtremes(),
		            dataMax = extremes.dataMax,
		            min = extremes.min,
		            max = extremes.max,
		            trimmedRange,
		            hoverPoints = chart.hoverPoints,
		            closestPointRange = xAxis.closestPointRange || xAxis.overscrollPointsRange,
		            pointPixelWidth = xAxis.translationSlope * (xAxis.ordinalSlope || closestPointRange),
		            movedUnits = (mouseDownX - chartX) / pointPixelWidth, // how many ordinal units did we move?
		            extendedAxis = { ordinalPositions: xAxis.getExtendedPositions() }, // get index of all the chart's points
		            ordinalPositions,
		            searchAxisLeft,
		            lin2val = xAxis.lin2val,
		            val2lin = xAxis.val2lin,
		            searchAxisRight;

		        if (!extendedAxis.ordinalPositions) { // we have an ordinal axis, but the data is equally spaced
		            runBase = true;

		        } else if (Math.abs(movedUnits) > 1) {

		            // Remove active points for shared tooltip
		            if (hoverPoints) {
		                each(hoverPoints, function (point) {
		                    point.setState();
		                });
		            }

		            if (movedUnits < 0) {
		                searchAxisLeft = extendedAxis;
		                searchAxisRight = xAxis.ordinalPositions ? xAxis : extendedAxis;
		            } else {
		                searchAxisLeft = xAxis.ordinalPositions ? xAxis : extendedAxis;
		                searchAxisRight = extendedAxis;
		            }

		            // In grouped data series, the last ordinal position represents the grouped data, which is
		            // to the left of the real data max. If we don't compensate for this, we will be allowed
		            // to pan grouped data series passed the right of the plot area.
		            ordinalPositions = searchAxisRight.ordinalPositions;
		            if (dataMax > ordinalPositions[ordinalPositions.length - 1]) {
		                ordinalPositions.push(dataMax);
		            }

		            // Get the new min and max values by getting the ordinal index for the current extreme,
		            // then add the moved units and translate back to values. This happens on the
		            // extended ordinal positions if the new position is out of range, else it happens
		            // on the current x axis which is smaller and faster.
		            chart.fixedRange = max - min;
		            trimmedRange = xAxis.toFixedRange(null, null,
		                lin2val.apply(searchAxisLeft, [
		                    val2lin.apply(searchAxisLeft, [min, true]) + movedUnits, // the new index
		                    true // translate from index
		                ]),
		                lin2val.apply(searchAxisRight, [
		                    val2lin.apply(searchAxisRight, [max, true]) + movedUnits, // the new index
		                    true // translate from index
		                ])
		            );

		            // Apply it if it is within the available data range
		            if (
		                trimmedRange.min >= Math.min(extremes.dataMin, min) &&
		                trimmedRange.max <= Math.max(dataMax, max) + overscroll
		            ) {
		                xAxis.setExtremes(trimmedRange.min, trimmedRange.max, true, false, { trigger: 'pan' });
		            }

		            chart.mouseDownX = chartX; // set new reference for next run
		            css(chart.container, { cursor: 'move' });
		        }

		    } else {
		        runBase = true;
		    }

		    // revert to the linear chart.pan version
		    if (runBase) {
		        if (overscroll) {
		            xAxis.max = xAxis.dataMax + overscroll;
		        }
		        // call the original function
		        proceed.apply(this, Array.prototype.slice.call(arguments, 1));
		    }
		});

		/* ****************************************************************************
		 * End ordinal axis logic                                                   *
		 *****************************************************************************/

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2009-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */

		var addEvent = H.addEvent,
		    pick = H.pick,
		    wrap = H.wrap,
		    each = H.each,
		    extend = H.extend,
		    isArray = H.isArray,
		    fireEvent = H.fireEvent,
		    Axis = H.Axis,
		    Series = H.Series;

		function stripArguments() {
		    return Array.prototype.slice.call(arguments, 1);
		}

		extend(Axis.prototype, {
		    isInBreak: function (brk, val) {
		        var ret,
		            repeat = brk.repeat || Infinity,
		            from = brk.from,
		            length = brk.to - brk.from,
		            test = (
		                val >= from ?
		                    (val - from) % repeat :
		                    repeat - ((from - val) % repeat)
		            );

		        if (!brk.inclusive) {
		            ret = test < length && test !== 0;
		        } else {
		            ret = test <= length;
		        }
		        return ret;
		    },

		    isInAnyBreak: function (val, testKeep) {

		        var breaks = this.options.breaks,
		            i = breaks && breaks.length,
		            inbrk,
		            keep,
		            ret;


		        if (i) {

		            while (i--) {
		                if (this.isInBreak(breaks[i], val)) {
		                    inbrk = true;
		                    if (!keep) {
		                        keep = pick(
		                            breaks[i].showPoints,
		                            this.isXAxis ? false : true
		                        );
		                    }
		                }
		            }

		            if (inbrk && testKeep) {
		                ret = inbrk && !keep;
		            } else {
		                ret = inbrk;
		            }
		        }
		        return ret;
		    }
		});

		addEvent(Axis, 'afterSetTickPositions', function () {
		    if (this.options.breaks) {
		        var axis = this,
		            tickPositions = this.tickPositions,
		            info = this.tickPositions.info,
		            newPositions = [],
		            i;

		        for (i = 0; i < tickPositions.length; i++) {
		            if (!axis.isInAnyBreak(tickPositions[i])) {
		                newPositions.push(tickPositions[i]);
		            }
		        }

		        this.tickPositions = newPositions;
		        this.tickPositions.info = info;
		    }
		});

		// Force Axis to be not-ordinal when breaks are defined
		addEvent(Axis, 'afterSetOptions', function () {
		    if (this.options.breaks && this.options.breaks.length) {
		        this.options.ordinal = false;
		    }
		});

		addEvent(Axis, 'afterInit', function () {
		    var axis = this,
		        breaks;

		    breaks = this.options.breaks;
		    axis.isBroken = (isArray(breaks) && !!breaks.length);
		    if (axis.isBroken) {
		        axis.val2lin = function (val) {
		            var nval = val,
		                brk,
		                i;

		            for (i = 0; i < axis.breakArray.length; i++) {
		                brk = axis.breakArray[i];
		                if (brk.to <= val) {
		                    nval -= brk.len;
		                } else if (brk.from >= val) {
		                    break;
		                } else if (axis.isInBreak(brk, val)) {
		                    nval -= (val - brk.from);
		                    break;
		                }
		            }

		            return nval;
		        };

		        axis.lin2val = function (val) {
		            var nval = val,
		                brk,
		                i;

		            for (i = 0; i < axis.breakArray.length; i++) {
		                brk = axis.breakArray[i];
		                if (brk.from >= nval) {
		                    break;
		                } else if (brk.to < nval) {
		                    nval += brk.len;
		                } else if (axis.isInBreak(brk, nval)) {
		                    nval += brk.len;
		                }
		            }
		            return nval;
		        };

		        axis.setExtremes = function (
		            newMin,
		            newMax,
		            redraw,
		            animation,
		            eventArguments
		        ) {
		            // If trying to set extremes inside a break, extend it to before and
		            // after the break ( #3857 )
		            while (this.isInAnyBreak(newMin)) {
		                newMin -= this.closestPointRange;
		            }
		            while (this.isInAnyBreak(newMax)) {
		                newMax -= this.closestPointRange;
		            }
		            Axis.prototype.setExtremes.call(
		                this,
		                newMin,
		                newMax,
		                redraw,
		                animation,
		                eventArguments
		            );
		        };

		        axis.setAxisTranslation = function (saveOld) {
		            Axis.prototype.setAxisTranslation.call(this, saveOld);

		            var breaks = axis.options.breaks,
		                breakArrayT = [],    // Temporary one
		                breakArray = [],
		                length = 0,
		                inBrk,
		                repeat,
		                min = axis.userMin || axis.min,
		                max = axis.userMax || axis.max,
		                pointRangePadding = pick(axis.pointRangePadding, 0),
		                start,
		                i;

		            // Min & max check (#4247)
		            each(breaks, function (brk) {
		                repeat = brk.repeat || Infinity;
		                if (axis.isInBreak(brk, min)) {
		                    min += (brk.to % repeat) - (min % repeat);
		                }
		                if (axis.isInBreak(brk, max)) {
		                    max -= (max % repeat) - (brk.from % repeat);
		                }
		            });

		            // Construct an array holding all breaks in the axis
		            each(breaks, function (brk) {
		                start = brk.from;
		                repeat = brk.repeat || Infinity;

		                while (start - repeat > min) {
		                    start -= repeat;
		                }
		                while (start < min) {
		                    start += repeat;
		                }

		                for (i = start; i < max; i += repeat) {
		                    breakArrayT.push({
		                        value: i,
		                        move: 'in'
		                    });
		                    breakArrayT.push({
		                        value: i + (brk.to - brk.from),
		                        move: 'out',
		                        size: brk.breakSize
		                    });
		                }
		            });

		            breakArrayT.sort(function (a, b) {
		                var ret;
		                if (a.value === b.value) {
		                    ret = (a.move === 'in' ? 0 : 1) - (b.move === 'in' ? 0 : 1);
		                } else {
		                    ret = a.value - b.value;
		                }
		                return ret;
		            });

		            // Simplify the breaks
		            inBrk = 0;
		            start = min;

		            each(breakArrayT, function (brk) {
		                inBrk += (brk.move === 'in' ? 1 : -1);

		                if (inBrk === 1 && brk.move === 'in') {
		                    start = brk.value;
		                }
		                if (inBrk === 0) {
		                    breakArray.push({
		                        from: start,
		                        to: brk.value,
		                        len: brk.value - start - (brk.size || 0)
		                    });
		                    length += brk.value - start - (brk.size || 0);
		                }
		            });

		            axis.breakArray = breakArray;

		            // Used with staticScale, and below, the actual axis length when
		            // breaks are substracted.
		            axis.unitLength = max - min - length + pointRangePadding;

		            fireEvent(axis, 'afterBreaks');

		            if (axis.options.staticScale) {
		                axis.transA = axis.options.staticScale;
		            } else if (axis.unitLength) {
		                axis.transA *= (max - axis.min + pointRangePadding) /
		                    axis.unitLength;
		            }

		            if (pointRangePadding) {
		                axis.minPixelPadding = axis.transA * axis.minPointOffset;
		            }

		            axis.min = min;
		            axis.max = max;
		        };
		    }
		});

		wrap(Series.prototype, 'generatePoints', function (proceed) {

		    proceed.apply(this, stripArguments(arguments));

		    var series = this,
		        xAxis = series.xAxis,
		        yAxis = series.yAxis,
		        points = series.points,
		        point,
		        i = points.length,
		        connectNulls = series.options.connectNulls,
		        nullGap;


		    if (xAxis && yAxis && (xAxis.options.breaks || yAxis.options.breaks)) {
		        while (i--) {
		            point = points[i];

		            // Respect nulls inside the break (#4275)
		            nullGap = point.y === null && connectNulls === false;
		            if (
		                !nullGap &&
		                (
		                    xAxis.isInAnyBreak(point.x, true) ||
		                    yAxis.isInAnyBreak(point.y, true)
		                )
		            ) {
		                points.splice(i, 1);
		                if (this.data[i]) {
		                    // Removes the graphics for this point if they exist
		                    this.data[i].destroyElements();
		                }
		            }
		        }
		    }

		});

		function drawPointsWrapped(proceed) {
		    proceed.apply(this);
		    this.drawBreaks(this.xAxis, ['x']);
		    this.drawBreaks(this.yAxis, pick(this.pointArrayMap, ['y']));
		}

		H.Series.prototype.drawBreaks = function (axis, keys) {
		    var series = this,
		        points = series.points,
		        breaks,
		        threshold,
		        eventName,
		        y;

		    if (!axis) {
		        return; // #5950
		    }

		    each(keys, function (key) {
		        breaks = axis.breakArray || [];
		        threshold = axis.isXAxis ?
		            axis.min :
		            pick(series.options.threshold, axis.min);
		        each(points, function (point) {
		            y = pick(point['stack' + key.toUpperCase()], point[key]);
		            each(breaks, function (brk) {
		                eventName = false;

		                if (
		                    (threshold < brk.from && y > brk.to) ||
		                    (threshold > brk.from && y < brk.from)
		                ) {
		                    eventName = 'pointBreak';

		                } else if (
		                    (threshold < brk.from && y > brk.from && y < brk.to) ||
		                    (threshold > brk.from && y > brk.to && y < brk.from)
		                ) {
		                    eventName = 'pointInBreak';
		                }
		                if (eventName) {
		                    fireEvent(axis, eventName, { point: point, brk: brk });
		                }
		            });
		        });
		    });
		};


		/**
		 * Extend getGraphPath by identifying gaps in the data so that we can draw a gap
		 * in the line or area. This was moved from ordinal axis module to broken axis
		 * module as of #5045.
		 */
		H.Series.prototype.gappedPath = function () {
		    var currentDataGrouping = this.currentDataGrouping,
		        groupingSize = currentDataGrouping && currentDataGrouping.totalRange,
		        gapSize = this.options.gapSize,
		        points = this.points.slice(),
		        i = points.length - 1,
		        yAxis = this.yAxis,
		        xRange,
		        stack;

		    /**
		     * Defines when to display a gap in the graph, together with the
		     * [gapUnit](plotOptions.series.gapUnit) option.
		     *
		     * In case when `dataGrouping` is enabled, points can be grouped into a
		     * larger time span. This can make the grouped points to have a greater
		     * distance than the absolute value of `gapSize` property, which will result
		     * in disappearing graph completely. To prevent this situation the mentioned
		     * distance between grouped points is used instead of previously defined
		     * `gapSize`.
		     *
		     * In practice, this option is most often used to visualize gaps in
		     * time series. In a stock chart, intraday data is available for daytime
		     * hours, while gaps will appear in nights and weekends.
		     *
		     * @type    {Number}
		     * @see     [gapUnit](plotOptions.series.gapUnit) and
		     *          [xAxis.breaks](#xAxis.breaks)
		     * @sample  {highstock} stock/plotoptions/series-gapsize/
		     *          Setting the gap size to 2 introduces gaps for weekends in daily
		     *          datasets.
		     * @default 0
		     * @product highstock
		     * @apioption plotOptions.series.gapSize
		     */

		    /**
		     * Together with [gapSize](plotOptions.series.gapSize), this option defines
		     * where to draw gaps in the graph.
		     *
		     * When the `gapUnit` is `relative` (default), a gap size of 5 means
		     * that if the distance between two points is greater than five times
		     * that of the two closest points, the graph will be broken.
		     *
		     * When the `gapUnit` is `value`, the gap is based on absolute axis values,
		     * which on a datetime axis is milliseconds. This also applies to the
		     * navigator series that inherits gap options from the base series.
		     *
		     * @type {String}
		     * @see [gapSize](plotOptions.series.gapSize)
		     * @default relative
		     * @validvalue ["relative", "value"]
		     * @since 5.0.13
		     * @product highstock
		     * @apioption plotOptions.series.gapUnit
		     */

		    if (gapSize && i > 0) { // #5008

		        // Gap unit is relative
		        if (this.options.gapUnit !== 'value') {
		            gapSize *= this.closestPointRange;
		        }

		        // Setting a new gapSize in case dataGrouping is enabled (#7686)
		        if (groupingSize && groupingSize > gapSize) {
		            gapSize = groupingSize;
		        }

		        // extension for ordinal breaks
		        while (i--) {
		            if (points[i + 1].x - points[i].x > gapSize) {
		                xRange = (points[i].x + points[i + 1].x) / 2;

		                points.splice( // insert after this one
		                    i + 1,
		                    0,
		                    {
		                        isNull: true,
		                        x: xRange
		                    }
		                );

		                // For stacked chart generate empty stack items, #6546
		                if (this.options.stacking) {
		                    stack = yAxis.stacks[this.stackKey][xRange] =
		                        new H.StackItem(
		                            yAxis,
		                            yAxis.options.stackLabels,
		                            false,
		                            xRange,
		                            this.stack
		                        );
		                    stack.total = 0;
		                }
		            }
		        }
		    }

		    // Call base method
		    return this.getGraphPath(points);
		};

		wrap(H.seriesTypes.column.prototype, 'drawPoints', drawPointsWrapped);
		wrap(H.Series.prototype, 'drawPoints', drawPointsWrapped);

	}(Highcharts));
	(function () {


	}());
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */

		var addEvent = H.addEvent,
		    arrayMax = H.arrayMax,
		    arrayMin = H.arrayMin,
		    Axis = H.Axis,
		    defaultPlotOptions = H.defaultPlotOptions,
		    defined = H.defined,
		    each = H.each,
		    extend = H.extend,
		    format = H.format,
		    isNumber = H.isNumber,
		    merge = H.merge,
		    pick = H.pick,
		    Point = H.Point,
		    Series = H.Series,
		    Tooltip = H.Tooltip,
		    wrap = H.wrap;

		/* ****************************************************************************
		 * Start data grouping module                                                 *
		 ******************************************************************************/

		/**
		 * Data grouping is the concept of sampling the data values into larger
		 * blocks in order to ease readability and increase performance of the
		 * JavaScript charts. Highstock by default applies data grouping when
		 * the points become closer than a certain pixel value, determined by
		 * the `groupPixelWidth` option.
		 *
		 * If data grouping is applied, the grouping information of grouped
		 * points can be read from the [Point.dataGroup](
		 * /class-reference/Highcharts.Point#.dataGroup).
		 *
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping
		 */

		/**
		 * The method of approximation inside a group. When for example 30 days
		 * are grouped into one month, this determines what value should represent
		 * the group. Possible values are "average", "averages", "open", "high",
		 * "low", "close" and "sum". For OHLC and candlestick series the approximation
		 * is "ohlc" by default, which finds the open, high, low and close values
		 * within all the grouped data. For ranges, the approximation is "range",
		 * which finds the low and high values. For multi-dimensional data,
		 * like ranges and OHLC, "averages" will compute the average for each
		 * dimension.
		 *
		 * Custom aggregate methods can be added by assigning a callback function
		 * as the approximation. This function takes a numeric array as the
		 * argument and should return a single numeric value or `null`. Note
		 * that the numeric array will never contain null values, only true
		 * numbers. Instead, if null values are present in the raw data, the
		 * numeric array will have an `.hasNulls` property set to `true`. For
		 * single-value data sets the data is available in the first argument
		 * of the callback function. For OHLC data sets, all the open values
		 * are in the first argument, all high values in the second etc.
		 *
		 * Since v4.2.7, grouping meta data is available in the approximation
		 * callback from `this.dataGroupInfo`. It can be used to extract information
		 * from the raw data.
		 *
		 * Defaults to `average` for line-type series, `sum` for columns, `range`
		 * for range series and `ohlc` for OHLC and candlestick.
		 *
		 * @validvalue ["average", "averages", "open", "high", "low", "close", "sum"]
		 * @type {String|Function}
		 * @sample {highstock} stock/plotoptions/series-datagrouping-approximation
		 *         Approximation callback with custom data
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping.approximation
		 */

		/**
		 * Datetime formats for the header of the tooltip in a stock chart.
		 * The format can vary within a chart depending on the currently selected
		 * time range and the current data grouping.
		 *
		 * The default formats are:
		 *
		 * <pre>{
		 *     millisecond: [
		 *         '%A, %b %e, %H:%M:%S.%L', '%A, %b %e, %H:%M:%S.%L', '-%H:%M:%S.%L'
		 *     ],
		 *     second: ['%A, %b %e, %H:%M:%S', '%A, %b %e, %H:%M:%S', '-%H:%M:%S'],
		 *     minute: ['%A, %b %e, %H:%M', '%A, %b %e, %H:%M', '-%H:%M'],
		 *     hour: ['%A, %b %e, %H:%M', '%A, %b %e, %H:%M', '-%H:%M'],
		 *     day: ['%A, %b %e, %Y', '%A, %b %e', '-%A, %b %e, %Y'],
		 *     week: ['Week from %A, %b %e, %Y', '%A, %b %e', '-%A, %b %e, %Y'],
		 *     month: ['%B %Y', '%B', '-%B %Y'],
		 *     year: ['%Y', '%Y', '-%Y']
		 * }</pre>
		 *
		 * For each of these array definitions, the first item is the format
		 * used when the active time span is one unit. For instance, if the
		 * current data applies to one week, the first item of the week array
		 * is used. The second and third items are used when the active time
		 * span is more than two units. For instance, if the current data applies
		 * to two weeks, the second and third item of the week array are used,
		 *  and applied to the start and end date of the time span.
		 *
		 * @type {Object}
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping.dateTimeLabelFormats
		 */

		/**
		 * Enable or disable data grouping.
		 *
		 * @type {Boolean}
		 * @default true
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping.enabled
		 */

		/**
		 * When data grouping is forced, it runs no matter how small the intervals
		 * are. This can be handy for example when the sum should be calculated
		 * for values appearing at random times within each hour.
		 *
		 * @type {Boolean}
		 * @default false
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping.forced
		 */

		/**
		 * The approximate pixel width of each group. If for example a series
		 * with 30 points is displayed over a 600 pixel wide plot area, no grouping
		 * is performed. If however the series contains so many points that
		 * the spacing is less than the groupPixelWidth, Highcharts will try
		 * to group it into appropriate groups so that each is more or less
		 * two pixels wide. If multiple series with different group pixel widths
		 * are drawn on the same x axis, all series will take the greatest width.
		 * For example, line series have 2px default group width, while column
		 * series have 10px. If combined, both the line and the column will
		 * have 10px by default.
		 *
		 * @type {Number}
		 * @default 2
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping.groupPixelWidth
		 */

		 /**
		 * By default only points within the visible range are grouped. Enabling this
		 * option will force data grouping to calculate all grouped points for a given
		 * dataset. That option prevents for example a column series from calculating
		 * a grouped point partially. The effect is similar to
		 * [Series.getExtremesFromAll](#plotOptions.series.getExtremesFromAll) but does
		 * not affect yAxis extremes.
		 *
		 * @type {Boolean}
		 * @sample {highstock} stock/plotoptions/series-datagrouping-groupall/
		 *         Two series with the same data but different groupAll setting
		 * @default false
		 * @since 6.1.0
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping.groupAll
		 */

		/**
		 * Normally, a group is indexed by the start of that group, so for example
		 * when 30 daily values are grouped into one month, that month's x value
		 * will be the 1st of the month. This apparently shifts the data to
		 * the left. When the smoothed option is true, this is compensated for.
		 * The data is shifted to the middle of the group, and min and max
		 * values are preserved. Internally, this is used in the Navigator series.
		 *
		 * @type {Boolean}
		 * @default false
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping.smoothed
		 */

		/**
		 * An array determining what time intervals the data is allowed to be
		 * grouped to. Each array item is an array where the first value is
		 * the time unit and the second value another array of allowed multiples.
		 * Defaults to:
		 *
		 * <pre>units: [[
		 *     'millisecond', // unit name
		 *     [1, 2, 5, 10, 20, 25, 50, 100, 200, 500] // allowed multiples
		 * ], [
		 *     'second',
		 *     [1, 2, 5, 10, 15, 30]
		 * ], [
		 *     'minute',
		 *     [1, 2, 5, 10, 15, 30]
		 * ], [
		 *     'hour',
		 *     [1, 2, 3, 4, 6, 8, 12]
		 * ], [
		 *     'day',
		 *     [1]
		 * ], [
		 *     'week',
		 *     [1]
		 * ], [
		 *     'month',
		 *     [1, 3, 6]
		 * ], [
		 *     'year',
		 *     null
		 * ]]</pre>
		 *
		 * @type {Array}
		 * @product highstock
		 * @apioption plotOptions.series.dataGrouping.units
		 */

		/**
		 * The approximate pixel width of each group. If for example a series
		 * with 30 points is displayed over a 600 pixel wide plot area, no grouping
		 * is performed. If however the series contains so many points that
		 * the spacing is less than the groupPixelWidth, Highcharts will try
		 * to group it into appropriate groups so that each is more or less
		 * two pixels wide. Defaults to `10`.
		 *
		 * @type {Number}
		 * @sample {highstock} stock/plotoptions/series-datagrouping-grouppixelwidth/
		 *         Two series with the same data density but different groupPixelWidth
		 * @default 10
		 * @product highstock
		 * @apioption plotOptions.column.dataGrouping.groupPixelWidth
		 */

		var seriesProto = Series.prototype,
		    baseProcessData = seriesProto.processData,
		    baseGeneratePoints = seriesProto.generatePoints,

		    /**
		     *
		     */
		    commonOptions = {
		        approximation: 'average', // average, open, high, low, close, sum
		        // enabled: null, // (true for stock charts, false for basic),
		        // forced: undefined,
		        groupPixelWidth: 2,
		        // the first one is the point or start value, the second is the start
		        // value if we're dealing with range, the third one is the end value if
		        // dealing with a range
		        dateTimeLabelFormats: {
		            millisecond: [
		                '%A, %b %e, %H:%M:%S.%L',
		                '%A, %b %e, %H:%M:%S.%L',
		                '-%H:%M:%S.%L'
		            ],
		            second: [
		                '%A, %b %e, %H:%M:%S',
		                '%A, %b %e, %H:%M:%S',
		                '-%H:%M:%S'
		            ],
		            minute: [
		                '%A, %b %e, %H:%M',
		                '%A, %b %e, %H:%M',
		                '-%H:%M'
		            ],
		            hour: [
		                '%A, %b %e, %H:%M',
		                '%A, %b %e, %H:%M',
		                '-%H:%M'
		            ],
		            day: [
		                '%A, %b %e, %Y',
		                '%A, %b %e',
		                '-%A, %b %e, %Y'
		            ],
		            week: [
		                'Week from %A, %b %e, %Y',
		                '%A, %b %e',
		                '-%A, %b %e, %Y'
		            ],
		            month: [
		                '%B %Y',
		                '%B',
		                '-%B %Y'
		            ],
		            year: [
		                '%Y',
		                '%Y',
		                '-%Y'
		            ]
		        }
		        // smoothed = false, // enable this for navigator series only
		    },

		    specificOptions = { // extends common options
		        line: {},
		        spline: {},
		        area: {},
		        areaspline: {},
		        column: {
		            approximation: 'sum',
		            groupPixelWidth: 10
		        },
		        arearange: {
		            approximation: 'range'
		        },
		        areasplinerange: {
		            approximation: 'range'
		        },
		        columnrange: {
		            approximation: 'range',
		            groupPixelWidth: 10
		        },
		        candlestick: {
		            approximation: 'ohlc',
		            groupPixelWidth: 10
		        },
		        ohlc: {
		            approximation: 'ohlc',
		            groupPixelWidth: 5
		        }
		    },

		    // units are defined in a separate array to allow complete overriding in
		    // case of a user option
		    defaultDataGroupingUnits = H.defaultDataGroupingUnits = [
		        [
		            'millisecond', // unit name
		            [1, 2, 5, 10, 20, 25, 50, 100, 200, 500] // allowed multiples
		        ], [
		            'second',
		            [1, 2, 5, 10, 15, 30]
		        ], [
		            'minute',
		            [1, 2, 5, 10, 15, 30]
		        ], [
		            'hour',
		            [1, 2, 3, 4, 6, 8, 12]
		        ], [
		            'day',
		            [1]
		        ], [
		            'week',
		            [1]
		        ], [
		            'month',
		            [1, 3, 6]
		        ], [
		            'year',
		            null
		        ]
		    ],


		    /**
		     * Define the available approximation types. The data grouping
		     * approximations takes an array or numbers as the first parameter. In case
		     * of ohlc, four arrays are sent in as four parameters. Each array consists
		     * only of numbers. In case null values belong to the group, the property
		     * .hasNulls will be set to true on the array.
		     */
		    approximations = H.approximations = {
		        sum: function (arr) {
		            var len = arr.length,
		                ret;

		            // 1. it consists of nulls exclusively
		            if (!len && arr.hasNulls) {
		                ret = null;
		            // 2. it has a length and real values
		            } else if (len) {
		                ret = 0;
		                while (len--) {
		                    ret += arr[len];
		                }
		            }
		            // 3. it has zero length, so just return undefined
		            // => doNothing()

		            return ret;
		        },
		        average: function (arr) {
		            var len = arr.length,
		                ret = approximations.sum(arr);

		            // If we have a number, return it divided by the length. If not,
		            // return null or undefined based on what the sum method finds.
		            if (isNumber(ret) && len) {
		                ret = ret / len;
		            }

		            return ret;
		        },
		        // The same as average, but for series with multiple values, like area
		        // ranges.
		        averages: function () { // #5479
		            var ret = [];

		            each(arguments, function (arr) {
		                ret.push(approximations.average(arr));
		            });

		            // Return undefined when first elem. is undefined and let
		            // sum method handle null (#7377)
		            return ret[0] === undefined ? undefined : ret;
		        },
		        open: function (arr) {
		            return arr.length ? arr[0] : (arr.hasNulls ? null : undefined);
		        },
		        high: function (arr) {
		            return arr.length ?
		                arrayMax(arr) :
		                (arr.hasNulls ? null : undefined);
		        },
		        low: function (arr) {
		            return arr.length ?
		                arrayMin(arr) :
		                (arr.hasNulls ? null : undefined);
		        },
		        close: function (arr) {
		            return arr.length ?
		                arr[arr.length - 1] :
		                (arr.hasNulls ? null : undefined);
		        },
		        // ohlc and range are special cases where a multidimensional array is
		        // input and an array is output
		        ohlc: function (open, high, low, close) {
		            open = approximations.open(open);
		            high = approximations.high(high);
		            low = approximations.low(low);
		            close = approximations.close(close);

		            if (
		                isNumber(open) ||
		                isNumber(high) ||
		                isNumber(low) ||
		                isNumber(close)
		            ) {
		                return [open, high, low, close];
		            }
		            // else, return is undefined
		        },
		        range: function (low, high) {
		            low = approximations.low(low);
		            high = approximations.high(high);

		            if (isNumber(low) || isNumber(high)) {
		                return [low, high];
		            } else if (low === null && high === null) {
		                return null;
		            }
		            // else, return is undefined
		        }
		    };

		/**
		 * Takes parallel arrays of x and y data and groups the data into intervals
		 * defined by groupPositions, a collection of starting x values for each group.
		 */
		seriesProto.groupData = function (xData, yData, groupPositions, approximation) {
		    var series = this,
		        data = series.data,
		        dataOptions = series.options.data,
		        groupedXData = [],
		        groupedYData = [],
		        groupMap = [],
		        dataLength = xData.length,
		        pointX,
		        pointY,
		        groupedY,
		        // when grouping the fake extended axis for panning,
		        // we don't need to consider y
		        handleYData = !!yData,
		        values = [],
		        approximationFn = typeof approximation === 'function' ?
		            approximation :
		            approximations[approximation] ||
		                // if the approximation is not found use default series type
		                // approximation (#2914)
		                (
		                    specificOptions[series.type] &&
		                    approximations[specificOptions[series.type].approximation]
		                ) || approximations[commonOptions.approximation],
		        pointArrayMap = series.pointArrayMap,
		        pointArrayMapLength = pointArrayMap && pointArrayMap.length,
		        pos = 0,
		        start = 0,
		        valuesLen,
		        i, j;

		    // Calculate values array size from pointArrayMap length
		    if (pointArrayMapLength) {
		        each(pointArrayMap, function () {
		            values.push([]);
		        });
		    } else {
		        values.push([]);
		    }
		    valuesLen = pointArrayMapLength || 1;

		    // Start with the first point within the X axis range (#2696)
		    for (i = 0; i <= dataLength; i++) {
		        if (xData[i] >= groupPositions[0]) {
		            break;
		        }
		    }

		    for (i; i <= dataLength; i++) {

		        // when a new group is entered, summarize and initiate
		        // the previous group
		        while ((
		                    groupPositions[pos + 1] !== undefined &&
		                    xData[i] >= groupPositions[pos + 1]
		                ) || i === dataLength) { // get the last group

		            // get group x and y
		            pointX = groupPositions[pos];
		            series.dataGroupInfo = { start: start, length: values[0].length };
		            groupedY = approximationFn.apply(series, values);

		            // push the grouped data
		            if (groupedY !== undefined) {
		                groupedXData.push(pointX);
		                groupedYData.push(groupedY);
		                groupMap.push(series.dataGroupInfo);
		            }

		            // reset the aggregate arrays
		            start = i;
		            for (j = 0; j < valuesLen; j++) {
		                values[j].length = 0; // faster than values[j] = []
		                values[j].hasNulls = false;
		            }

		            // Advance on the group positions
		            pos += 1;

		            // don't loop beyond the last group
		            if (i === dataLength) {
		                break;
		            }
		        }

		        // break out
		        if (i === dataLength) {
		            break;
		        }

		        // for each raw data point, push it to an array that contains all values
		        // for this specific group
		        if (pointArrayMap) {

		            var index = series.cropStart + i,
		                point = (data && data[index]) ||
		                    series.pointClass.prototype.applyOptions.apply({
		                        series: series
		                    }, [dataOptions[index]]),
		                val;

		            for (j = 0; j < pointArrayMapLength; j++) {
		                val = point[pointArrayMap[j]];
		                if (isNumber(val)) {
		                    values[j].push(val);
		                } else if (val === null) {
		                    values[j].hasNulls = true;
		                }
		            }

		        } else {
		            pointY = handleYData ? yData[i] : null;

		            if (isNumber(pointY)) {
		                values[0].push(pointY);
		            } else if (pointY === null) {
		                values[0].hasNulls = true;
		            }
		        }
		    }

		    return [groupedXData, groupedYData, groupMap];
		};

		/**
		 * Extend the basic processData method, that crops the data to the current zoom
		 * range, with data grouping logic.
		 */
		seriesProto.processData = function () {
		    var series = this,
		        chart = series.chart,
		        options = series.options,
		        dataGroupingOptions = options.dataGrouping,
		        groupingEnabled = series.allowDG !== false && dataGroupingOptions &&
		            pick(dataGroupingOptions.enabled, chart.options.isStock),
		        visible = series.visible || !chart.options.chart.ignoreHiddenSeries,
		        hasGroupedData,
		        skip,
		        lastDataGrouping = this.currentDataGrouping,
		        currentDataGrouping,
		        croppedData;

		    // Run base method
		    series.forceCrop = groupingEnabled; // #334
		    series.groupPixelWidth = null; // #2110
		    series.hasProcessed = true; // #2692

		    // Skip if processData returns false or if grouping is disabled (in that
		    // order)
		    skip = (
		        baseProcessData.apply(series, arguments) === false ||
		        !groupingEnabled
		    );
		    if (!skip) {
		        series.destroyGroupedData();

		        var i,
		            processedXData = dataGroupingOptions.groupAll ? series.xData :
		                series.processedXData,
		            processedYData = dataGroupingOptions.groupAll ? series.yData :
		                series.processedYData,
		            plotSizeX = chart.plotSizeX,
		            xAxis = series.xAxis,
		            ordinal = xAxis.options.ordinal,
		            groupPixelWidth = series.groupPixelWidth =
		                xAxis.getGroupPixelWidth && xAxis.getGroupPixelWidth();

		        // Execute grouping if the amount of points is greater than the limit
		        // defined in groupPixelWidth
		        if (groupPixelWidth) {
		            hasGroupedData = true;

		            // Force recreation of point instances in series.translate, #5699
		            series.isDirty = true;
		            series.points = null; // #6709

		            var extremes = xAxis.getExtremes(),
		                xMin = extremes.min,
		                xMax = extremes.max,
		                groupIntervalFactor = (
		                    ordinal &&
		                    xAxis.getGroupIntervalFactor(xMin, xMax, series)
		                ) || 1,
		                interval =
		                    (groupPixelWidth * (xMax - xMin) / plotSizeX) *
		                    groupIntervalFactor,
		                groupPositions = xAxis.getTimeTicks(
		                    xAxis.normalizeTimeTickInterval(
		                        interval,
		                        dataGroupingOptions.units || defaultDataGroupingUnits
		                    ),
		                    // Processed data may extend beyond axis (#4907)
		                    Math.min(xMin, processedXData[0]),
		                    Math.max(xMax, processedXData[processedXData.length - 1]),
		                    xAxis.options.startOfWeek,
		                    processedXData,
		                    series.closestPointRange
		                ),
		                groupedData = seriesProto.groupData.apply(
		                    series,
		                    [
		                        processedXData,
		                        processedYData,
		                        groupPositions,
		                        dataGroupingOptions.approximation
		                    ]),
		                groupedXData = groupedData[0],
		                groupedYData = groupedData[1];

		            // Prevent the smoothed data to spill out left and right, and make
		            // sure data is not shifted to the left
		            if (dataGroupingOptions.smoothed && groupedXData.length) {
		                i = groupedXData.length - 1;
		                groupedXData[i] = Math.min(groupedXData[i], xMax);
		                while (i-- && i > 0) {
		                    groupedXData[i] += interval / 2;
		                }
		                groupedXData[0] = Math.max(groupedXData[0], xMin);
		            }

		            // Record what data grouping values were used
		            currentDataGrouping = groupPositions.info;
		            series.closestPointRange = groupPositions.info.totalRange;
		            series.groupMap = groupedData[2];

		            // Make sure the X axis extends to show the first group (#2533)
		            // But only for visible series (#5493, #6393)
		            if (
		                defined(groupedXData[0]) &&
		                groupedXData[0] < xAxis.dataMin &&
		                visible
		            ) {
		                if (xAxis.min <= xAxis.dataMin) {
		                    xAxis.min = groupedXData[0];
		                }
		                xAxis.dataMin = groupedXData[0];
		            }

		            // We calculated all group positions but we should render
		            // only the ones within the visible range
		            if (dataGroupingOptions.groupAll) {
		                croppedData = series.cropData(
		                    groupedXData,
		                    groupedYData,
		                    xAxis.min,
		                    xAxis.max,
		                    1 // Ordinal xAxis will remove left-most points otherwise
		                );
		                groupedXData = croppedData.xData;
		                groupedYData = croppedData.yData;
		            }
		            // Set series props
		            series.processedXData = groupedXData;
		            series.processedYData = groupedYData;
		        } else {
		            series.groupMap = null;
		        }
		        series.hasGroupedData = hasGroupedData;
		        series.currentDataGrouping = currentDataGrouping;

		        series.preventGraphAnimation =
		            (lastDataGrouping && lastDataGrouping.totalRange) !==
		            (currentDataGrouping && currentDataGrouping.totalRange);
		    }
		};

		/**
		 * Destroy the grouped data points. #622, #740
		 */
		seriesProto.destroyGroupedData = function () {

		    var groupedData = this.groupedData;

		    // clear previous groups
		    each(groupedData || [], function (point, i) {
		        if (point) {
		            groupedData[i] = point.destroy ? point.destroy() : null;
		        }
		    });
		    this.groupedData = null;
		};

		/**
		 * Override the generatePoints method by adding a reference to grouped data
		 */
		seriesProto.generatePoints = function () {

		    baseGeneratePoints.apply(this);

		    // Record grouped data in order to let it be destroyed the next time
		    // processData runs
		    this.destroyGroupedData(); // #622
		    this.groupedData = this.hasGroupedData ? this.points : null;
		};

		/**
		 * Override point prototype to throw a warning when trying to update grouped
		 * points
		 */
		addEvent(Point, 'update', function () {
		    if (this.dataGroup) {
		        H.error(24);
		        return false;
		    }
		});

		/**
		 * Extend the original method, make the tooltip's header reflect the grouped
		 * range
		 */
		wrap(Tooltip.prototype, 'tooltipFooterHeaderFormatter', function (
		    proceed,
		    labelConfig,
		    isFooter
		) {
		    var tooltip = this,
		        time = this.chart.time,
		        series = labelConfig.series,
		        options = series.options,
		        tooltipOptions = series.tooltipOptions,
		        dataGroupingOptions = options.dataGrouping,
		        xDateFormat = tooltipOptions.xDateFormat,
		        xDateFormatEnd,
		        xAxis = series.xAxis,
		        currentDataGrouping,
		        dateTimeLabelFormats,
		        labelFormats,
		        formattedKey;

		    // apply only to grouped series
		    if (
		        xAxis &&
		        xAxis.options.type === 'datetime' &&
		        dataGroupingOptions &&
		        isNumber(labelConfig.key)
		    ) {

		        // set variables
		        currentDataGrouping = series.currentDataGrouping;
		        dateTimeLabelFormats = dataGroupingOptions.dateTimeLabelFormats;

		        // if we have grouped data, use the grouping information to get the
		        // right format
		        if (currentDataGrouping) {
		            labelFormats = dateTimeLabelFormats[currentDataGrouping.unitName];
		            if (currentDataGrouping.count === 1) {
		                xDateFormat = labelFormats[0];
		            } else {
		                xDateFormat = labelFormats[1];
		                xDateFormatEnd = labelFormats[2];
		            }
		        // if not grouped, and we don't have set the xDateFormat option, get the
		        // best fit, so if the least distance between points is one minute, show
		        // it, but if the least distance is one day, skip hours and minutes etc.
		        } else if (!xDateFormat && dateTimeLabelFormats) {
		            xDateFormat = tooltip.getXDateFormat(
		                labelConfig,
		                tooltipOptions,
		                xAxis
		            );
		        }

		        // now format the key
		        formattedKey = time.dateFormat(xDateFormat, labelConfig.key);
		        if (xDateFormatEnd) {
		            formattedKey += time.dateFormat(
		                xDateFormatEnd,
		                labelConfig.key + currentDataGrouping.totalRange - 1
		            );
		        }

		        // return the replaced format
		        return format(
		            tooltipOptions[(isFooter ? 'footer' : 'header') + 'Format'], {
		                point: extend(labelConfig.point, { key: formattedKey }),
		                series: series
		            },
		            time
		        );

		    }

		    // else, fall back to the regular formatter
		    return proceed.call(tooltip, labelConfig, isFooter);
		});

		/**
		 * Destroy grouped data on series destroy
		 */
		addEvent(Series, 'destroy', seriesProto.destroyGroupedData);


		// Handle default options for data grouping. This must be set at runtime because
		// some series types are defined after this.
		addEvent(Series, 'afterSetOptions', function (e) {

		    var options = e.options,
		        type = this.type,
		        plotOptions = this.chart.options.plotOptions,
		        defaultOptions = defaultPlotOptions[type].dataGrouping,
		        // External series, for example technical indicators should also
		        // inherit commonOptions which are not available outside this module
		        baseOptions = this.useCommonDataGrouping && commonOptions;

		    if (specificOptions[type] || baseOptions) { // #1284
		        if (!defaultOptions) {
		            defaultOptions = merge(commonOptions, specificOptions[type]);
		        }

		        options.dataGrouping = merge(
		            baseOptions,
		            defaultOptions,
		            plotOptions.series && plotOptions.series.dataGrouping, // #1228
		            plotOptions[type].dataGrouping, // Set by the StockChart constructor
		            this.userOptions.dataGrouping
		        );
		    }

		    if (this.chart.options.isStock) {
		        this.requireSorting = true;
		    }
		});


		/**
		 * When resetting the scale reset the hasProccessed flag to avoid taking
		 * previous data grouping of neighbour series into accound when determining
		 * group pixel width (#2692).
		 */
		addEvent(Axis, 'afterSetScale', function () {
		    each(this.series, function (series) {
		        series.hasProcessed = false;
		    });
		});

		/**
		 * Get the data grouping pixel width based on the greatest defined individual
		 * width
		 * of the axis' series, and if whether one of the axes need grouping.
		 */
		Axis.prototype.getGroupPixelWidth = function () {

		    var series = this.series,
		        len = series.length,
		        i,
		        groupPixelWidth = 0,
		        doGrouping = false,
		        dataLength,
		        dgOptions;

		    // If multiple series are compared on the same x axis, give them the same
		    // group pixel width (#334)
		    i = len;
		    while (i--) {
		        dgOptions = series[i].options.dataGrouping;
		        if (dgOptions) {
		            groupPixelWidth = Math.max(
		                groupPixelWidth,
		                dgOptions.groupPixelWidth
		            );

		        }
		    }

		    // If one of the series needs grouping, apply it to all (#1634)
		    i = len;
		    while (i--) {
		        dgOptions = series[i].options.dataGrouping;

		        if (dgOptions && series[i].hasProcessed) { // #2692

		            dataLength = (series[i].processedXData || series[i].data).length;

		            // Execute grouping if the amount of points is greater than the
		            // limit defined in groupPixelWidth
		            if (
		                series[i].groupPixelWidth ||
		                dataLength > (this.chart.plotSizeX / groupPixelWidth) ||
		                (dataLength && dgOptions.forced)
		            ) {
		                doGrouping = true;
		            }
		        }
		    }

		    return doGrouping ? groupPixelWidth : 0;
		};

		/**
		 * Highstock only. Force data grouping on all the axis' series.
		 *
		 * @param  {SeriesDatagroupingOptions} [dataGrouping]
		 *         A `dataGrouping` configuration. Use `false` to disable data grouping
		 *         dynamically.
		 * @param  {Boolean} [redraw=true]
		 *         Whether to redraw the chart or wait for a later call to {@link
		 *         Chart#redraw}.
		 *
		 * @function setDataGrouping
		 * @memberOf Axis.prototype
		 */
		Axis.prototype.setDataGrouping = function (dataGrouping, redraw) {
		    var i;

		    redraw = pick(redraw, true);

		    if (!dataGrouping) {
		        dataGrouping = {
		            forced: false,
		            units: null
		        };
		    }

		    // Axis is instantiated, update all series
		    if (this instanceof Axis) {
		        i = this.series.length;
		        while (i--) {
		            this.series[i].update({
		                dataGrouping: dataGrouping
		            }, false);
		        }

		    // Axis not yet instanciated, alter series options
		    } else {
		        each(this.chart.options.series, function (seriesOptions) {
		            seriesOptions.dataGrouping = dataGrouping;
		        }, false);
		    }

		    // Clear ordinal slope, so we won't accidentaly use the old one (#7827)
		    this.ordinalSlope = null;

		    if (redraw) {
		        this.chart.redraw();
		    }
		};



		/* ****************************************************************************
		 * End data grouping module                                                   *
		 ******************************************************************************/

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var each = H.each,
		    Point = H.Point,
		    seriesType = H.seriesType,
		    seriesTypes = H.seriesTypes;

		/**
		 * The ohlc series type.
		 *
		 * @constructor seriesTypes.ohlc
		 * @augments seriesTypes.column
		 */
		/**
		 * An OHLC chart is a style of financial chart used to describe price
		 * movements over time. It displays open, high, low and close values per data
		 * point.
		 *
		 * @sample stock/demo/ohlc/ OHLC chart
		 * @extends {plotOptions.column}
		 * @excluding borderColor,borderRadius,borderWidth,crisp
		 * @product highstock
		 * @optionparent plotOptions.ohlc
		 */
		seriesType('ohlc', 'column', {

		    /**
		     * The approximate pixel width of each group. If for example a series
		     * with 30 points is displayed over a 600 pixel wide plot area, no grouping
		     * is performed. If however the series contains so many points that
		     * the spacing is less than the groupPixelWidth, Highcharts will try
		     * to group it into appropriate groups so that each is more or less
		     * two pixels wide. Defaults to `5`.
		     *
		     * @type {Number}
		     * @default 5
		     * @product highstock
		     * @apioption plotOptions.ohlc.dataGrouping.groupPixelWidth
		     */

		    /**
		     * The pixel width of the line/border. Defaults to `1`.
		     *
		     * @type {Number}
		     * @sample {highstock} stock/plotoptions/ohlc-linewidth/
		     *         A greater line width
		     * @default 1
		     * @product highstock
		     */
		    lineWidth: 1,

		    tooltip: {
        
		        pointFormat: '<span class="highcharts-color-{point.colorIndex}">\u25CF</span> <b> {series.name}</b><br/>' +
		            'Open: {point.open}<br/>' +
		            'High: {point.high}<br/>' +
		            'Low: {point.low}<br/>' +
		            'Close: {point.close}<br/>'
        
		    },

		    threshold: null,
    

		    stickyTracking: true

		}, /** @lends seriesTypes.ohlc */ {
		    directTouch: false,
		    pointArrayMap: ['open', 'high', 'low', 'close'],
		    toYData: function (point) { // return a plain array for speedy calculation
		        return [point.open, point.high, point.low, point.close];
		    },
		    pointValKey: 'close',

    

		    /**
		     * Translate data points from raw values x and y to plotX and plotY
		     */
		    translate: function () {
		        var series = this,
		            yAxis = series.yAxis,
		            hasModifyValue = !!series.modifyValue,
		            translated = [
		                'plotOpen',
		                'plotHigh',
		                'plotLow',
		                'plotClose',
		                'yBottom'
		            ]; // translate OHLC for

		        seriesTypes.column.prototype.translate.apply(series);

		        // Do the translation
		        each(series.points, function (point) {
		            each(
		                [point.open, point.high, point.low, point.close, point.low],
		                function (value, i) {
		                    if (value !== null) {
		                        if (hasModifyValue) {
		                            value = series.modifyValue(value);
		                        }
		                        point[translated[i]] = yAxis.toPixels(value, true);
		                    }
		                }
		            );

		            // Align the tooltip to the high value to avoid covering the point
		            point.tooltipPos[1] =
		                point.plotHigh + yAxis.pos - series.chart.plotTop;
		        });
		    },

		    /**
		     * Draw the data points
		     */
		    drawPoints: function () {
		        var series = this,
		            points = series.points,
		            chart = series.chart;


		        each(points, function (point) {
		            var plotOpen,
		                plotClose,
		                crispCorr,
		                halfWidth,
		                path,
		                graphic = point.graphic,
		                crispX,
		                isNew = !graphic;

		            if (point.plotY !== undefined) {

		                // Create and/or update the graphic
		                if (!graphic) {
		                    point.graphic = graphic = chart.renderer.path()
		                        .add(series.group);
		                }

                

		                // crisp vector coordinates
		                crispCorr = (graphic.strokeWidth() % 2) / 2;
		                crispX = Math.round(point.plotX) - crispCorr;  // #2596
		                halfWidth = Math.round(point.shapeArgs.width / 2);

		                // the vertical stem
		                path = [
		                    'M',
		                    crispX, Math.round(point.yBottom),
		                    'L',
		                    crispX, Math.round(point.plotHigh)
		                ];

		                // open
		                if (point.open !== null) {
		                    plotOpen = Math.round(point.plotOpen) + crispCorr;
		                    path.push(
		                        'M',
		                        crispX,
		                        plotOpen,
		                        'L',
		                        crispX - halfWidth,
		                        plotOpen
		                    );
		                }

		                // close
		                if (point.close !== null) {
		                    plotClose = Math.round(point.plotClose) + crispCorr;
		                    path.push(
		                        'M',
		                        crispX,
		                        plotClose,
		                        'L',
		                        crispX + halfWidth,
		                        plotClose
		                    );
		                }

		                graphic[isNew ? 'attr' : 'animate']({ d: path })
		                    .addClass(point.getClassName(), true);

		            }


		        });

		    },

		    animate: null // Disable animation

		}, /** @lends seriesTypes.ohlc.prototype.pointClass.prototype */ {
		    /**
		      * Extend the parent method by adding up or down to the class name.
		      */
		    getClassName: function () {
		        return Point.prototype.getClassName.call(this) +
		            (
		                this.open < this.close ?
		                    ' highcharts-point-up' :
		                    ' highcharts-point-down'
		            );
		    }
		});

		/**
		 * A `ohlc` series. If the [type](#series.ohlc.type) option is not
		 * specified, it is inherited from [chart.type](#chart.type).
		 *
		 * @type {Object}
		 * @extends series,plotOptions.ohlc
		 * @excluding dataParser,dataURL
		 * @product highstock
		 * @apioption series.ohlc
		 */

		/**
		 * An array of data points for the series. For the `ohlc` series type,
		 * points can be given in the following ways:
		 *
		 * 1.  An array of arrays with 5 or 4 values. In this case, the values
		 * correspond to `x,open,high,low,close`. If the first value is a string,
		 * it is applied as the name of the point, and the `x` value is inferred.
		 * The `x` value can also be omitted, in which case the inner arrays
		 * should be of length 4\. Then the `x` value is automatically calculated,
		 * either starting at 0 and incremented by 1, or from `pointStart`
		 * and `pointInterval` given in the series options.
		 *
		 *  ```js
		 *     data: [
		 *         [0, 6, 5, 6, 7],
		 *         [1, 9, 4, 8, 2],
		 *         [2, 6, 3, 4, 10]
		 *     ]
		 *  ```
		 *
		 * 2.  An array of objects with named values. The objects are point
		 * configuration objects as seen below. If the total number of data
		 * points exceeds the series' [turboThreshold](#series.ohlc.turboThreshold),
		 * this option is not available.
		 *
		 *  ```js
		 *     data: [{
		 *         x: 1,
		 *         open: 3,
		 *         high: 4,
		 *         low: 5,
		 *         close: 2,
		 *         name: "Point2",
		 *         color: "#00FF00"
		 *     }, {
		 *         x: 1,
		 *         open: 4,
		 *         high: 3,
		 *         low: 6,
		 *         close: 7,
		 *         name: "Point1",
		 *         color: "#FF00FF"
		 *     }]
		 *  ```
		 *
		 * @type {Array<Object|Array>}
		 * @extends series.arearange.data
		 * @excluding y,marker
		 * @product highstock
		 * @apioption series.ohlc.data
		 */

		/**
		 * The closing value of each data point.
		 *
		 * @type {Number}
		 * @product highstock
		 * @apioption series.ohlc.data.close
		 */

		/**
		 * The opening value of each data point.
		 *
		 * @type {Number}
		 * @product highstock
		 * @apioption series.ohlc.data.open
		 */

	}(Highcharts));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var defaultPlotOptions = H.defaultPlotOptions,
		    each = H.each,
		    merge = H.merge,
		    seriesType = H.seriesType,
		    seriesTypes = H.seriesTypes;

		/**
		 * A candlestick chart is a style of financial chart used to describe price
		 * movements over time.
		 *
		 * @sample stock/demo/candlestick/ Candlestick chart
		 *
		 * @extends {plotOptions.ohlc}
		 * @excluding borderColor,borderRadius,borderWidth
		 * @product highstock
		 * @optionparent plotOptions.candlestick
		 */
		var candlestickOptions = {

		    /**
		     * The specific line color for up candle sticks. The default is to inherit
		     * the general `lineColor` setting.
		     *
		     * @type {Color}
		     * @sample  {highstock} stock/plotoptions/candlestick-linecolor/
		     *          Candlestick line colors
		     * @default null
		     * @since 1.3.6
		     * @product highstock
		     * @apioption plotOptions.candlestick.upLineColor
		     */

		    /**
		     * @default ohlc
		     * @apioption plotOptions.candlestick.dataGrouping.approximation
		     */

		    states: {

		        /**
		         * @extends plotOptions.column.states.hover
		         * @product highstock
		         */
		        hover: {

		            /**
		             * The pixel width of the line/border around the candlestick.
		             *
		             * @type {Number}
		             * @default 2
		             * @product highstock
		             */
		            lineWidth: 2
		        }
		    },

		    /**
		     * @extends {plotOptions.ohlc.tooltip}
		     */
		    tooltip: defaultPlotOptions.ohlc.tooltip,

		    threshold: null,
    

		    stickyTracking: true

		};

		/**
		 * The candlestick series type.
		 *
		 * @constructor seriesTypes.candlestick
		 * @augments seriesTypes.ohlc
		 */
		seriesType('candlestick', 'ohlc', merge(
		    defaultPlotOptions.column,
		    candlestickOptions
		), /** @lends seriesTypes.candlestick */ {
    
		    /**
		     * Draw the data points
		     */
		    drawPoints: function () {
		        var series = this,
		            points = series.points,
		            chart = series.chart;


		        each(points, function (point) {

		            var graphic = point.graphic,
		                plotOpen,
		                plotClose,
		                topBox,
		                bottomBox,
		                hasTopWhisker,
		                hasBottomWhisker,
		                crispCorr,
		                crispX,
		                path,
		                halfWidth,
		                isNew = !graphic;

		            if (point.plotY !== undefined) {

		                if (!graphic) {
		                    point.graphic = graphic = chart.renderer.path()
		                        .add(series.group);
		                }

                

		                // Crisp vector coordinates
		                crispCorr = (graphic.strokeWidth() % 2) / 2;
		                crispX = Math.round(point.plotX) - crispCorr; // #2596
		                plotOpen = point.plotOpen;
		                plotClose = point.plotClose;
		                topBox = Math.min(plotOpen, plotClose);
		                bottomBox = Math.max(plotOpen, plotClose);
		                halfWidth = Math.round(point.shapeArgs.width / 2);
		                hasTopWhisker =
		                    Math.round(topBox) !== Math.round(point.plotHigh);
		                hasBottomWhisker = bottomBox !== point.yBottom;
		                topBox = Math.round(topBox) + crispCorr;
		                bottomBox = Math.round(bottomBox) + crispCorr;

		                // Create the path. Due to a bug in Chrome 49, the path is first
		                // instanciated with no values, then the values pushed. For
		                // unknown reasons, instanciating the path array with all the
		                // values would lead to a crash when updating frequently
		                // (#5193).
		                path = [];
		                path.push(
		                    'M',
		                    crispX - halfWidth, bottomBox,
		                    'L',
		                    crispX - halfWidth, topBox,
		                    'L',
		                    crispX + halfWidth, topBox,
		                    'L',
		                    crispX + halfWidth, bottomBox,
		                    'Z', // Ensure a nice rectangle #2602
		                    'M',
		                    crispX, topBox,
		                    'L',
		                    // #460, #2094
		                    crispX, hasTopWhisker ? Math.round(point.plotHigh) : topBox,
		                    'M',
		                    crispX, bottomBox,
		                    'L',
		                    // #460, #2094
		                    crispX, hasBottomWhisker ?
		                        Math.round(point.yBottom) :
		                        bottomBox
		                );

		                graphic[isNew ? 'attr' : 'animate']({ d: path })
		                    .addClass(point.getClassName(), true);

		            }
		        });

		    }


		});

		/**
		 * A `candlestick` series. If the [type](#series.candlestick.type)
		 * option is not specified, it is inherited from [chart.type](
		 * #chart.type).
		 *
		 * @type {Object}
		 * @extends series,plotOptions.candlestick
		 * @excluding dataParser,dataURL
		 * @product highstock
		 * @apioption series.candlestick
		 */

		/**
		 * An array of data points for the series. For the `candlestick` series
		 * type, points can be given in the following ways:
		 *
		 * 1.  An array of arrays with 5 or 4 values. In this case, the values
		 * correspond to `x,open,high,low,close`. If the first value is a string,
		 * it is applied as the name of the point, and the `x` value is inferred.
		 * The `x` value can also be omitted, in which case the inner arrays
		 * should be of length 4\. Then the `x` value is automatically calculated,
		 * either starting at 0 and incremented by 1, or from `pointStart`
		 * and `pointInterval` given in the series options.
		 *
		 *  ```js
		 *     data: [
		 *         [0, 7, 2, 0, 4],
		 *         [1, 1, 4, 2, 8],
		 *         [2, 3, 3, 9, 3]
		 *     ]
		 *  ```
		 *
		 * 2.  An array of objects with named values. The objects are point
		 * configuration objects as seen below. If the total number of data
		 * points exceeds the series' [turboThreshold](
		 * #series.candlestick.turboThreshold), this option is not available.
		 *
		 *  ```js
		 *     data: [{
		 *         x: 1,
		 *         open: 9,
		 *         high: 2,
		 *         low: 4,
		 *         close: 6,
		 *         name: "Point2",
		 *         color: "#00FF00"
		 *     }, {
		 *         x: 1,
		 *         open: 1,
		 *         high: 4,
		 *         low: 7,
		 *         close: 7,
		 *         name: "Point1",
		 *         color: "#FF00FF"
		 *     }]
		 *  ```
		 *
		 * @type {Array<Object|Array>}
		 * @extends series.ohlc.data
		 * @excluding y
		 * @product highstock
		 * @apioption series.candlestick.data
		 */

	}(Highcharts));
	var onSeriesMixin = (function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */

		var each = H.each,
		    defined = H.defined,
		    seriesTypes = H.seriesTypes,
		    stableSort = H.stableSort;

		var onSeriesMixin = {

		    /**
		     * Override getPlotBox. If the onSeries option is valid, return the plot box
		     * of the onSeries, otherwise proceed as usual.
		     */
		    getPlotBox: function () {
		        return H.Series.prototype.getPlotBox.call(
		            (
		                this.options.onSeries &&
		                this.chart.get(this.options.onSeries)
		            ) || this
		        );
		    },

		    /**
		     * Extend the translate method by placing the point on the related series
		     */
		    translate: function () {

		        seriesTypes.column.prototype.translate.apply(this);

		        var series = this,
		            options = series.options,
		            chart = series.chart,
		            points = series.points,
		            cursor = points.length - 1,
		            point,
		            lastPoint,
		            optionsOnSeries = options.onSeries,
		            onSeries = optionsOnSeries && chart.get(optionsOnSeries),
		            onKey = options.onKey || 'y',
		            step = onSeries && onSeries.options.step,
		            onData = onSeries && onSeries.points,
		            i = onData && onData.length,
		            inverted = chart.inverted,
		            xAxis = series.xAxis,
		            yAxis = series.yAxis,
		            xOffset = 0,
		            leftPoint,
		            lastX,
		            rightPoint,
		            currentDataGrouping,
		            distanceRatio;

		        // relate to a master series
		        if (onSeries && onSeries.visible && i) {
		            xOffset = (onSeries.pointXOffset || 0) + (onSeries.barW || 0) / 2;
		            currentDataGrouping = onSeries.currentDataGrouping;
		            lastX = (
		                onData[i - 1].x +
		                (currentDataGrouping ? currentDataGrouping.totalRange : 0)
		            ); // #2374

		            // sort the data points
		            stableSort(points, function (a, b) {
		                return (a.x - b.x);
		            });

		            onKey = 'plot' + onKey[0].toUpperCase() + onKey.substr(1);
		            while (i-- && points[cursor]) {
		                leftPoint = onData[i];
		                point = points[cursor];
		                point.y = leftPoint.y;

		                if (leftPoint.x <= point.x && leftPoint[onKey] !== undefined) {
		                    if (point.x <= lastX) { // #803

		                        point.plotY = leftPoint[onKey];

		                        // interpolate between points, #666
		                        if (leftPoint.x < point.x && !step) {
		                            rightPoint = onData[i + 1];
		                            if (rightPoint && rightPoint[onKey] !== undefined) {
		                                // the distance ratio, between 0 and 1
		                                distanceRatio = (point.x - leftPoint.x) /
		                                    (rightPoint.x - leftPoint.x);
		                                point.plotY +=
		                                    distanceRatio *
		                                    // the plotY distance
		                                    (rightPoint[onKey] - leftPoint[onKey]);
		                                point.y +=
		                                    distanceRatio *
		                                    (rightPoint.y - leftPoint.y);
		                            }
		                        }
		                    }
		                    cursor--;
		                    i++; // check again for points in the same x position
		                    if (cursor < 0) {
		                        break;
		                    }
		                }
		            }
		        }

		        // Add plotY position and handle stacking
		        each(points, function (point, i) {

		            var stackIndex;

		            point.plotX += xOffset; // #2049

		            // Undefined plotY means the point is either on axis, outside series
		            // range or hidden series. If the series is outside the range of the
		            // x axis it should fall through with an undefined plotY, but then
		            // we must remove the shapeArgs (#847). For inverted charts, we need
		            // to calculate position anyway, because series.invertGroups is not
		            // defined
		            if (point.plotY === undefined || inverted) {
		                if (point.plotX >= 0 && point.plotX <= xAxis.len) {
		                    // We're inside xAxis range
		                    if (inverted) {
		                        point.plotY = xAxis.translate(point.x, 0, 1, 0, 1);
		                        point.plotX = defined(point.y) ?
		                            yAxis.translate(point.y, 0, 0, 0, 1) : 0;
		                    } else {
		                        point.plotY = chart.chartHeight - xAxis.bottom -
		                            (xAxis.opposite ? xAxis.height : 0) +
		                            xAxis.offset - yAxis.top; // #3517
		                    }
		                } else {
		                    point.shapeArgs = {}; // 847
		                }
		            }

		            // if multiple flags appear at the same x, order them into a stack
		            lastPoint = points[i - 1];
		            if (lastPoint && lastPoint.plotX === point.plotX) {
		                if (lastPoint.stackIndex === undefined) {
		                    lastPoint.stackIndex = 0;
		                }
		                stackIndex = lastPoint.stackIndex + 1;
		            }
		            point.stackIndex = stackIndex; // #3639
		        });

		        this.onSeries = onSeries;
		    }
		};

		return onSeriesMixin;
	}(Highcharts));
	(function (H, onSeriesMixin) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		var addEvent = H.addEvent,
		    each = H.each,
		    merge = H.merge,
		    noop = H.noop,
		    Renderer = H.Renderer,
		    Series = H.Series,
		    seriesType = H.seriesType,
		    SVGRenderer = H.SVGRenderer,
		    TrackerMixin = H.TrackerMixin,
		    VMLRenderer = H.VMLRenderer,
		    symbols = SVGRenderer.prototype.symbols;

		/**
		 * The Flags series.
		 *
		 * @constructor seriesTypes.flags
		 * @augments seriesTypes.column
		 */
		/**
		 * Flags are used to mark events in stock charts. They can be added on the
		 * timeline, or attached to a specific series.
		 *
		 * @sample       stock/demo/flags-general/ Flags on a line series
		 * @extends      {plotOptions.column}
		 * @excluding    animation,borderColor,borderRadius,borderWidth,colorByPoint,
		 *               dataGrouping,pointPadding,pointWidth,turboThreshold
		 * @product      highstock
		 * @optionparent plotOptions.flags
		 */
		seriesType('flags', 'column', {

		    /**
		     * In case the flag is placed on a series, on what point key to place
		     * it. Line and columns have one key, `y`. In range or OHLC-type series,
		     * however, the flag can optionally be placed on the `open`, `high`,
		     *  `low` or `close` key.
		     *
		     * @validvalue ["y", "open", "high", "low", "close"]
		     * @type       {String}
		     * @sample     {highstock} stock/plotoptions/flags-onkey/
		     *             Range series, flag on high
		     * @default    y
		     * @since      4.2.2
		     * @product    highstock
		     * @apioption  plotOptions.flags.onKey
		     */

		    /**
		     * The id of the series that the flags should be drawn on. If no id
		     * is given, the flags are drawn on the x axis.
		     *
		     * @type      {String}
		     * @sample    {highstock} stock/plotoptions/flags/
		     *            Flags on series and on x axis
		     * @default   undefined
		     * @product   highstock
		     * @apioption plotOptions.flags.onSeries
		     */

		    pointRange: 0, // #673

		    /**
		     * Whether the flags are allowed to overlap sideways. If `false`, the flags
		     * are moved sideways using an algorithm that seeks to place every flag as
		     * close as possible to its original position.
		     *
		     * @sample {highstock} stock/plotoptions/flags-allowoverlapx
		     *         Allow sideways overlap
		     * @since  6.0.4
		     */
		    allowOverlapX: false,

		    /**
		     * The shape of the marker. Can be one of "flag", "circlepin", "squarepin",
		     * or an image on the format `url(/path-to-image.jpg)`. Individual
		     * shapes can also be set for each point.
		     *
		     * @validvalue ["flag", "circlepin", "squarepin"]
		     * @sample     {highstock} stock/plotoptions/flags/ Different shapes
		     * @product    highstock
		     */
		    shape: 'flag',

		    /**
		     * When multiple flags in the same series fall on the same value, this
		     * number determines the vertical offset between them.
		     *
		     * @sample  {highstock} stock/plotoptions/flags-stackdistance/
		     *          A greater stack distance
		     * @product highstock
		     */
		    stackDistance: 12,

		    /**
		     * Text alignment for the text inside the flag.
		     *
		     * @validvalue ["left", "center", "right"]
		     * @since      5.0.0
		     * @product    highstock
		     */
		    textAlign: 'center',

		    /**
		     * Specific tooltip options for flag series. Flag series tooltips are
		     * different from most other types in that a flag doesn't have a data
		     * value, so the tooltip rather displays the `text` option for each
		     * point.
		     *
		     * @type      {Object}
		     * @extends   plotOptions.series.tooltip
		     * @excluding changeDecimals,valueDecimals,valuePrefix,valueSuffix
		     * @product   highstock
		     */
		    tooltip: {
		        pointFormat: '{point.text}<br/>'
		    },

		    threshold: null,

		    /**
		     * The text to display on each flag. This can be defined on series level,
		     *  or individually for each point. Defaults to `"A"`.
		     *
		     * @type      {String}
		     * @default   A
		     * @product   highstock
		     * @apioption plotOptions.flags.title
		     */

		    /**
		     * The y position of the top left corner of the flag relative to either
		     * the series (if onSeries is defined), or the x axis. Defaults to
		     * `-30`.
		     *
		     * @product highstock
		     */
		    y: -30,

		    /**
		     * Whether to use HTML to render the flag texts. Using HTML allows for
		     * advanced formatting, images and reliable bi-directional text rendering.
		     * Note that exported images won't respect the HTML, and that HTML
		     * won't respect Z-index settings.
		     *
		     * @type      {Boolean}
		     * @default   false
		     * @since     1.3
		     * @product   highstock
		     * @apioption plotOptions.flags.useHTML
		     */

    

		}, /** @lends seriesTypes.flags.prototype */ {
		    sorted: false,
		    noSharedTooltip: true,
		    allowDG: false,
		    takeOrdinalPosition: false, // #1074
		    trackerGroups: ['markerGroup'],
		    forceCrop: true,
		    /**
		     * Inherit the initialization from base Series.
		     */
		    init: Series.prototype.init,

    

		    translate: onSeriesMixin.translate,
		    getPlotBox: onSeriesMixin.getPlotBox,

		    /**
		     * Draw the markers
		     */
		    drawPoints: function () {
		        var series = this,
		            points = series.points,
		            chart = series.chart,
		            renderer = chart.renderer,
		            plotX,
		            plotY,
		            inverted = chart.inverted,
		            options = series.options,
		            optionsY = options.y,
		            shape,
		            i,
		            point,
		            graphic,
		            stackIndex,
		            anchorY,
		            attribs,
		            outsideRight,
		            yAxis = series.yAxis,
		            boxesMap = {},
		            boxes = [];

		        i = points.length;
		        while (i--) {
		            point = points[i];
		            outsideRight =
		                (inverted ? point.plotY : point.plotX) > series.xAxis.len;
		            plotX = point.plotX;
		            stackIndex = point.stackIndex;
		            shape = point.options.shape || options.shape;
		            plotY = point.plotY;

		            if (plotY !== undefined) {
		                plotY = point.plotY + optionsY -
		                    (
		                        stackIndex !== undefined &&
		                        stackIndex * options.stackDistance
		                    );
		            }
		            // skip connectors for higher level stacked points
		            point.anchorX = stackIndex ? undefined : point.plotX;
		            anchorY = stackIndex ? undefined : point.plotY;

		            graphic = point.graphic;

		            // Only draw the point if y is defined and the flag is within
		            // the visible area
		            if (plotY !== undefined && plotX >= 0 && !outsideRight) {

		                // Create the flag
		                if (!graphic) {
		                    graphic = point.graphic = renderer.label(
		                        '',
		                        null,
		                        null,
		                        shape,
		                        null,
		                        null,
		                        options.useHTML
		                    )
                    
		                    .attr({
		                        align: shape === 'flag' ? 'left' : 'center',
		                        width: options.width,
		                        height: options.height,
		                        'text-align': options.textAlign
		                    })
		                    .addClass('highcharts-point')
		                    .add(series.markerGroup);

		                    // Add reference to the point for tracker (#6303)
		                    if (point.graphic.div) {
		                        point.graphic.div.point = point;
		                    }

                    
		                    graphic.isNew = true;
		                }

		                if (plotX > 0) { // #3119
		                    plotX -= graphic.strokeWidth() % 2; // #4285
		                }

		                // Plant the flag
		                attribs = {
		                    y: plotY,
		                    anchorY: anchorY
		                };
		                if (options.allowOverlapX) {
		                    attribs.x = plotX;
		                    attribs.anchorX = point.anchorX;
		                }
		                graphic.attr({
		                    text: point.options.title || options.title || 'A'
		                })[graphic.isNew ? 'attr' : 'animate'](attribs);

		                // Rig for the distribute function
		                if (!options.allowOverlapX) {
		                    if (!boxesMap[point.plotX]) {
		                        boxesMap[point.plotX] = {
		                            align: 0,
		                            size: graphic.width,
		                            target: plotX,
		                            anchorX: plotX
		                        };
		                    } else {
		                        boxesMap[point.plotX].size = Math.max(
		                            boxesMap[point.plotX].size,
		                            graphic.width
		                        );
		                    }
		                }

		                // Set the tooltip anchor position
		                point.tooltipPos = [
		                    plotX,
		                    plotY + yAxis.pos - chart.plotTop
		                ]; // #6327

		            } else if (graphic) {
		                point.graphic = graphic.destroy();
		            }

		        }

		        // Handle X-dimension overlapping
		        if (!options.allowOverlapX) {
		            H.objectEach(boxesMap, function (box) {
		                box.plotX = box.anchorX;
		                boxes.push(box);
		            });

		            H.distribute(boxes, inverted ? yAxis.len : this.xAxis.len, 100);

		            each(points, function (point) {
		                var box = point.graphic && boxesMap[point.plotX];
		                if (box) {
		                    point.graphic[point.graphic.isNew ? 'attr' : 'animate']({
		                        x: box.pos,
		                        anchorX: point.anchorX
		                    });
		                    point.graphic.isNew = false;
		                }
		            });
		        }

		        // Might be a mix of SVG and HTML and we need events for both (#6303)
		        if (options.useHTML) {
		            H.wrap(series.markerGroup, 'on', function (proceed) {
		                return H.SVGElement.prototype.on.apply(
		                    // for HTML
		                    proceed.apply(this, [].slice.call(arguments, 1)),
		                    // and for SVG
		                    [].slice.call(arguments, 1));
		            });
		        }

		    },

		    /**
		     * Extend the column trackers with listeners to expand and contract stacks
		     */
		    drawTracker: function () {
		        var series = this,
		            points = series.points;

		        TrackerMixin.drawTrackerPoint.apply(this);

		        /**
		         * Bring each stacked flag up on mouse over, this allows readability
		         * of vertically stacked elements as well as tight points on
		         * the x axis. #1924.
		         */
		        each(points, function (point) {
		            var graphic = point.graphic;
		            if (graphic) {
		                addEvent(graphic.element, 'mouseover', function () {

		                    // Raise this point
		                    if (point.stackIndex > 0 && !point.raised) {
		                        point._y = graphic.y;
		                        graphic.attr({
		                            y: point._y - 8
		                        });
		                        point.raised = true;
		                    }

		                    // Revert other raised points
		                    each(points, function (otherPoint) {
		                        if (
		                            otherPoint !== point &&
		                            otherPoint.raised &&
		                            otherPoint.graphic
		                        ) {
		                            otherPoint.graphic.attr({
		                                y: otherPoint._y
		                            });
		                            otherPoint.raised = false;
		                        }
		                    });
		                });
		            }
		        });
		    },

		    animate: noop, // Disable animation
		    buildKDTree: noop,
		    setClip: noop,
		    /**
		     * Don't invert the flag marker group (#4960)
		     */
		    invertGroups: noop

		});

		// create the flag icon with anchor
		symbols.flag = function (x, y, w, h, options) {
		    var anchorX = (options && options.anchorX) || x,
		        anchorY = (options &&  options.anchorY) || y;

		    return symbols.circle(anchorX - 1, anchorY - 1, 2, 2).concat(
		        [
		            'M', anchorX, anchorY,
		            'L', x, y + h,
		            x, y,
		            x + w, y,
		            x + w, y + h,
		            x, y + h,
		            'Z'
		        ]
		    );
		};

		/*
		 * Create the circlepin and squarepin icons with anchor
		 */
		function createPinSymbol(shape) {
		    symbols[shape + 'pin'] = function (x, y, w, h, options) {

		        var anchorX = options && options.anchorX,
		            anchorY = options &&  options.anchorY,
		            path,
		            labelTopOrBottomY;

		        // For single-letter flags, make sure circular flags are not taller
		        // than their width
		        if (shape === 'circle' && h > w) {
		            x -= Math.round((h - w) / 2);
		            w = h;
		        }

		        path = symbols[shape](x, y, w, h);

		        if (anchorX && anchorY) {
		            /**
		             * If the label is below the anchor, draw the connecting line
		             * from the top edge of the label
		             * otherwise start drawing from the bottom edge
		             */
		            labelTopOrBottomY = (y > anchorY) ? y : y + h;
		            path.push(
		                'M',
		                shape === 'circle' ? path[1] - path[4] : path[1] + path[4] / 2,
		                labelTopOrBottomY,
		                'L',
		                anchorX,
		                anchorY
		            );
		            path = path.concat(
		                symbols.circle(anchorX - 1, anchorY - 1, 2, 2)
		            );
		        }

		        return path;
		    };
		}
		createPinSymbol('circle');
		createPinSymbol('square');



		/**
		 * A `flags` series. If the [type](#series.flags.type) option is not
		 * specified, it is inherited from [chart.type](#chart.type).
		 *
		 * @type      {Object}
		 * @extends   series,plotOptions.flags
		 * @excluding dataParser,dataURL
		 * @product   highstock
		 * @apioption series.flags
		 */

		/**
		 * An array of data points for the series. For the `flags` series type,
		 * points can be given in the following ways:
		 *
		 * 1.  An array of objects with named values. The objects are point
		 * configuration objects as seen below. If the total number of data
		 * points exceeds the series' [turboThreshold](#series.flags.turboThreshold),
		 * this option is not available.
		 *
		 *  ```js
		 *     data: [{
		 *     x: 1,
		 *     title: "A",
		 *     text: "First event"
		 * }, {
		 *     x: 1,
		 *     title: "B",
		 *     text: "Second event"
		 * }]</pre>
		 *
		 * @type {Array<Object>}
		 * @extends series.line.data
		 * @excluding y,dataLabels,marker,name
		 * @product highstock
		 * @apioption series.flags.data
		 */

		/**
		 * The fill color of an individual flag. By default it inherits from
		 * the series color.
		 *
		 * @type      {Color}
		 * @product   highstock
		 * @apioption series.flags.data.fillColor
		 */

		/**
		 * The longer text to be shown in the flag's tooltip.
		 *
		 * @type      {String}
		 * @product   highstock
		 * @apioption series.flags.data.text
		 */

		/**
		 * The short text to be shown on the flag.
		 *
		 * @type      {String}
		 * @product   highstock
		 * @apioption series.flags.data.title
		 */

	}(Highcharts, onSeriesMixin));
	(function (H) {
		/**
		 * (c) 2010-2017 Torstein Honsi
		 *
		 * License: www.highcharts.com/license
		 */
		/* eslint max-len: 0 */
		var addEvent = H.addEvent,
		    Axis = H.Axis,
		    correctFloat = H.correctFloat,
		    defaultOptions = H.defaultOptions,
		    defined = H.defined,
		    destroyObjectProperties = H.destroyObjectProperties,
		    each = H.each,
		    fireEvent = H.fireEvent,
		    hasTouch = H.hasTouch,
		    isTouchDevice = H.isTouchDevice,
		    merge = H.merge,
		    pick = H.pick,
		    removeEvent = H.removeEvent,
		    svg = H.svg,
		    wrap = H.wrap,
		    swapXY;

		/**
		 *
		 * The scrollbar is a means of panning over the X axis of a stock chart.
		 * Scrollbars can  also be applied to other types of axes, see for example
		 * [scrollable bar chart](http://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/stock/yaxis/inverted-bar-scrollbar/).
		 *
		 * Another approach to scrollable charts is the [chart.scrollablePlotArea](
		 * https://api.highcharts.com/highcharts/chart.scrollablePlotArea) option that
		 * is especially suitable for simpler cartesian charts on mobile.
		 *
		 * In styled mode, all the presentational options for the
		 * scrollbar are replaced by the classes `.highcharts-scrollbar-thumb`,
		 * `.highcharts-scrollbar-arrow`, `.highcharts-scrollbar-button`,
		 * `.highcharts-scrollbar-rifles` and `.highcharts-scrollbar-track`.
		 *
		 * @product highstock
		 * @optionparent scrollbar
		 */
		var defaultScrollbarOptions =  {

		    /**
		     * The height of the scrollbar. The height also applies to the width
		     * of the scroll arrows so that they are always squares. Defaults to
		     * 20 for touch devices and 14 for mouse devices.
		     *
		     * @type {Number}
		     * @sample {highstock} stock/scrollbar/height/ A 30px scrollbar
		     * @product highstock
		     */
		    height: isTouchDevice ? 20 : 14,

		    /**
		     * The border rounding radius of the bar.
		     *
		     * @type {Number}
		     * @sample {highstock} stock/scrollbar/style/ Scrollbar styling
		     * @default 0
		     * @product highstock
		     */
		    barBorderRadius: 0,

		    /**
		     * The corner radius of the scrollbar buttons.
		     *
		     * @type {Number}
		     * @sample {highstock} stock/scrollbar/style/ Scrollbar styling
		     * @default 0
		     * @product highstock
		     */
		    buttonBorderRadius: 0,

		    /**
		     * Whether to redraw the main chart as the scrollbar or the navigator
		     * zoomed window is moved. Defaults to `true` for modern browsers and
		     * `false` for legacy IE browsers as well as mobile devices.
		     *
		     * @type {Boolean}
		     * @since 1.3
		     * @product highstock
		     */
		    liveRedraw: svg && !isTouchDevice,

		    /**
		     * The margin between the scrollbar and its axis when the scrollbar is
		     * applied directly to an axis.
		     */
		    margin: 10,

		    /**
		     * The minimum width of the scrollbar.
		     *
		     * @type {Number}
		     * @default 6
		     * @since 1.2.5
		     * @product highstock
		     */
		    minWidth: 6,

		    step: 0.2,

		    /**
		     * The z index of the scrollbar group.
		     */
		    zIndex: 3
    
		};

		defaultOptions.scrollbar = merge(true, defaultScrollbarOptions, defaultOptions.scrollbar);

		/**
		* When we have vertical scrollbar, rifles and arrow in buttons should be rotated.
		* The same method is used in Navigator's handles, to rotate them.
		* @param {Array} path - path to be rotated
		* @param {Boolean} vertical - if vertical scrollbar, swap x-y values
		*/
		H.swapXY = swapXY = function (path, vertical) {
		    var i,
		        len = path.length,
		        temp;

		    if (vertical) {
		        for (i = 0; i < len; i += 3) {
		            temp = path[i + 1];
		            path[i + 1] = path[i + 2];
		            path[i + 2] = temp;
		        }
		    }

		    return path;
		};

		/**
		 * A reusable scrollbar, internally used in Highstock's navigator and optionally
		 * on individual axes.
		 *
		 * @class
		 * @param {Object} renderer
		 * @param {Object} options
		 * @param {Object} chart
		 */
		function Scrollbar(renderer, options, chart) { // docs
		    this.init(renderer, options, chart);
		}

		Scrollbar.prototype = {

		    init: function (renderer, options, chart) {

		        this.scrollbarButtons = [];

		        this.renderer = renderer;

		        this.userOptions = options;
		        this.options = merge(defaultScrollbarOptions, options);

		        this.chart = chart;

		        this.size = pick(this.options.size, this.options.height); // backward compatibility

		        // Init
		        if (options.enabled) {
		            this.render();
		            this.initEvents();
		            this.addEvents();
		        }
		    },

		    /**
		    * Render scrollbar with all required items.
		    */
		    render: function () {
		        var scroller = this,
		            renderer = scroller.renderer,
		            options = scroller.options,
		            size = scroller.size,
		            group;

		        // Draw the scrollbar group
		        scroller.group = group = renderer.g('scrollbar').attr({
		            zIndex: options.zIndex,
		            translateY: -99999
		        }).add();

		        // Draw the scrollbar track:
		        scroller.track = renderer.rect()
		            .addClass('highcharts-scrollbar-track')
		            .attr({
		                x: 0,
		                r: options.trackBorderRadius || 0,
		                height: size,
		                width: size
		            }).add(group);

        
		        this.trackBorderWidth = scroller.track.strokeWidth();
		        scroller.track.attr({
		            y: -this.trackBorderWidth % 2 / 2
		        });


		        // Draw the scrollbar itself
		        scroller.scrollbarGroup = renderer.g().add(group);

		        scroller.scrollbar = renderer.rect()
		            .addClass('highcharts-scrollbar-thumb')
		            .attr({
		                height: size,
		                width: size,
		                r: options.barBorderRadius || 0
		            }).add(scroller.scrollbarGroup);

		        scroller.scrollbarRifles = renderer.path(
		            swapXY([
		                'M',
		                -3, size / 4,
		                'L',
		                -3, 2 * size / 3,
		                'M',
		                0, size / 4,
		                'L',
		                0, 2 * size / 3,
		                'M',
		                3, size / 4,
		                'L',
		                3, 2 * size / 3
		            ], options.vertical))
		            .addClass('highcharts-scrollbar-rifles')
		            .add(scroller.scrollbarGroup);

        
		        scroller.scrollbarStrokeWidth = scroller.scrollbar.strokeWidth();
		        scroller.scrollbarGroup.translate(
		            -scroller.scrollbarStrokeWidth % 2 / 2,
		            -scroller.scrollbarStrokeWidth % 2 / 2
		        );

		        // Draw the buttons:
		        scroller.drawScrollbarButton(0);
		        scroller.drawScrollbarButton(1);
		    },

		    /**
		     * Position the scrollbar, method called from a parent with defined dimensions
		     * @param {Number} x - x-position on the chart
		     * @param {Number} y - y-position on the chart
		     * @param {Number} width - width of the scrollbar
		     * @param {Number} height - height of the scorllbar
		     */
		    position: function (x, y, width, height) {
		        var scroller = this,
		            options = scroller.options,
		            vertical = options.vertical,
		            xOffset = height,
		            yOffset = 0,
		            method = scroller.rendered ? 'animate' : 'attr';

		        scroller.x = x;
		        scroller.y = y + this.trackBorderWidth;
		        scroller.width = width; // width with buttons
		        scroller.height = height;
		        scroller.xOffset = xOffset;
		        scroller.yOffset = yOffset;

		        // If Scrollbar is a vertical type, swap options:
		        if (vertical) {
		            scroller.width = scroller.yOffset = width = yOffset = scroller.size;
		            scroller.xOffset = xOffset = 0;
		            scroller.barWidth = height - width * 2; // width without buttons
		            scroller.x = x = x + scroller.options.margin;
		        } else {
		            scroller.height = scroller.xOffset = height = xOffset = scroller.size;
		            scroller.barWidth = width - height * 2; // width without buttons
		            scroller.y = scroller.y + scroller.options.margin;
		        }

		        // Set general position for a group:
		        scroller.group[method]({
		            translateX: x,
		            translateY: scroller.y
		        });

		        // Resize background/track:
		        scroller.track[method]({
		            width: width,
		            height: height
		        });

		        // Move right/bottom button ot it's place:
		        scroller.scrollbarButtons[1][method]({
		            translateX: vertical ? 0 : width - xOffset,
		            translateY: vertical ? height - yOffset : 0
		        });
		    },

		    /**
		     * Draw the scrollbar buttons with arrows
		     * @param {Number} index 0 is left, 1 is right
		     */
		    drawScrollbarButton: function (index) {
		        var scroller = this,
		            renderer = scroller.renderer,
		            scrollbarButtons = scroller.scrollbarButtons,
		            options = scroller.options,
		            size = scroller.size,
		            group,
		            tempElem;

		        group = renderer.g().add(scroller.group);
		        scrollbarButtons.push(group);

		        // Create a rectangle for the scrollbar button
		        tempElem = renderer.rect()
		            .addClass('highcharts-scrollbar-button')
		            .add(group);

        

		        // Place the rectangle based on the rendered stroke width
		        tempElem.attr(tempElem.crisp({
		            x: -0.5,
		            y: -0.5,
		            width: size + 1, // +1 to compensate for crispifying in rect method
		            height: size + 1,
		            r: options.buttonBorderRadius
		        }, tempElem.strokeWidth()));

		        // Button arrow
		        tempElem = render