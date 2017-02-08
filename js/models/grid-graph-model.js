define([], function() {
    "use-strict";
    // CR: please verify usage of class instead of interface
    // CR-Change: used class object instead of interface for grid model attributes
    /**
     * Holds attributes for Grid Graph component
     * @class GridGraphModel
     */
    var GridGraphModel = Backbone.Model.extend({

        "defaults": function() {
            var defaults = {
                /**
                 * Background color of the canvas area
                 * @type {number}
                 * @default 0xffffff
                 */
                "backgroundColor": 0xffffff,
                /**
                 * Height of the canvas area
                 * @type {number}
                 * @default 0
                 */
                "canvasHeight": 400,
                /**
                 * Object containing canvas specific x and y coordinates of the origin (0, 0)
                 * @type {any}
                 * @default null
                 */
                "canvasOrigin": null,
                /**
                 * Width of the canvas area
                 * @type {number}
                 * @default 0
                 */
                "canvasWidth": 400,
                /**
                 * Id of the graph container
                 * @type {string}
                 * @default null
                 */
                "containerId": null,
                /**
                 * Color of the grid axes
                 * @type {number}
                 * @default 0x000000
                 */
                "gridAxesColor": 0x000000,
                /**
                 * Object containing uppermost and lowermost values of x and y coordinates
                 * @type {any}
                 * @default null
                 */
                "gridLimits": null,
                /**
                 * Color of grid lines
                 * @type {number}
                 * @default 0xa0a0a0
                 */
                "gridLinesColor": 0x000000,
                /**
                 * Color of the text labels for the grid intervals
                 * @type {number}
                 * @default 0x000000
                 */
                "labelsFontColor": 0x000000,
                /**
                 * Font family of grpah labels
                 * @type {string}
                 * @default arial
                 */
                "labelsFontFamily": "arial",
                /**
                 * Font size of graph labels
                 * @type {string}
                 * @default 12px
                 */
                "labelsFontSize": "12px",
                /**
                 * Denotes whether to show or hide the axes lines
                 * @type {boolean}
                 * @default false
                 */
                "showAxes": true,
                /**
                 * Denotes whether to show or hide the grid lines
                 * @type {boolean}
                 * @default false
                 */
                "showGridLines": true,
                /**
                 * Denotes whether to show or hide the axis labels
                 * @type {boolean}
                 * @default false
                 */
                "showIntervalLabels": true,
                /**
                 * Value of each interval on x-axis
                 * @type {string}
                 * @default null
                 */
                "xInterval": null,
                /**
                 * Ratio of x-axis range to canvas width
                 * @type {number}
                 * @default null
                 */
                "xRatio": null,
                /**
                 * Value of each interval on y-axis
                 * @type {string}
                 * @default null
                 */
                "yInterval": null,
                /**
                 * Ratio of y-axis range to canvas height
                 * @type {number}
                 * @default null
                 */
                "yRatio": null,
                "xAxisLabel": "x",
                "yAxisLabel": "y",
                "graphName": null,
                "verticalLabel": null,
                "horizontalLabel": null,
                "showArrows": true,
                "xLabelInterval": 1,
                "yLabelInterval": 1,
                "maxSelectablePoints": 99,
                "referencePoints": null,
                "responseCoordinates": null,
                "isStatic": false,
                "responseContainers": null,
                "referenceContainers": null,
                "showArrows": true,
                "restrictPoints": false,
                "imageUrl": null,
                "minLower": -99999,
                "maxUpper": 99999,
                "minGridInterval": 1,
                "maxGridInterval": 99999,
                "minPoints": 1,
                "maxPoints": 99,
                "player": null,
            };
            return defaults;
        },

        // CR: is this required?
        // CR-Change: removed constructor
        /**
         * Initializes the model
         *
         * @method initialize
         * @public
         */
        "initialize": function(options) {
            this.setDefaults();
            if (options) {
                this._parseSettingsData(options.settings);
                this._parseContentJson(options.content);
                this._setPlayer(options.player);
            }
            this.listenTo(this, "change", this._calculateAndSetGridData);
            this._calculateAndSetGridData();

        },

        "setDefaults": function() {
            this.set({
                "referencePoints": [],
                "responseCoordinates": [],
                "responseContainers": [],
                "referenceContainers": []
            });
        },

        /**
         * Performs necessary calculations and sets respective attributes of the model
         * Calculations include calculation of coordinates for canvas origin, grid limits and graph area to grid limits ratio
         *
         * @method _calculateAndSetGridData
         * @private
         */
        "_calculateAndSetGridData": function() {
            var gridLimits = this.get('gridLimits'),
                xLower = gridLimits.xLower,
                xUpper = gridLimits.xUpper,
                yLower = gridLimits.yLower,
                yUpper = gridLimits.yUpper,
                graphAreaWidth = this.get('canvasWidth') - 2 * GridGraphModel.OUTER_DISTANCE,
                graphAreaHeight = this.get('canvasHeight') - 2 * GridGraphModel.OUTER_DISTANCE,
                canvasOrigin, xRatio = 0,
                yRatio = 0;
            xRatio = Math.abs(xUpper - xLower) / graphAreaWidth;
            yRatio = Math.abs(yUpper - yLower) / graphAreaHeight;
            canvasOrigin = this._getCanvasOrigin(xRatio, yRatio, gridLimits);
            this.set({
                "canvasOrigin": canvasOrigin,
                "xRatio": xRatio,
                "yRatio": yRatio
            });
        },

        "generateRatios": function(settings) {
            var xInterval = settings.xInterval,
                yInterval = settings.yInterval,
                xLabelInterval = settings.xLabelInterval,
                yLabelInterval = settings.yLabelInterval,
                xRange = settings.xUpper - settings.xLower,
                yRange = settings.yUpper - settings.yLower,
                xIntervalRatio = xRange / xInterval,
                yIntervalRatio = yRange / yInterval,
                xLabelIntervalRatio = xRange / xLabelInterval,
                yLabelIntervalRatio = yRange / yLabelInterval;
            if (xIntervalRatio > 20 || yIntervalRatio > 20 || xLabelIntervalRatio > 20 || yLabelIntervalRatio > 20) {
                return false;
            } else {
                return true;
            }
        },

        /**
         * Calculates and returns canvas specific coordinates of origin
         *
         * @method _getCanvasOrigin
         * @param {number} xRatio, ratio of x-axis range to canvas width
         * @param {number} yRatio, ratio of y-axis range to canvas height
         * @param {any} gridLimits
         * @return {any} object containing canvas specific coordinates of origin
         */
        "_getCanvasOrigin": function(xRatio, yRatio, gridLimits) {
            // CR: 0 - ?
            // CR-Change: Done
            var xCanvasOrigin = -gridLimits.xLower / xRatio,
                yCanvasOrigin = this.get('canvasHeight') + (gridLimits.yLower / yRatio);
            return {
                "x": xCanvasOrigin + GridGraphModel.OUTER_DISTANCE,
                "y": yCanvasOrigin - GridGraphModel.OUTER_DISTANCE
            };
        },

        "getItemData": function() {
            //scoring responses
            var itemJson = {};
            itemJson.settings = this.getSettingsJson();
            itemJson.content = this.getContentJson();
            return itemJson;

        },
        "getSettingsJson": function() {
            var settingsJson = {
                "axes": {
                    "gridLimits": this.get("gridLimits"),
                    "xInterval": this.get("xInterval"),
                    "yInterval": this.get("yInterval"),
                    "xLabelInterval": this.get("xLabelInterval"),
                    "yLabelInterval": this.get("yLabelInterval")
                },
                "labelSettings": {
                    "xAxisLabel": this.get("xAxisLabel"),
                    "yAxisLabel": this.get("yAxisLabel"),
                    "graphName": this.get("graphName"),
                    "verticalLabel": this.get("verticalLabel"),
                    "horizontalLabel": this.get("horizontalLabel"),
                    "showArrows": this.get("showArrows")
                },
                "maxSelectablePoints": this.get("maxSelectablePoints"),
                "canvasHeight": this.get("canvasHeight"),
                "canvasWidth": this.get("canvasWidth")
            };
            if (this.get("imageUrl")) {
                settingsJson.labelSettings.gridOverlayImage = {
                    "url": this.get("imageUrl"),
                    "dimensions": this.get("imageDimension")
                }
            }
            return settingsJson;
        },
        "getContentJson": function() {
            var content = {
                "referencePoints": this.get("referencePoints"),
                // "referenceContainers": this.get("referenceContainers")
            };
            return content;
        },
        "getResponsesJson": function() {
            return this.get("responseCoordinates");
        },

        "_setPlayer": function(player) {
            var player = player || null;
            this.set("player", player);
        },

        "_parseTemplateData": function(authoringData) {
            this._parseSettingsData(authoringData.settings);
            this._parseContentJson(authoringData.content);
            this._parseResponsesJson(authoringData.scoringData);
        },

        "_parseSettingsData": function(settings) {
            if (settings) {
                this.set("gridLimits", settings.axes.gridLimits);
                this.set("xInterval", settings.axes.xInterval);
                this.set("yInterval", settings.axes.yInterval);
                this.set("xLabelInterval", settings.axes.xLabelInterval);
                this.set("yLabelInterval", settings.axes.yLabelInterval);
                this.set("xAxisLabel", settings.labelSettings.xAxisLabel);
                this.set("yAxisLabel", settings.labelSettings.yAxisLabel);
                this.set("graphName", settings.labelSettings.graphName);
                this.set("verticalLabel", settings.labelSettings.verticalLabel);
                this.set("horizontalLabel", settings.labelSettings.horizontalLabel);
                this.set("showArrows", settings.labelSettings.showArrows);
                this.set("maxSelectablePoints", settings.maxSelectablePoints);
                this.set("canvasWidth", settings.canvasWidth);
                this.set("canvasHeight", settings.canvasHeight);

                if (settings.labelSettings.gridOverlayImage && settings.labelSettings.gridOverlayImage.url) {
                    this.set("imageUrl", settings.labelSettings.gridOverlayImage.url);
                    this.set("imageDimension", settings.labelSettings.gridOverlayImage.dimensions);
                }

            }
        },
        "_parseContentJson": function(content) {
            if (content) {
                this.set("referencePoints", content.referencePoints);
            }
        },
        "_parseResponsesJson": function(response) {
            this.set("responseCoordinates", response);
        },

        "setData": function(response) {
            this.set("responseCoordinates", response);
        },
        "resetResponses": function() {
            this.set("responseCoordinates", []);
            this.set("responseContainers", []);
        },

        "resetReferences": function() {
            this.set("referencePoints", []);
            this.set("referenceContainers", []);
        },

        /**
         * Converts graph specific coordinates to canvas specific coordinates
         *
         * @method convertToCanvasCoordinates
         * @param {any} graphPoint object containing x and y graph coordinates
         * @return {any} canvasPoint object containing canvas x and y coordinates
         * @public
         */
        // CR: can we use option param definition with the object containing x and y coords?
        // CR-Change: Done
        "convertToCanvasCoordinates": function(graphPoint) {
            var canvasOrigin = this.get('canvasOrigin'),
                canvasPoint = {
                    "x": canvasOrigin.x + (graphPoint.x / this.get('xRatio')),
                    "y": canvasOrigin.y - (graphPoint.y / this.get('yRatio'))
                };
            return canvasPoint;
        },

        /**
         * Converts canvas specific coordinates to graph specific coordinates
         *
         * @method convertToGraphCoordinates
         * @param {any} canvasPoint object containing x and y canvas coordinates
         * @return {any} graphPoint object containing graph x and y coordinates
         * @public
         */
        // CR: same as above funtion
        // CR-Change: Done
        "convertToGraphCoordinates": function(canvasPoint) {
            var canvasOrigin = this.get('canvasOrigin'),
                graphPoint = {
                    "x": (canvasPoint.x - canvasOrigin.x) * this.get('xRatio'),
                    "y": (canvasOrigin.y - canvasPoint.y) * this.get('yRatio')
                };
            return graphPoint;
        },

        /**
         * Rounds number upto 2 decimal places
         *
         * @method roundNumber
         * @param {number} input number to be rounded
         * @param {number} noOfDecimalPlaces degree upto which number should be rounded
         * @return {number} rounded number
         * @public
         */
        // CR: this should be parameteriesed as more precise values can be required later
        // CR-Change: Added parameter
        "roundNumber": function(input, noOfDecimalPlaces) {
            var divisionFactor = Math.pow(10, noOfDecimalPlaces);
            return Math.round(input * divisionFactor) / divisionFactor;
        },

        /**
         * Calculates if a graph point is visible for current grid limits
         *
         * @method isPointVisible
         * @param {any} graphPoint, x and y coordinates of point
         * @return {boolean} isVisible, true if point is inside grid and vice versa
         */
        // CR: verify param definition to avoid use of any
        // CR-Change: In typescript, type of an object is any, changed param definition
        "isPointVisible": function(graphPoint) {
            var isVisible = false,
                gridLimits = this.get('gridLimits');
            if (graphPoint.x <= gridLimits.xUpper && graphPoint.x >= gridLimits.xLower &&
                graphPoint.y <= gridLimits.yUpper && graphPoint.y >= gridLimits.yLower) {
                isVisible = true;
            }
            return isVisible;
        },

        /**
         * Calculates and returns multiple of a number that is greter than and nearest to a value
         *
         * @method getNearestMultipleOfInterval
         * @param {number} value, number from which nearest multiple is to be calculated
         * @param {number} interval, number whose multiple is to be found
         * @return {number} nearestMultiple, multiple of interval nearest to a value
         */
        "getNearestMultipleOfInterval": function(value, interval) {
            var remainder = value % interval,
                diff = remainder <= 0 ? remainder : interval - remainder,
                nearestMultiple = value + (diff * this.getSignOfNumber(value));
            return nearestMultiple;
        },

        /**
         * Returns sign of a number
         *
         * @method getSignOfNumber
         * @param {number} val, number whose sign is to be determined
         * @return {number}, 0 if value is zero, -1 if value is negative, 1 if value is positive
         */
        "getSignOfNumber": function(val) {
            return val ? val < 0 ? -1 : 1 : 0;
        },
    }, {
        "OUTER_DISTANCE": 65,
        "AXIS_WIDTH": 2.5,
        "BORDER_WIDTH": 3,
        "ARROW_LENGTH": 10,
        "ARROW_WIDTH": 7,
        "EVENTS": {
            "RESPONSE_UPDATED": "response-updated",
            "RESPONSES_EMPTY": "responses-emplty",
            "GRAPH_MOUSE_DOWN": "graph-mouse-down"
        }
    });
    return GridGraphModel;
});
//# sourceMappingURL=grid-graph-model.js.map
