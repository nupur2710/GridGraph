define([
    "js/models/grid-graph-model"
], function(GridGraphModel) {
    "use-strict";

    /**
     * Holds interaction functions related to Grid Graph
     * @class GridGraphView
     */
    var GridGraphView = Backbone.View.extend({
        pixiGraphics: null,
        pixiContainer: null,
        pixiRenderer: null,
        isOriginVisible: false,
        url: null,
        isDirty: false,
        movePoint: null,
        downPoint: null,
        upPoint: null,
        hasDragged: false,
        circle: null,
        dragging: false,

        /**
         * Initializes view
         *
         * @method initialize
         * @public
         */
        "initialize": function(options) {
            this.render();
            this._bindEvents();
        },

        "_bindEvents": function() {
            $(document).on("mouseup", $.proxy(this.onDragEnd, this));
            $(document).on("mousemove", $.proxy(this.onMove, this));
            $(document).on("touchend", $.proxy(this.onDragEnd, this));
            $(document).on("touchmove", $.proxy(this.onMove, this));
        },

        "triggerCanvasClick": function() {
            this.trigger(GridGraphModel.EVENTS.GRAPH_MOUSE_DOWN);
        },

        /**
         * Renders view
         *
         * @method render
         * @return {Backbone.View} current view object
         * @public
         */
        "render": function() {
            this._reRenderGridGraph();
            window.pixi = this;
            return this;
        },

        /**
         * Re-renders grid graph
         */
        "_reRenderGridGraph": function() {
            this._createPixiRenderer();
            this.isOriginVisible = this.model.isPointVisible({ "x": 0, "y": 0 });
            this._plotGridLines();
            this.addRemoveImage(false, this.model.get("imageUrl"), this.model.get("imageDimension"));
            this._plotBorder();
            this._plotAxes();
            this._plotArrows();
            this._plotPoints();

            this._refreshGridGraph();
        },

        /**
         * Refreshes grid graph
         */
        "_refreshGridGraph": function() {
            this.pixiRenderer.render(this.pixiContainer);
        },

        /**
         * Creates Pixi renderer and graphics objects
         *
         * @method _createPixiRenderer
         * @private
         */
        "_createPixiRenderer": function() {
            if (this.pixiRenderer) {
                this.$el.empty();
                this.pixiGraphics.destroy();
                this.pixiContainer.destroy();
                this.pixiRenderer.destroy();
                this.pixiGraphics = this.pixiRenderer = this.pixiContainer = this.numberGraphics = null;
            }
            // CR: are you sure this is not a global obect and will not affect with multiple canvas on page?
            // CR-Change: Yes. These pixi objects are view specific. Verified with two canvases on one page
            this.pixiContainer = new PIXI.Container();
            this.pixiGraphics = new PIXI.Graphics();
            this.numberGraphics = new PIXI.Graphics();
            this.pixiContainer.addChild(this.pixiGraphics);
            //use autoDetectRenderer and antialias for better view of circles. In cases of warnings in console, rgearding too many graphics rendered, using new PIXI.CanvasRenderer.

            this.pixiRenderer = new PIXI.CanvasRenderer(this.model.get('canvasWidth'), this.model.get('canvasHeight'), {
                "backgroundColor": this.model.get('backgroundColor'),
                "antialias": true
            });
            this.pixiRenderer.view.className = "grid-graph-canvas";
            this.$el.append(this.pixiRenderer.view);
        },

        //plot the points on re-render
        "_plotPoints": function() {
            var referencePoints = this.model.get("referencePoints"),
                responseCoordinates = this.model.get("responseCoordinates"),
                index, canvasPoint;
            if (referencePoints.length) {
                for (index = 0; index < referencePoints.length; index++) {
                    canvasPoint = this.model.convertToCanvasCoordinates(referencePoints[index]);
                    this._plotReferenceCircle(canvasPoint);
                }
            }
            if (responseCoordinates.length) {
                for (index = 0; index < responseCoordinates.length; index++) {
                    canvasPoint = this.model.convertToCanvasCoordinates(responseCoordinates[index]);
                    this._plotResponseCircle(canvasPoint);
                }
            }
        },

        //draw the arrow heads of the axes
        "drawArrowHeads": function(point0, point1, point2) {
            this.pixiGraphics
                .beginFill()
                .lineStyle(1, this.model.get('gridAxesColor'), 1)
                .drawPolygon([point0.x, point0.y, point1.x, point1.y, point2.x, point2.y])
                .endFill();
        },

        //pass indexes for drawing the arrows
        "_plotArrows": function() {
            var gridLimits = this.model.get("gridLimits"),
                showArrows = this.model.get("showArrows"),
                xLower = gridLimits.xLower,
                xUpper = gridLimits.xUpper,
                yLower = gridLimits.yLower,
                yUpper = gridLimits.yUpper,
                xLimits = [xLower, xUpper],
                yLimits = [yLower, yUpper],
                pt0, pt1, pt2,
                arrowLen = GridGraphModel.ARROW_LENGTH,
                arrowWidth = GridGraphModel.ARROW_WIDTH,
                index,
                //the four points are the four co-ordinate points where the arrow is to be plotted
                point0 = this.model.convertToCanvasCoordinates({
                    "x": xLower,
                    "y": 0
                }),
                point1 = this.model.convertToCanvasCoordinates({
                    "x": xUpper,
                    "y": 0
                }),
                point2 = this.model.convertToCanvasCoordinates({
                    "x": 0,
                    "y": yLower
                }),
                point3 = this.model.convertToCanvasCoordinates({
                    "x": 0,
                    "y": yUpper
                }),
                x = [point0, point1],
                y = [point2, point3],
                player = this.model.get("player");
            if (showArrows) {
                if (this.model.isPointVisible({ "x": gridLimits.xLower, "y": 0 })) {
                    for (index = 0; index < x.length; index++) {
                        if (xLimits[index] !== 0) {
                            if (xLimits[index] === xLower && xLower < 0) {
                                newPoint = -arrowLen
                            } else if (xLimits[index] === xUpper && xUpper > 0) {
                                newPoint = arrowLen;
                            } else {
                                continue;
                            }
                            if (player === "sbac") {
                                pt0 = {
                                    "x": x[index].x,
                                    "y": x[index].y + arrowWidth
                                };
                                pt1 = {
                                    "x": x[index].x,
                                    "y": x[index].y - arrowWidth
                                };
                                pt2 = {
                                    "x": x[index].x + newPoint,
                                    "y": x[index].y
                                };

                            } else {
                                pt0 = {
                                    "x": x[index].x - newPoint,
                                    "y": x[index].y + arrowWidth
                                };
                                pt1 = {
                                    "x": x[index].x - newPoint,
                                    "y": x[index].y - arrowWidth
                                };
                                pt2 = {
                                    "x": x[index].x,
                                    "y": x[index].y
                                };
                            }
                            this.drawArrowHeads(pt0, pt1, pt2);
                        }
                    }
                }
                if (this.model.isPointVisible({ "x": 0, "y": gridLimits.yLower })) {
                    for (index = 0; index < y.length; index++) {
                        if (yLimits[index] !== 0) {
                            if (yLimits[index] === yLower && yLower < 0) {
                                newPoint = -arrowLen
                            } else if (yLimits[index] === yUpper && yUpper > 0) {
                                newPoint = arrowLen;
                            } else {
                                continue;
                            }
                            if (player === "sbac") {
                                pt0 = {
                                    "x": y[index].x + arrowWidth,
                                    "y": y[index].y
                                };
                                pt1 = {
                                    "x": y[index].x - arrowWidth,
                                    "y": y[index].y
                                };
                                pt2 = {
                                    "x": y[index].x,
                                    "y": y[index].y - newPoint
                                };
                            } else {
                                pt0 = {
                                    "x": y[index].x + arrowWidth,
                                    "y": y[index].y + newPoint
                                };
                                pt1 = {
                                    "x": y[index].x - arrowWidth,
                                    "y": y[index].y + newPoint
                                };
                                pt2 = {
                                    "x": y[index].x,
                                    "y": y[index].y
                                };
                            }
                            this.drawArrowHeads(pt0, pt1, pt2);
                        }

                    }
                }
            }
        },

        "setHorizontalLabelPosition": function(width) {
            var canvasHeight = this.model.get("canvasHeight"),
                canvasWidth = this.model.get("canvasWidth"),
                DISTANCE = GridGraphModel.OUTER_DISTANCE,
                css = {
                    "top": canvasHeight + (DISTANCE / 4),
                };
            return css;
        },

        "setVerticalLabelPosition": function(height) {
            var canvasHeight = this.model.get("canvasHeight"),
                canvasWidth = this.model.get("canvasWidth"),
                DISTANCE = GridGraphModel.OUTER_DISTANCE,
                css = {
                    "top": (canvasHeight / 2),
                    "left": -DISTANCE / 2
                };
            return css;
        },
        "setXAxisLabelPosition": function(width, height) {
            var gridLimits = this.model.get("gridLimits"),
                xAxesGraphPoint = {
                    "x": gridLimits.xUpper,
                    "y": 0
                },
                xAxesPoint = this.model.convertToCanvasCoordinates(xAxesGraphPoint),
                css;
            if (this.model.isPointVisible(xAxesGraphPoint)) {
                css = {
                    "top": (xAxesPoint.y - height / 2) + 43,
                    "left": xAxesPoint.x + 14,
                    "display": "block"
                };
            } else {
                css = {
                    "display": "none"
                };
            }
            return css;

        },

        "setYAxisLabelPosition": function(width, height) {
            var gridLimits = this.model.get("gridLimits"),
                yAxesGraphPoint = {
                    "x": 0,
                    "y": gridLimits.yUpper
                },
                yAxesPoint = this.model.convertToCanvasCoordinates(yAxesGraphPoint),
                css;
            if (this.model.isPointVisible(yAxesGraphPoint)) {
                css = {
                    "top": (yAxesPoint.y - height / 2) + 20,
                    "left": yAxesPoint.x - width / 2 + 3,
                    "display": "block"
                };
            } else {
                css = {
                    "display": "none"
                };
            }
            return css;
        },

        /**
         * Plots grid lines on canvas
         *
         * @method _plotGridLines
         * @private
         */
        "_plotGridLines": function() {
            var gridLimits = this.model.get('gridLimits'),
                xInterval = this.model.get("xInterval"),
                yInterval = this.model.get("yInterval"),
                xLabelInterval = this.model.get("xLabelInterval"),
                yLabelInterval = this.model.get("yLabelInterval"),
                canvasWidth = this.model.get('canvasWidth'),
                canvasHeight = this.model.get('canvasHeight'),
                xPoint = this.model.getNearestMultipleOfInterval(gridLimits.xLower, xInterval),
                yPoint = this.model.getNearestMultipleOfInterval(gridLimits.yLower, yInterval),
                xConst, yConst,
                canvasOrigin = this.model.get('canvasOrigin'),
                showGridLines = this.model.get('showGridLines'),
                showLabels = this.model.get('showIntervalLabels'),
                // CR: should be saved in model seems repeatative and can be modified later
                // CR-Change: Done

                textProp = {
                    "font": this.model.get('labelsFontSize') + " " + this.model.get('labelsFontFamily'),
                    "fill": this.model.get('labelsFontColor'),
                    stroke: '#FFFFFF',
                    strokeThickness: 10,
                },
                xLabel = 0,
                yLabel = 0,
                gridLinesColor = this.model.get('gridLinesColor');
            if (this.model.get("imageUrl")) {
                textProp.stroke = "transparent";
            } else {
                textProp.stroke = "#FFFFFF";
            }
            //start grid line plotting
            this.pixiGraphics
                .beginFill(gridLinesColor, 1)
                .lineStyle(1, gridLinesColor, 1);
            //Plot horizontal grid lines
            if (showGridLines) {
                while (xPoint <= gridLimits.xUpper) {
                    this._drawLine({ "x": xPoint, "y": gridLimits.yLower }, { "x": xPoint, "y": gridLimits.yUpper });
                    xPoint += xInterval;
                }
                //Plot vertical grid lines
                while (yPoint <= gridLimits.yUpper) {
                    this._drawLine({ "x": gridLimits.xLower, "y": yPoint }, { "x": gridLimits.xUpper, "y": yPoint });
                    yPoint += yInterval;
                }
            }
            this.pixiGraphics.endFill();
            if (showLabels) {
                this.pixiGraphics
                    .beginFill(gridLinesColor, 1)
                    .lineStyle(1, gridLinesColor, 1);
                if (this.isOriginVisible) {
                    xConst = yConst = 0;
                } else if ((gridLimits.xLower > 0 && this.model.isPointVisible({ "x": gridLimits.xLower, "y": 0 })) || (gridLimits.xUpper < 0 && this.model.isPointVisible({ "x": gridLimits.xUpper, "y": 0 }))) {
                    xConst = canvasOrigin.x >= canvasWidth ? gridLimits.xUpper : gridLimits.xLower;
                    yConst = 0;

                } else if ((gridLimits.yLower > 0 && this.model.isPointVisible({ "x": 0, "y": gridLimits.yLower })) || (gridLimits.yUpper < 0 && this.model.isPointVisible({ "x": 0, "y": gridLimits.yUpper }))) {
                    xConst = 0;
                    yConst = canvasOrigin.y <= 0 ? gridLimits.yUpper : gridLimits.yLower;

                } else {
                    xConst = canvasOrigin.x >= canvasWidth ? gridLimits.xUpper : gridLimits.xLower;
                    yConst = canvasOrigin.y <= 0 ? gridLimits.yUpper : gridLimits.yLower;
                }

                //plot labels for all the four sides
                while (xLabel < gridLimits.xUpper) {
                    xLabel = xLabel + xLabelInterval;

                    //when xLower>1 and it gets cut on the yAxes, remove it
                    if (xLabel === gridLimits.xLower && this.model.isPointVisible({ "x": gridLimits.xLower, "y": 0 })) {
                        xLabel = xLabel + xLabelInterval;
                    }

                    if (xLabel !== 0 && xLabel < gridLimits.xUpper && xLabel > gridLimits.xLower) {
                        this._createAndAddTextLabelObject(xLabel, { "x": xLabel, "y": yConst }, textProp, true);
                    }
                }

                while (xLabel > gridLimits.xLower) {
                    xLabel = xLabel - xLabelInterval;

                    //hide xUpper label when its negative and equal to yUpper because it will be cut by gridlines
                    if (gridLimits.xUpper < 0 && xLabel === gridLimits.yUpper) {
                        xLabel = xLabel - xLabelInterval;
                    }
                    //when xUpper>1 and it gets cut on the yAxes, remove it
                    if (xLabel === gridLimits.xUpper && this.model.isPointVisible({ "x": gridLimits.xUpper, "y": 0 })) {
                        xLabel = xLabel - xLabelInterval;
                    }

                    if (xLabel !== 0 && xLabel > gridLimits.xLower && xLabel < gridLimits.xUpper) {
                        this._createAndAddTextLabelObject(xLabel, { "x": xLabel, "y": yConst }, textProp, true);
                    }
                }

                while (yLabel < gridLimits.yUpper) {
                    yLabel = yLabel + yLabelInterval;

                    //hide yLower when its same as xLower and greater than 0, to avoid duplicate labels
                    if (gridLimits.yLower > 0 && yLabel === gridLimits.xLower) {
                        yLabel = yLabel + yLabelInterval;
                    }

                    //when yLower>1 and it gets cut on the xAxes, remove it
                    if (yLabel === gridLimits.yLower && this.model.isPointVisible({ "x": 0, "y": gridLimits.yLower })) {
                        yLabel = yLabel + yLabelInterval;
                    }

                    if (yLabel !== 0 && yLabel < gridLimits.yUpper && yLabel > gridLimits.yLower) {
                        this._createAndAddTextLabelObject(yLabel, { "x": xConst, "y": yLabel }, textProp, false);
                    }
                }

                while (yLabel > gridLimits.yLower) {
                    yLabel = yLabel - yLabelInterval;

                    //hider yUpper label when its negative and equal to xUpper because it will be cut by gridlines
                    if (gridLimits.yUpper < 0 && yLabel === gridLimits.xUpper) {
                        yLabel = yLabel - yLabelInterval;
                    }

                    //when yUpper<1 and it gets cut on the xAxes, remove it
                    if (yLabel === gridLimits.yUpper && this.model.isPointVisible({ "x": 0, "y": gridLimits.yUpper })) {
                        yLabel = yLabel - yLabelInterval;
                    }

                    if (yLabel !== 0 && yLabel > gridLimits.yLower && yLabel < gridLimits.yUpper) {
                        this._createAndAddTextLabelObject(yLabel, { "x": xConst, "y": yLabel }, textProp, false);
                    }
                }
            }
            this.pixiGraphics.endFill();
            this.pixiContainer.addChild(this.numberGraphics);
        },

        /**
         * Creates and adds labels for intervals on x and y axes
         *
         * @method _createAndAddTextLabelObject
         * @param {any} text, text for label whose value can be of type string or number
         * @param {any} position, object containing x and y positions of text
         * @param {any} textProp, styling properties for the text
         * @param {boolean} isXLabel, to check whether the label is x axis or y axis label
         * @return {PIXI.Text} textObj, Pixi text object
         * @private
         */
        "_createAndAddTextLabelObject": function(text, position, textProp, isXLabel) {
            var textObj = new PIXI.Text(text, textProp);
            canvasPosition = this.model.convertToCanvasCoordinates(position),
                xAdjust = this._getXAdjust(canvasPosition.x, textObj, isXLabel),
                yAdjust = this._getYAdjust(canvasPosition.y, textObj, isXLabel),
                textPoint = new PIXI.Point(canvasPosition.x - xAdjust, canvasPosition.y - yAdjust);
            textObj.position = textPoint;
            this.numberGraphics.addChild(textObj);
            // if (!window.textObjArray) {
            //     window.textObjArray = [];
            // }
            // window.textObjArray.push(textObj);
            // return textObj;
        },

        "_plotBorder": function() {
            var DISTANCE = GridGraphModel.OUTER_DISTANCE,
                BORDER_WIDTH = GridGraphModel.BORDER_WIDTH / 2,
                canvasWidth = this.model.get("canvasWidth"),
                canvasHeight = this.model.get("canvasHeight");
            this.border = new PIXI.Graphics;
            this.border.beginFill()
                .lineStyle(GridGraphModel.BORDER_WIDTH, this.model.get('gridAxesColor'), 1)
                .moveTo(DISTANCE - BORDER_WIDTH, DISTANCE + BORDER_WIDTH)
                .lineTo(canvasWidth - DISTANCE + BORDER_WIDTH, DISTANCE + BORDER_WIDTH)
                .moveTo(canvasWidth - DISTANCE + BORDER_WIDTH, DISTANCE + BORDER_WIDTH)
                .lineTo(canvasWidth - DISTANCE + BORDER_WIDTH, canvasHeight - DISTANCE + BORDER_WIDTH)
                .moveTo(canvasWidth - DISTANCE + BORDER_WIDTH, canvasHeight - DISTANCE + BORDER_WIDTH)
                .lineTo(DISTANCE - BORDER_WIDTH, canvasHeight - DISTANCE + BORDER_WIDTH)
                .moveTo(DISTANCE - BORDER_WIDTH, canvasHeight - DISTANCE + BORDER_WIDTH)
                .lineTo(DISTANCE - BORDER_WIDTH, DISTANCE + BORDER_WIDTH)
                .endFill();
            this.pixiContainer.addChild(this.border);

        },

        /**
         * Draws axes lines on canvas
         *
         * @method _plotAxes
         * @private
         */
        "_plotAxes": function() {
            if (this.model.get('showAxes')) {
                var origin = this.model.get('canvasOrigin'),
                    canvasWidth = this.model.get('canvasWidth'),
                    canvasHeight = this.model.get('canvasHeight'),
                    DISTANCE = GridGraphModel.OUTER_DISTANCE,
                    xInterval = this.model.get("xInterval"),
                    yInterval = this.model.get("yInterval"),
                    gridLimits = this.model.get("gridLimits");
                this.graph = new PIXI.Graphics;
                this.graph.beginFill()
                    .lineStyle(GridGraphModel.AXIS_WIDTH, this.model.get('gridAxesColor'), 1)
                if (this.model.isPointVisible({ "x": gridLimits.xLower, "y": 0 })) {
                    this.graph.moveTo(0 + DISTANCE, origin.y)
                        .lineTo(canvasWidth - DISTANCE, origin.y)
                }
                if (this.model.isPointVisible({ "x": 0, "y": gridLimits.yLower })) {
                    this.graph.moveTo(origin.x, 0 + DISTANCE)
                        .lineTo(origin.x, canvasHeight - DISTANCE)
                }

                this.graph.endFill();
                //|| (gridLimits.xLower === 0 && gridLimits.yUpper === 0)
                //|| (gridLimits.xUpper === 0 && gridLimits.yUpper === 0)
                //in the commented cases, the label 0 will be cut. So removing them.
                if ((gridLimits.xLower === 0 && gridLimits.yLower === 0) || (gridLimits.xUpper === 0 && gridLimits.yLower === 0)) {
                    this._createAndAddTextLabelObject(0, { "x": 0, "y": 0 }, {
                        "font": this.model.get('labelsFontSize') + " " + this.model.get('labelsFontFamily'),
                        "fill": this.model.get('labelsFontColor'),
                        stroke: '#FFFFFF',
                        strokeThickness: 10,
                    }, true);
                }
                this.pixiContainer.addChild(this.graph);
                this.graph.hitArea = new PIXI.Rectangle(DISTANCE, DISTANCE, canvasWidth - 2 * DISTANCE, canvasHeight - 2 * DISTANCE);
                this.graph.interactive = true;
                this.graph.buttonMode = true;
                this.graph.defaultCursor = "crosshair";
                this.graph.off("click").on("click", $.proxy(function(event) {
                    this.onGraphClick(event);
                }, this));
                this.graph.off("touchstart").on("touchstart", $.proxy(function(event) {
                    this.onGraphClick(event);
                }, this));

            }
        },

        //triggered on click event on the graph 
        "onGraphClick": function(event) {
            var canvasPoint = event.data.global,
                graphPoint = this.model.convertToGraphCoordinates(canvasPoint),
                snappedPoint = this.snapToGrid(graphPoint);
            this.triggerCanvasClick();
            this._onCanvasGraphClick(canvasPoint, graphPoint, snappedPoint);
            // event.stopPropagation();
        },

        //handle the click event on graph for plotting points
        "_onCanvasGraphClick": function(canvasPoint, graphPoint, snappedPoint) {
            var maxSelectablePoints = this.model.get("maxSelectablePoints"),
                referencePoints = this.model.get("referencePoints"),
                responseCoordinates = this.model.get("responseCoordinates"),
                gridLimits = this.model.get("gridLimits"),
                responseContainers = this.model.get("responseContainers"),
                referenceContainers = this.model.get("referenceContainers"),
                isExisting = this.checkForExistingPoint(snappedPoint),
                isExistingPoint, index;
            if (isExisting.response || isExisting.reference) {
                //to stop plotting on existing points
                isExistingPoint = true;
            } else {
                isExistingPoint = false;
            }

            if (snappedPoint.x > gridLimits.xUpper || snappedPoint.x < gridLimits.xLower || snappedPoint.y > gridLimits.yUpper || snappedPoint.y < gridLimits.yLower) {
                return;
            }
            canvasPoint = this.model.convertToCanvasCoordinates(snappedPoint);

            //To plot static reference point, isStatic will be true
            if (this.model.get("isStatic")) {
                if (!isExistingPoint) {
                    referencePoints.push(snappedPoint);
                    referenceContainers.push(this._plotReferenceCircle(canvasPoint));
                }
            } else {
                if (!isExistingPoint && responseCoordinates.length < maxSelectablePoints) {
                    responseCoordinates.push(snappedPoint);
                    responseContainers.push(this._plotResponseCircle(canvasPoint));
                    this.trigger(GridGraphModel.EVENTS.RESPONSE_UPDATED);
                } else if (!isExistingPoint && responseCoordinates.length === maxSelectablePoints) {
                    responseCoordinates.splice(responseCoordinates.length - 1, 1);
                    this.pixiContainer.removeChild(responseContainers[responseContainers.length - 1]);
                    responseContainers.splice(responseContainers.length - 1, 1);
                    responseCoordinates.push(snappedPoint);
                    responseContainers.push(this._plotResponseCircle(canvasPoint));
                    this._reRenderGridGraph();
                    this.trigger(GridGraphModel.EVENTS.RESPONSE_UPDATED);
                }
            }
        },

        "disableEnableButtonModel": function() {
            var responseContainers = this.model.get("responseCoordinates"),
                referenceContainers = this.model.get("referenceContainers"),
                index;
            if (this.model.get("isStatic")) {
                if (responseContainers.length) {
                    for (index = 0; index < responseContainers.length; index++) {
                        responseContainers[index].defaultCursor = "none";
                    }
                }
                if (referenceContainers.length) {
                    for (index = 0; index < referenceContainers.length; index++) {
                        referenceContainers[index].buttonMode = true;
                        referenceContainers[index].defaultCursor = "move";
                    }
                }
            } else {
                if (referenceContainers.length) {
                    for (index = 0; index < referenceContainers.length; index++) {
                        referenceContainers[index].defaultCursor = "none";
                    }
                }
                if (responseContainers.length) {
                    for (index = 0; index < responseContainers.length; index++) {
                        responseContainers[index].buttonMode = true;
                        responseContainers[index].defaultCursor = "move";
                    }
                }
            }
        },

        //snap the clicked point to the nearest grid intersection point
        "snapToGrid": function(graphPoint) {
            var point0 = graphPoint,
                point1 = this.snapToGridInterval(graphPoint),
                point2 = this.snapToLabelInterval(graphPoint),
                distance1 = Math.sqrt(Math.pow((point1.x - point0.x), 2) + Math.pow((point1.y - point0.y), 2)),
                distance2 = Math.sqrt(Math.pow((point2.x - point0.x), 2) + Math.pow((point2.y - point0.y), 2));
            if (distance1 <= distance2) {
                return point1;
            } else {
                return point2;
            }
        },

        "snapToGridInterval": function(graphPoint) {
            var xInterval = this.model.get("xInterval"),
                yInterval = this.model.get("yInterval"),
                snappedPoint = {};
            snappedPoint.x = Math.round(graphPoint.x / xInterval) * xInterval;
            snappedPoint.y = Math.round(graphPoint.y / yInterval) * yInterval;
            return snappedPoint;
        },
        "snapToLabelInterval": function(graphPoint) {
            var xLabelInterval = this.model.get("xLabelInterval"),
                yLabelInterval = this.model.get("yLabelInterval"),
                snappedPoint = {};
            snappedPoint.x = Math.round(graphPoint.x / xLabelInterval) * xLabelInterval;
            snappedPoint.y = Math.round(graphPoint.y / yLabelInterval) * yLabelInterval;
            return snappedPoint;
        },

        //plot a point in the canvas
        "_plotResponseCircle": function(canvasPoint, pointColor) {
            var pointColor = pointColor || 0x0000FF,
                innerCircle = new PIXI.Graphics;
            outerCircle = new PIXI.Graphics;
            container = new PIXI.Container;
            innerCircle.beginFill(0x0000FF)
                .drawCircle(canvasPoint.x, canvasPoint.y, 39)
                .endFill();
            innerCircle.alpha = 0.1;
            container.addChild(innerCircle);
            outerCircle.lineStyle(1, 0x000000, 1)
                .beginFill(0x0000FF)
                .drawCircle(canvasPoint.x, canvasPoint.y, 7)
                .endFill();
            container.addChild(outerCircle);
            this.pixiContainer.addChild(container);
            container.hitArea = new PIXI.Circle(canvasPoint.x, canvasPoint.y, 39);
            container.interactive = true;
            container.buttonMode = true;
            container.defaultCursor = "move";
            container
                .on('mousedown', $.proxy(this.onDragStart, this, container))
                .on('touchstart', $.proxy(this.onDragStart, this, container));
            this._refreshGridGraph();
            return container;
        },

        //plot an outer circle around the reference points
        "_plotReferenceCircle": function(canvasPoint, pointColor) {
            var pointColor = pointColor || 0x9C2D74,
                circle = new PIXI.Graphics;
            circle.lineStyle(1, 0x000000, 1)
                .beginFill(pointColor)
                .drawCircle(canvasPoint.x, canvasPoint.y, 7)
                .endFill();
            this.pixiContainer.addChild(circle);
            if ('ontouchstart' in window) {
                circle.hitArea = new PIXI.Circle(canvasPoint.x, canvasPoint.y, 14);
            } else {
                circle.hitArea = new PIXI.Circle(canvasPoint.x, canvasPoint.y, 7);
            }
            circle.interactive = true;
            circle.buttonMode = true;
            circle.defaultCursor = "move";
            circle
                .on('mousedown', $.proxy(this.onDragStart, this, circle))
                .on('touchstart', $.proxy(this.onDragStart, this, circle));
            this._refreshGridGraph();
            return circle;
        },

        //check if the point that is dropped, is same as any of the previously existing dropped points
        "checkForExistingPoint": function(snappedPoint) {
            var index,
                responseCoordinates = this.model.get("responseCoordinates"),
                referencePoints = this.model.get("referencePoints"),
                gridLimits = this.model.get("gridLimits"),
                isExisting = {};
            for (index = 0; index < responseCoordinates.length; index++) {
                if (responseCoordinates[index].x === snappedPoint.x && responseCoordinates[index].y === snappedPoint.y) {
                    isExisting.response = true;
                    break;
                }
            }

            for (index = 0; index < referencePoints.length; index++) {
                if (referencePoints[index].x === snappedPoint.x && referencePoints[index].y === snappedPoint.y) {
                    isExisting.reference = true;
                    break;
                }
            }
            return isExisting;
        },

        //check if the drop location is same as its previous location
        "checkForSamePoint": function() {
            if (this.downPoint.x === this.upPoint.x && this.upPoint.y === this.downPoint.y) {
                return true;
            } else {
                return false;
            }
        },

        //delete the point if it is dropped on an exisiting point
        "deleteRepeatingResponsePoints": function(point, circle) {
            var index = 0,
                responseCoordinates = this.model.get("responseCoordinates"),
                responseContainers = this.model.get("responseContainers");
            for (; index < responseCoordinates.length; index++) {
                if (responseCoordinates[index].x === point.x && responseCoordinates[index].y === point.y) {
                    responseCoordinates.splice(index, 1);
                    responseContainers.splice(index, 1);
                    this.pixiContainer.removeChild(circle);
                    this._refreshGridGraph();
                    break;
                }
            }
        },

        //delete the point if it is dropped on an exisiting point
        "deleteRepeatingReferencePoints": function(point, circle) {
            var index = 0,
                referencePoints = this.model.get("referencePoints"),
                referenceContainers = this.model.get("referenceContainers");
            for (; index < referencePoints.length; index++) {
                if (referencePoints[index].x === point.x && referencePoints[index].y === point.y) {
                    referencePoints.splice(index, 1);
                    referenceContainers.splice(index, 1);
                    this.pixiContainer.removeChild(circle);
                    this._refreshGridGraph();
                    break;
                }
            }
        },

        "checkForOverlappingPoints": function(snappedPoint, circle) {
            var currentPoint = this.snapToGrid(this.model.convertToGraphCoordinates(circle.hitArea));
            if (snappedPoint.x === currentPoint.x && snappedPoint.y === currentPoint.y) {
                return true;
            } else {
                return false;
            }
        },

        //update the response coordinates of the dragged point
        "updateResponseCoordinates": function(circle, snappedPoint) {
            var index = 0,
                responseCoordinates = this.model.get("responseCoordinates"),
                point = this.snapToGrid(this.model.convertToGraphCoordinates(circle.hitArea)),
                gridLimits = this.model.get("gridLimits");

            //only if the point is dragged and dropped outside. For edge points, even if snappedPoint is outside the gridLimits, update it, because it is to handle deletion of points
            if (this.hasDragged) {
                //if the point is dropped at a position outside the graph
                if (snappedPoint.x > gridLimits.xUpper || snappedPoint.x < gridLimits.xLower || snappedPoint.y > gridLimits.yUpper || snappedPoint.y < gridLimits.yLower) {
                    this._reRenderGridGraph();
                    return;
                }
            }

            for (; index < responseCoordinates.length; index++) {
                if (responseCoordinates[index].x === point.x && responseCoordinates[index].y === point.y) {
                    responseCoordinates[index].x = snappedPoint.x;
                    responseCoordinates[index].y = snappedPoint.y;
                    point = this.model.convertToCanvasCoordinates(snappedPoint);
                    circle.hitArea.x = point.x;
                    circle.hitArea.y = point.y
                    return true;
                }
            }
        },

        //update the response coordinates of the dragged point
        "updateReferencePoints": function(circle, snappedPoint) {
            var index = 0,
                referencePoints = this.model.get("referencePoints"),
                point = this.snapToGrid(this.model.convertToGraphCoordinates(circle.hitArea)),
                gridLimits = this.model.get("gridLimits");

            //if the point is dropped at a position outside the graph
            if (snappedPoint.x > gridLimits.xUpper || snappedPoint.x < gridLimits.xLower || snappedPoint.y > gridLimits.yUpper || snappedPoint.y < gridLimits.yLower) {
                this._reRenderGridGraph();
                return;
            }
            for (; index < referencePoints.length; index++) {
                if (referencePoints[index].x === point.x && referencePoints[index].y === point.y) {
                    referencePoints[index].x = snappedPoint.x;
                    referencePoints[index].y = snappedPoint.y;
                    return true;
                }
            }
        },

        "onDragStart": function(circle, event) {
            this.triggerCanvasClick();
            var canvasPoint = {
                    "x": event.data.originalEvent.offsetX,
                    "y": event.data.originalEvent.offsetY
                },
                snappedPoint = this.snapToGrid(this.model.convertToGraphCoordinates(circle.hitArea)),
                //check if the point is existing
                isExisting = this.checkForExistingPoint(snappedPoint);
            this.downPoint = canvasPoint;
            this.dragging = true;
            this.hasDragged = false;
            if (this.model.get("isStatic")) {
                //restrict response points dragging in static mode
                if (!isExisting.response) {
                    //circle is for referencePoints
                    this.circle = circle;
                    this.container = null;
                }
            } else {
                //restrict reference points dragging in static mode
                if (!isExisting.reference) {
                    //container is for responseCoordinates
                    this.container = circle;
                    this.circle = null;
                }
            }
            //this._refreshGridGraph();
        },

        //on dropping the point
        "onDragEnd": function(event) {
            var offset = this.$el.offset(),
                graphPoint, snappedPoint, isExisting,
                canvasPoint, isExistingPoint,
                circle = this.circle,
                container = this.container;

            if (this.dragging) {
                if (event.type === "touchend") {
                    canvasPoint = {
                        "x": event.originalEvent.changedTouches[0].pageX - offset.left,
                        "y": event.originalEvent.changedTouches[0].pageY - offset.top
                    };
                } else {
                    canvasPoint = {
                        "x": event.offsetX,
                        "y": event.offsetY
                    };
                }


                graphPoint = this.model.convertToGraphCoordinates(canvasPoint);
                snappedPoint = this.snapToGrid(graphPoint);
                this.upPoint = canvasPoint;
                //isExisting check if 2 points overlap.
                //isSamePoint checks if the dragged point as dropped at its same location
                //hasDragged handles click event if it is false
                isSamePoint = this.checkForSamePoint();
                if (container) {
                    if ($(event.target).hasClass("grid-graph-canvas")) {
                        isOverlapping = this.checkForOverlappingPoints(snappedPoint, container);
                        if (this.hasDragged && !isSamePoint && !isOverlapping) {
                            isExisting = this.checkForExistingPoint(snappedPoint);
                            if (isExisting.reference) {
                                this._refreshGridGraph();
                            } else {
                                this.updateResponseCoordinates(container, snappedPoint);
                                if (isExisting.response) {
                                    this.deleteRepeatingResponsePoints(snappedPoint, container);
                                }
                                this.trigger(GridGraphModel.EVENTS.RESPONSE_UPDATED);
                                this._refreshGridGraph();
                            }
                        } else if (!this.hasDragged) {
                            this.updateResponseCoordinates(container, snappedPoint);
                            this.deleteRepeatingResponsePoints(snappedPoint, container);
                            this.trigger(GridGraphModel.EVENTS.RESPONSE_UPDATED);
                        } else {
                            this._refreshGridGraph();
                        }
                    } else {
                        //if the mouse up is triggered outside the canvas
                        container.position.x = canvasPoint.x - container.hitArea.x;
                        container.position.y = canvasPoint.y - container.hitArea.y;
                        this._refreshGridGraph();
                    }
                    container
                        .off('mousedown')
                        .off('touchstart');
                } else if (circle) {
                    if ($(event.target).hasClass("grid-graph-canvas")) {
                        isOverlapping = this.checkForOverlappingPoints(snappedPoint, circle);

                        if (this.hasDragged && !isSamePoint && !isOverlapping) {
                            isExisting = this.checkForExistingPoint(snappedPoint);
                            if (isExisting.response) {
                                this._refreshGridGraph();
                            } else {
                                this.updateReferencePoints(circle, snappedPoint);
                                if (isExisting.reference) {
                                    this.deleteRepeatingReferencePoints(snappedPoint, circle);
                                }
                                this._refreshGridGraph();
                            }
                        } else if (!this.hasDragged) {
                            this.updateReferencePoints(circle, snappedPoint);
                            this.deleteRepeatingReferencePoints(snappedPoint, circle);
                        } else {
                            this._refreshGridGraph();
                        }
                    } else {
                        //if the mouse up is triggered outside the canvas
                        circle.position.x = canvasPoint.x - circle.hitArea.x;
                        circle.position.y = canvasPoint.y - circle.hitArea.y;
                        this._refreshGridGraph();
                    }
                    circle
                        .off('mousedown', $.proxy(this.onDragStart))
                        .off('touchstart', $.proxy(this.onDragStart));
                }

                this.circle = null;
                this.container = null;
                this.dragging = false;
                this._reRenderGridGraph();
                if (!this.model.get("responseCoordinates").length) {
                    this.trigger(GridGraphModel.EVENTS.RESPONSES_EMPTY);
                }
            }
        },

        //move the point along with the mouse cursor when being dragged
        "onMove": function(event) {
            circle = this.circle;
            container = this.container;
            if (this.dragging && $(event.target).hasClass("grid-graph-canvas")) {
                this.isDirty = true;
                var offset = this.$el.offset(),
                    canvasPoint;
                if (event.type === "touchmove") {
                    canvasPoint = {
                        "x": event.originalEvent.touches[0].pageX - offset.left,
                        "y": event.originalEvent.touches[0].pageY - offset.top
                    };
                } else {
                    canvasPoint = {
                        "x": event.offsetX,
                        "y": event.offsetY
                    };
                }

                this.movePoint = {
                    "x": canvasPoint.x,
                    "y": canvasPoint.y
                };
                if (circle) {
                    if (this.movePoint.x !== this.downPoint.x && this.movePoint.y !== this.downPoint.y) {
                        this.hasDragged = true;
                        circle.position.x = canvasPoint.x - circle.hitArea.x;
                        circle.position.y = canvasPoint.y - circle.hitArea.y;
                        this._refreshGridGraph();
                    }
                } else if (container) {
                    if (this.movePoint.x !== this.downPoint.x && this.movePoint.y !== this.downPoint.y) {
                        this.hasDragged = true;
                        container.position.x = canvasPoint.x - container.hitArea.x;
                        container.position.y = canvasPoint.y - container.hitArea.y;
                        this._refreshGridGraph();
                    }
                }
            }
        },

        "highlightCorrect": function(graphPoint) {
            var $currentElem = this.createHighlightElement(graphPoint);
            $currentElem.addClass('highlight-correct fa');
        },

        "highlightWrong": function(graphPoint) {
            var $currentElem = this.createHighlightElement(graphPoint);
            $currentElem.addClass('highlight-wrong fa');
        },

        "createHighlightElement": function(graphPoint) {
            var canvasPoint = this.model.convertToCanvasCoordinates(graphPoint),
                $elem = $('<div>');
            $elem.addClass('highlight-answer')
                .css({
                    "left": canvasPoint.x - 7.5,
                    "top": canvasPoint.y - 9
                });
            this.$el.append($elem);
            return $elem;
        },

        /**
         * Calculates and returns adjustment for x position of text label
         *
         * @param {number} xPos, x position of the text object
         * @param {PIXI.Text} textObj, text object for which adjustment is to be calculated
         * @param {boolean} isXLabel, to check whether the label is x axis or y axis label
         * @return {number} adjustment for x position
         * @private
         */
        "_getXAdjust": function(xPos, textObj, isXLabel) {
            var width = textObj.getBounds().width;
            if (isXLabel) {
                if (xPos + width > this.model.get('canvasWidth')) {
                    return width;
                }
                if (xPos - width / 2 < 0) {
                    return 0;
                }
                return width / 2;
            }
            if (xPos - width < 0) {
                return 0;
            }
            return width;
        },

        /**
         * Calculates and returns adjustment for y position of text label
         * @param {number} yPos, y position of the text object
         * @param {PIXI.Text} textObj, text object for which adjustment is to be calculated
         * @param {boolean} isXLabel, to check whether the label is x axis or y axis label
         * @return {number}
         * @private
         */
        "_getYAdjust": function(yPos, textObj, isXLabel) {
            var height = textObj.getBounds().height;
            if (yPos + height > this.model.get('canvasHeight')) {
                return height;
            }
            if (!isXLabel) {
                if (yPos - height / 2 < 0) {
                    return 0;
                }
                return height / 2;
            }
            return 0;
        },

        /**
         * Draws line from first point to second point
         *
         * @method _drawLine
         * @param {any} point1, object containing x and y coordinates of first point
         * @param {any} point2, object containing x and y coordinates of second point
         * @return {boolean} true if atleast one point is visible else returns false
         * @private
         */
        "_drawLine": function(point1, point2) {
            if (this.model.isPointVisible(point1) || this.model.isPointVisible(point2)) {
                var canvasPoint1 = this.model.convertToCanvasCoordinates(point1),
                    canvasPoint2 = this.model.convertToCanvasCoordinates(point2);
                this.pixiGraphics
                    .moveTo(canvasPoint1.x, canvasPoint1.y)
                    .lineTo(canvasPoint2.x, canvasPoint2.y);
                return true;
            }
            return false;
            // CR: avoid console logs if req for testing purpose provide a debug flag.
            // CR-Change: removed console, added appropriate return statements
        },

        // CR: grid graph settings should not be dependent on external elements with specific selectors?
        // we'll need to discuss about it
        // CR-Change: Added functions for changing model properties
        /**
         * Changes background color attribute of model
         * @param {number} backgroundColor, color for background in zero-x notation
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeBackgroundColor": function(backgroundColor, shouldRefresh) {
            this.model.set('backgroundColor', backgroundColor);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes grid line color attribute of model
         * @param {number} gridLineColor, color for grid lines in zero-x notation
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeGridLinesColor": function(gridLineColor, shouldRefresh) {
            this.model.set('gridLinesColor', gridLineColor);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes label color attribute of model
         * @param {number} gridLabelsColor, color for grid lines in zero-x notation
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeLabelsColor": function(gridLabelsColor, shouldRefresh) {
            this.model.set('labelsFontColor', gridLabelsColor);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes axes color attribute of model
         * @param {number} gridAxesColor, color for axes in zero-x notation
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeGridAxesColor": function(gridAxesColor, shouldRefresh) {
            this.model.set('gridAxesColor', gridAxesColor);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes canvas height attribute of model
         * @param {number} canvasHeight, height of the canvas
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeCanvasHeight": function(canvasHeight, shouldRefresh) {
            this.model.set('canvasHeight', canvasHeight);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes canvas width attribute of model
         * @param {number} canvasWidth, width of the canvas
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeCanvasWidth": function(canvasWidth, shouldRefresh) {
            this.model.set('canvasWidth', canvasWidth);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes x interval attribute of model
         * @param {number} xInterval, new x interval
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeXInterval": function(xInterval, shouldRefresh) {
            this.model.set('xInterval', xInterval);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes y interval attribute of model
         * @param {number} yInterval, new y interval
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeYInterval": function(yInterval, shouldRefresh) {
            this.model.set('yInterval', yInterval);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        "changeXLabel": function(xLabel, shouldRefresh) {
            this.model.set('xAxisLabel', xLabel);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        "changeYLabel": function(yLabel, shouldRefresh) {
            this.model.set('yAxisLabel', yLabel);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        "changeVerticalLabel": function(verticalLabel, shouldRefresh) {
            this.model.set('verticalLabel', verticalLabel);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        "changeHorizontalLabel": function(horizontalLabel, shouldRefresh) {
            this.model.set('horizontalLabel', horizontalLabel);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        "changeGraphLabel": function(graphName, shouldRefresh) {
            this.model.set('graphName', graphName);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes show axes attribute of model
         * @param {boolean} showAxes, if true axes will be shown or otherwise
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "showHideAxes": function(showAxes, shouldRefresh) {
            this.model.set('showAxes', showAxes);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes show grid lines attribute of model
         * @param {boolean} showGridLines, if true grid lines will be shown or otherwise
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "showHideGridLines": function(showGridLines, shouldRefresh) {
            this.model.set('showGridLines', showGridLines);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes show interval labels attribute of model
         * @param {boolean} showIntervalLabels, if true labels will be shown or otherwise
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "showHideIntervalLabels": function(showIntervalLabels, shouldRefresh) {
            this.model.set('showIntervalLabels', showIntervalLabels);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes show arrows attribute of model
         * @param {boolean} showArrows, if true arrows will be shown or otherwise
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "showArrows": function(showArrows, shouldRefresh) {
            this.model.set('showArrows', showArrows);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes restrictPoints attribute of model
         * @param {boolean} restrictPoints, if true points can be restricted
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "restrictPoints": function(restrictPoints, shouldRefresh) {
            this.model.set('restrictPoints', restrictPoints);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        /**
         * Changes maxSelectablePoints attribute of model
         * @param {boolean} maxSelectablePoints, the new value will be set to the model
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "changeMaxSelectablePoints": function(maxSelectablePoints, shouldRefresh) {
            this.model.set('maxSelectablePoints', maxSelectablePoints);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        "checkMaxSelectablePtsRange": function(maxSelectablePoints) {
            var minPoints = this.model.get("minPoints"),
                maxPoints = this.model.get("maxPoints");

            if (maxSelectablePoints < minPoints || maxSelectablePoints > maxPoints) {
                return false;
            } else {
                return true;
            }
        },

        "checkIntervals": function(intervals) {
            var minGridInterval = this.model.get("minGridInterval"),
                maxGridInterval = this.model.get("maxGridInterval");
            if (intervals.xInterval < minGridInterval || intervals.xInterval > maxGridInterval || intervals.yInterval < minGridInterval || intervals.yInterval > maxGridInterval || intervals.xLabelInterval < minGridInterval || intervals.xLabelInterval > maxGridInterval || intervals.yLabelInterval < minGridInterval || intervals.yLabelInterval > maxGridInterval) {
                return false;
            } else {
                return true;
            }
        },


        "checkGridLimits": function(gridLimits) {
            var minLower = this.model.get("minLower"),
                maxUpper = this.model.get("maxUpper");
            if (gridLimits.xLower < minLower || gridLimits.yLower < minLower || gridLimits.xUpper > maxUpper || gridLimits.yUpper > maxUpper) {
                return false;
            } else {
                return true;
            }
        },

        "invalidGridLimits": function(gridLimits) {
            if (gridLimits.xLower >= gridLimits.xUpper || gridLimits.yLower >= gridLimits.yUpper) {
                return false;
            } else {
                return true;
            }
        },
        /**
         * Sets grid limits fot the grid
         * @param {any} gridLimits, object containing new grid limits
         * @param {boolean} shouldRefresh, if true graph will be re-rendered
         */
        "setGridLimits": function(gridLimits, shouldRefresh) {
            var prevGridLimits = this.model.get('gridLimits'),
                xLower = gridLimits.xLower || prevGridLimits.xLower,
                xUpper = gridLimits.xUpper || prevGridLimits.xUpper,
                yLower = gridLimits.yLower || prevGridLimits.yLower,
                yUpper = gridLimits.yUpper || prevGridLimits.yUpper,
                newGridLimits = {
                    "xLower": Number(xLower),
                    "xUpper": Number(xUpper),
                    "yLower": Number(yLower),
                    "yUpper": Number(yUpper)
                };
            this.model.set('gridLimits', newGridLimits);
            if (shouldRefresh) {
                this._reRenderGridGraph();
            }
        },

        "checkIfDataChange": function(settings) {
            var gridLimits = this.model.get("gridLimits"),
                xInterval = this.model.get("xInterval"),
                yInterval = this.model.get("yInterval"),
                xLabelInterval = this.model.get("xLabelInterval"),
                yLabelInterval = this.model.get("yLabelInterval");
            if (settings.xLower != gridLimits.xLower || settings.xUpper != gridLimits.xUpper || settings.yLower != gridLimits.yLower || settings.yUpper != gridLimits.yUpper ||
                settings.xInterval != xInterval || settings.yInterval != yInterval || settings.xLabelInterval != xLabelInterval || settings.yLabelInterval != yLabelInterval) {
                return true;
            } else {
                return false;
            }
        },


        //render image back if it exists
        //put it at 0, so that the image is loaded before any other graphics
        "_renderImage": function(sprite) {
            if (sprite) {
                this.pixiGraphics.addChildAt(sprite, 0);
            }
        },

        //pass url from the calling function
        //add image. if the same image is being added, do not wait to load it
        //remove image handled when isExisting is passed true
        "addRemoveImage": function(isExisting, url, imageDimension) {
            if (url) {
                this.sprite = new PIXI.Sprite.fromImage(url);
                this.sprite.texture.baseTexture.on("loaded", $.proxy(function() {
                    this.setup(this.sprite);
                }, this));

                this.model.set({
                    "imageUrl": url,
                    "imageDimension": imageDimension
                });
                //for images that are already loaded
                this.setup(this.sprite);
            } else if (isExisting) {
                this.sprite = null;
                this.model.set({
                    "imageUrl": null,
                    "imageDimension": null

                });
                this.pixiGraphics.removeChildAt(0);
                this._refreshGridGraph();
            }
        },

        //setup is called after the image loading is complete
        //give the position and other characteristics of the image here

        "setup": function(sprite) {
            var DISTANCE = GridGraphModel.OUTER_DISTANCE,
                canvasHeight = this.model.get("canvasHeight"),
                canvasWidth = this.model.get("canvasWidth"),
                spritePosition = {
                    "x": DISTANCE,
                    "y": DISTANCE
                },
                imageDimension = this.model.get("imageDimension"),
                imageRatio = imageDimension.width / imageDimension.height,
                canvasDimension = {
                    "height": canvasHeight - 2 * DISTANCE,
                    "width": canvasWidth - 2 * DISTANCE
                },
                spriteHeight, spriteWidth;
            sprite.position = spritePosition;
            if (imageRatio > 1) {
                //width is greater than height
                spriteWidth = canvasDimension.width;
                spriteHeight = spriteWidth / imageRatio;
            } else {
                spriteHeight = canvasDimension.height;
                spriteWidth = spriteHeight * imageRatio;
            }
            sprite.height = spriteHeight;
            sprite.width = spriteWidth;
            this._renderImage(sprite);
            this._refreshGridGraph();
        },

        /**
         * Creates and returns instance of grid graph view
         * @param {any} gridOptions, option object for initializing model
         * @return {GridGraphView} gridGraphView, instance of grid view
         */
        "createGridGraph": function(gridOptions) {
            if (!gridOptions.containerId) {
                console.log("PLEASE PROVIDE CONTIANER ID FOR GRAPH");
                return;
            }
            var containerId = "#" + gridOptions.containerId,
                gridGraphModel = new GridGraphModel(gridOptions),
                gridGraphView = new GridGraphView({
                    "model": gridGraphModel,
                    "el": containerId
                });
            return gridGraphView;
        }

    });

    return GridGraphView;
});
