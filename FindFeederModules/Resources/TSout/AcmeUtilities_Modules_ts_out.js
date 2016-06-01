/// <reference path="../Resources/Libs/Framework.d.ts" />
/// <reference path="../Resources/Libs/Mapping.Infrastructure.d.ts" />
var GeocortexCore;
(function (GeocortexCore) {
    var Utilities = (function () {
        function Utilities() {
        }
        Utilities.createNewGcxFeature = function (layerName, site, type, templateName, geometry) {
            if (!templateName) {
                return this.createNewGcxFeature(layerName, site, "default", "default", geometry);
            }
            var featureServices = site.getFeatureServices();
            //debugger;
            var layer;
            var featureTemplate;
            for (var i = 0; i < featureServices.length; i++) {
                if (featureServices[i].serviceLayer && featureServices[i].serviceLayer.name === layerName) {
                    var featureLayer = featureServices[i].serviceLayer;
                    var featureType;
                    if (featureLayer.types.length > 0) {
                        if (type.toLowerCase() === "default") {
                            // Get the first type if we are looking for default
                            featureType = featureLayer.types[0];
                        }
                        else {
                            // Loop through the types to find the one that we want.
                            for (var j = 0; j < featureLayer.types.length; j++) {
                                if (featureLayer.types[j].name === type) {
                                    featureType = featureLayer.types[j];
                                    break; //River added this line
                                }
                            }
                        }
                    }
                    var featureTemplates;
                    if (featureType) {
                        featureTemplates = featureType.templates;
                    }
                    else {
                        featureTemplates = featureLayer.templates;
                    }
                    // If there's more than 1 feature template we need to find the right one.
                    if (featureTemplates && featureTemplates.length > 0) {
                        if (templateName.toLowerCase() === "default") {
                            featureTemplate = featureTemplates[0];
                        }
                        else {
                            for (var k = 0; k < featureLayer.types[j].templates.length; k++) {
                                if (featureLayer.types[j].templates[k].name === templateName) {
                                    featureTemplate = featureLayer.types[j].templates[k];
                                    break;
                                }
                            }
                            if (!featureTemplate) {
                                featureTemplate = featureTemplates[0];
                            }
                        }
                    }
                    layer = featureServices[i].layers[0];
                    if (featureTemplate) {
                        var feature = new esri.Graphic(featureTemplate.prototype.toJson());
                        if (geometry) {
                            feature.setGeometry(geometry);
                        }
                    }
                    else {
                        var feature = new esri.Graphic(null);
                        feature.attributes = {};
                        if (geometry) {
                            feature.setGeometry(geometry);
                        }
                    }
                    var gcxFeature = new geocortex.essentialsHtmlViewer.mapping.infrastructure.Feature({ graphic: feature, layer: layer, resolveLayerFields: true });
                    return gcxFeature;
                }
            }
            return null;
        };
        Utilities.getFeatureService = function (layerName, site) {
            if (!site)
                return;
            var mapServices = site.getFeatureServices();
            if (mapServices && mapServices.length > 0) {
                for (var s in mapServices) {
                    var mapService = mapServices[s];
                    if (mapService.serviceLayer && mapService.serviceLayer.name === layerName) {
                        return mapService.serviceLayer;
                    }
                }
            }
            return null;
        };
        Utilities.getFeatureLayer = function (name, site) {
            var featureServices = site.getFeatureServices();
            var featureLayer;
            featureServices.forEach(function (featureService) {
                if (featureService.serviceLayer && featureService.serviceLayer.name === name) {
                    featureLayer = featureService.serviceLayer;
                    return;
                }
            });
            return featureLayer;
        };
        Utilities.getEssentialsLayer = function (name, site) {
            var essentialsLayer;
            var featureServices = site.getFeatureServices();
            featureServices.forEach(function (featureService) {
                if (featureService.findLayerByName(name)) {
                    essentialsLayer = featureService.findLayerByName(name);
                    return;
                }
            });
            return essentialsLayer;
        };
        Utilities.getMapServiceByLayer = function (layer, site) {
            // If the layer URL is null, it's an offline layer and will have layer metadata containing the online service URL.
            var layerUrl = layer.url || layer["_essentialsMetadata"]["serviceUrl"];
            if (!layerUrl) {
                return null;
            }
            var tokenIx = layerUrl.indexOf("?token=");
            // If the layer is token secured that token will be part of the url
            // If other parameters can be part of the url they may also need to be accounted for here
            // layer._url contains the url without any parameters but as a "private" variable I'd rather not touch it
            if (tokenIx != -1) {
                layerUrl = layerUrl.substring(0, tokenIx);
            }
            for (var i = 0; i < site.essentialsMap.mapServices.length; ++i) {
                var mapService = site.essentialsMap.mapServices[i];
                if (mapService.serviceUrl === layerUrl) {
                    return mapService;
                }
            }
            return null;
        };
        // Copied from geocortex.workflow.DefaultActivityHandlers (Essentials.js)
        Utilities.findMapServiceByMap = function (map, serviceId) {
            if (!map || !serviceId) {
                return null;
            }
            // Search regular layers
            if (map.layerIds != null) {
                for (var i = 0; i < map.layerIds.length; i++) {
                    var layer = map.getLayer(map.layerIds[i]);
                    if (layer != null && geocortex.essentials.utilities.SiteResourceIdComparer.equals(layer.id, serviceId)) {
                        // Found matching map service
                        return layer;
                    }
                }
            }
            // Search graphics layers
            if (map.graphicsLayerIds != null) {
                for (var i = 0; i < map.graphicsLayerIds.length; i++) {
                    var layer = map.getLayer(map.graphicsLayerIds[i]);
                    if (layer != null && geocortex.essentials.utilities.SiteResourceIdComparer.equals(layer.id, serviceId)) {
                        // Found matching map service
                        return layer;
                    }
                }
            }
            return null;
        };
        return Utilities;
    })();
    GeocortexCore.Utilities = Utilities;
})(GeocortexCore || (GeocortexCore = {}));
/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />
/// <reference path="../../utilities/utilities.ts" />
/// <reference path="../../resources/libs/arcgis-js-api.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var FindFeederModules;
(function (FindFeederModules) {
    var FindFeederModule = (function (_super) {
        __extends(FindFeederModule, _super);
        function FindFeederModule(app, lib) {
            _super.call(this, app, lib);
            this.viewModel = null;
            this._tieDevices = [];
            this._size = 15;
            this._data = null;
            this._feederExtent = null;
            this._upstreamEIDS = null;
            this._downstreamEIDS = null;
            this.downstreamLayer = null;
            this.upstreamstreamLayer = null;
            this.feederLayer = null;
            this._feederGraphic = null;
            this._upstreamGraphic = null;
            this._downstreamGraphic = null;
            this.esriQuery = null;
            this.esriQueryTask = null;
            this._circleGraphicLayer = null;
            this._token = "";
        }
        FindFeederModule.prototype.clearResults = function () {
            this._data = null;
            this._upstreamEIDS = null;
            this._downstreamEIDS = null;
            this._feederGraphic = null;
            this._upstreamGraphic = null;
            this._downstreamGraphic = null;
            this.upstreamstreamLayer.clear();
            this.downstreamLayer.clear();
            this.feederLayer.clear();
        };
        FindFeederModule.prototype.zoomToFeederClick = function () {
            this.zoomToFeeder(true);
        };
        FindFeederModule.prototype.zoomToFeeder = function (forceZoom) {
            if (this.viewModel.autoZoom.get() || forceZoom) {
                if (this._feederExtent != null) {
                    this.app.map.setExtent(this._feederExtent);
                }
                else if (forceZoom) {
                    alert("Unable to zoom to the feeder.");
                }
            }
        };
        FindFeederModule.prototype.getJson = function () {
            var selectedFeederID = $("#cboFindFeederFeederList").val().split(":")[1];
            this.viewModel.selectedFeeder.set("Looking for Feeder " + $("#cboFindFeederFeederList").val());
            $("#imgSpinner").css("display", "inline");
            //setTimeout(this.getJson2, 1000, this, selectedFeederID);
            this.getJson2(this, selectedFeederID);
        };
        FindFeederModule.prototype.hexToRgb = function (hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };
        FindFeederModule.prototype.drawJunctionFeederGraphics = function (data) {
        };
        FindFeederModule.prototype.drawFeederGraphics = function () {
            //this._data = data;
            var data = this._data;
            if (data === undefined) {
                return;
            }
            if ($.inArray("feederLayer", this.app.map.graphicsLayerIds) === -1) {
                var fl = new esri.layers.GraphicsLayer();
                fl.id = "feederLayer";
                var dn = new esri.layers.GraphicsLayer();
                dn.id = "downstreamLayer";
                var us = new esri.layers.GraphicsLayer();
                us.id = "upstreamLayer";
                this.app.map.addLayers([fl, dn, us]);
                this.feederLayer = fl;
                this.upstreamstreamLayer = us;
                this.downstreamLayer = dn;
            }
            //this.feederLayer.clear();
            //this.app.map.graphics.clear();
            var lineSymbol = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
            var rgb = this.hexToRgb(this.viewModel.feederColor.get());
            var red = rgb.r;
            var green = rgb.g;
            var blue = rgb.b;
            lineSymbol.setColor(new esri.Color([red, green, blue, 0.5]));
            var eidToLineGeometry = data.feeder.eidToLineGeometry;
            if (this._feederGraphic === null) {
                var combinedPaths = [];
                for (var i = 0; i < eidToLineGeometry.length; i++) {
                    var singlePath = eidToLineGeometry[i][1];
                    combinedPaths.push(singlePath[0]);
                }
                var polyLine = new esri.geometry.Polyline({
                    "paths": combinedPaths,
                    "spatialReference": { "wkid": 102100 }
                });
                var g = new esri.Graphic(polyLine, lineSymbol);
                this._feederGraphic = g;
                this.feederLayer.add(g);
            }
            this._feederGraphic.setSymbol(lineSymbol);
            //this.app.map.graphics.add(g);
        };
        FindFeederModule.prototype.getJson2 = function (context, selectedFeeder) {
            //var context = this;
            var map = context.app.map;
            var vm = this.viewModel;
            var context = this;
            var urlToJson = "/Html5Viewer260/Resources/Feeders/" + selectedFeeder + ".json";
            $.ajax({
                url: urlToJson
            }).then(function (data) {
                try {
                    vm.data.set(data);
                    /*var tds: any[] = data.feeder.tieDevices[0];
                    //context._tieDevices = tds;
                    vm.tieDevices.set(tds);
                    $('#cboTieDevices').empty()
                    var firstFacID = "";
                    for (var tdIndex = 0; tdIndex < tds.length; tdIndex++)
                    {
                        var facID = tds[tdIndex].FACILITYID;
                        if (firstFacID === "") {
                            firstFacID = facID;
                        }
                        $('#cboTieDevices').append($('<option>', {
                            value: facID,
                            text: facID
                        }));
                    }
                    $("#cboTieDevices").val(firstFacID);*/
                    var feederExtent = new eg.Extent(data.feeder.extent);
                    context._feederExtent = feederExtent;
                    context._data = data;
                    //ffPriOH,ffSecOH,ffOHTotal,ffPriUG,ffSecUG,ffUGTotal
                    vm.ffCustomersA.set(data.feeder.customers.PhaseACustomers);
                    vm.ffCustomersB.set(data.feeder.customers.PhaseBCustomers);
                    vm.ffCustomersC.set(data.feeder.customers.PhaseCCustomers);
                    vm.ffCustomersTotal.set(data.feeder.customers.Total);
                    vm.ffPriOH.set(data.feeder.conductor.priOH);
                    vm.ffPriUG.set(data.feeder.conductor.priUG);
                    vm.ffSecOH.set(data.feeder.conductor.secOH);
                    vm.ffSecUG.set(data.feeder.conductor.secUG);
                    vm.ffOHTotal.set(data.feeder.conductor.ohTotal);
                    vm.ffUGTotal.set(data.feeder.conductor.ugTotal);
                    vm.ffPriTotal.set(data.feeder.conductor.priTotal);
                    vm.ffSecTotal.set(data.feeder.conductor.secTotal);
                    vm.ffConductorTotal.set(data.feeder.conductor.conductorTotal);
                    /*
                    var load: any = data.feeder.load;
                    var customers = data.feeder.customers;
                    var conductor = data.feeder.conductor;
                    var tieDevices = data.feeder.tieDevices;
                    context.viewModel.ffLoadA.set(load["A"].toString());
                    context.viewModel.ffLoadB.set(load["B"].toString());
                    context.viewModel.ffLoadC.set(load["C"].toString());
                    context.viewModel.ffLoadTotal.set(load["Total"].toString());
                    context.viewModel.ffCustomersA.set(customers["A"].toString());
                    context.viewModel.ffCustomersB.set(customers["B"].toString());
                    context.viewModel.ffCustomersC.set(customers["C"].toString());
                    context.viewModel.ffCustomersTotal.set(customers["Total"].toString());
                    context.viewModel.ffConductorA.set(conductor["A"].toString());
                    context.viewModel.ffConductorB.set(conductor["B"].toString());
                    context.viewModel.ffConductorC.set(conductor["C"].toString());
                    context.viewModel.ffConductorTotal.set(conductor["Total"].toString());*/
                    context.drawFeederGraphics();
                }
                finally {
                    $("#imgSpinner").css("display", "none");
                    context.viewModel.selectedFeeder.set("Found Feeder " + selectedFeeder);
                    context.zoomToFeeder(false);
                }
            });
        };
        FindFeederModule.prototype.initialize = function (config) {
            var _this = this;
            this.app.command("doShowArrows").register(this, this.showArrows);
            this.app.command("doClearResults").register(this, this.clearResults);
            this.app.command("doZoomToFeeder").register(this, this.zoomToFeederClick);
            this.app.command("doGetJson").register(this, this.getJson);
            this.app.event("FindFeederViewModelAttached").subscribe(this, function (model) {
                _this.app.map.on("extent-change", function (evt) { _this.FindFeedermapExtentChangeHandler(_this, evt); });
                _this.app.map.on("click", function (evt) { _this.FindFeederMapClickHandler(_this, evt); });
                //alert("from the module");
                _this.viewModel = model;
                var graphicLayers = _this.app.map.graphicsLayerIds;
                for (var i = 0; i < graphicLayers.length; i++) {
                    console.log(graphicLayers[i]);
                }
                //this.viewModel.notifyView(this.app);
            });
        };
        FindFeederModule.prototype.FindFeederMapClickHandler = function (context, evt) {
            if (this.viewModel.showTraceUpDown.get()) {
                //this.viewModel.ffFlowDirectionTraceMode.set(false);
                var eidToUpstreamAssocArray = [];
                for (var eidIndex = 0; eidIndex < this._data.feeder.uptopology.length; eidIndex++) {
                    var eid_upEIDPair = this._data.feeder.uptopology[eidIndex];
                    eidToUpstreamAssocArray[eid_upEIDPair[0]] = eid_upEIDPair[1];
                }
                var eidToDownstreamAssocArray = [];
                for (var eidIndex = 0; eidIndex < this._data.feeder.downTopology.length; eidIndex++) {
                    var eid_downEIDSPair = this._data.feeder.downTopology[eidIndex];
                    eidToDownstreamAssocArray[eid_downEIDSPair[0]] = eid_downEIDSPair[1];
                }
                var eidToLineGeometry = this._data.feeder.eidToLineGeometry;
                var mapPoint = evt.mapPoint;
                var mapPointX = mapPoint.x;
                var mapPointY = mapPoint.y;
                var closestSoFar = 9999;
                var startEID = -9999;
                for (var i = 0; i < eidToLineGeometry.length; i++) {
                    var verticiesOnLineSegment = eidToLineGeometry[i][1][0];
                    for (var j = 0; j < verticiesOnLineSegment.length; j++) {
                        var pointOnLine = verticiesOnLineSegment[j];
                        var pointOnLineX = pointOnLine[0];
                        var pointOnLineY = pointOnLine[1];
                        var dist = ((pointOnLineX - mapPointX) * (pointOnLineX - mapPointX)) + ((pointOnLineY - mapPointY) * (pointOnLineY - mapPointY));
                        if (dist < closestSoFar) {
                            closestSoFar = dist;
                            startEID = eidToLineGeometry[i][0];
                        }
                    }
                }
                //Now that we know the startEID, get the eids that are upstream from it. 
                var currentEID = -1 * startEID;
                var upstreamEdgeEidsToDraw = [];
                while (currentEID != -99999999) {
                    if (currentEID === undefined) {
                        alert("No path found");
                        break;
                    }
                    if (currentEID < 0) {
                        upstreamEdgeEidsToDraw.push(-1 * currentEID);
                    }
                    currentEID = eidToUpstreamAssocArray[currentEID];
                }
                //Now get the downstreamEIDS
                var eidsToVisit = [];
                var downstreamEidsToDraw = [];
                eidsToVisit.push(-1 * startEID);
                var visitIndexPoint = 0;
                while (visitIndexPoint < eidsToVisit.length) {
                    var eid = eidsToVisit[visitIndexPoint];
                    if (eidToDownstreamAssocArray[eid] !== undefined) {
                        for (var i = 0; i < eidToDownstreamAssocArray[eid].length; i++) {
                            var downstreamEID = eidToDownstreamAssocArray[eid][i];
                            eidsToVisit.push(downstreamEID);
                            if (downstreamEID < 0) {
                                downstreamEidsToDraw.push(-1 * downstreamEID);
                            }
                        }
                    }
                    visitIndexPoint++;
                }
                this._upstreamEIDS = upstreamEdgeEidsToDraw;
                this._downstreamEIDS = downstreamEidsToDraw;
                //Now draw the upstream line
                this.drawUpstreamDownstreamLine(true);
            }
        };
        FindFeederModule.prototype.drawUpstreamDownstreamLine = function (refresh) {
            var upstreamEids = this._upstreamEIDS;
            var downstreamEids = this._downstreamEIDS;
            if (upstreamEids === null && downstreamEids === null) {
                return;
            }
            if ((this._upstreamGraphic === null || this._downstreamGraphic === null) || (refresh)) {
                var eidLineGeomAssocArray = [];
                for (var j = 0; j < this._data.feeder.eidToLineGeometry.length; j++) {
                    var edgeEID = this._data.feeder.eidToLineGeometry[j][0];
                    eidLineGeomAssocArray[edgeEID] = this._data.feeder.eidToLineGeometry[j][1];
                }
                var combinedPathsUp = [];
                for (var i = 0; i < upstreamEids.length; i++) {
                    var eid = upstreamEids[i];
                    var singlePath = eidLineGeomAssocArray[eid];
                    combinedPathsUp.push(singlePath[0]);
                }
                var combinedPathsDown = [];
                for (var i = 0; i < downstreamEids.length; i++) {
                    var eid = downstreamEids[i];
                    var singlePath = eidLineGeomAssocArray[eid];
                    combinedPathsDown.push(singlePath[0]);
                }
                var lineSymbolUp = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
                var lineSymbolDown = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
                var rgbUp = this.hexToRgb(this.viewModel.upstreamColor.get());
                var red = rgbUp.r;
                var green = rgbUp.g;
                var blue = rgbUp.b;
                lineSymbolUp.setColor(new esri.Color([red, green, blue, 1]));
                var rgbDown = this.hexToRgb(this.viewModel.downstreamColor.get());
                red = rgbDown.r;
                green = rgbDown.g;
                blue = rgbDown.b;
                lineSymbolDown.setColor(new esri.Color([red, green, blue, 1]));
                var polyLineUp = new esri.geometry.Polyline({
                    "paths": combinedPathsUp,
                    "spatialReference": { "wkid": 102100 }
                });
                var polyLineDown = new esri.geometry.Polyline({
                    "paths": combinedPathsDown,
                    "spatialReference": { "wkid": 102100 }
                });
                var gUp = new esri.Graphic(polyLineUp, lineSymbolUp);
                var gDown = new esri.Graphic(polyLineDown, lineSymbolDown);
                this.upstreamstreamLayer.clear();
                this.downstreamLayer.clear();
                this.upstreamstreamLayer.add(gUp);
                this.downstreamLayer.add(gDown);
                this._upstreamGraphic = gUp;
                this._downstreamGraphic = gDown;
            }
            var lineSymbolUp = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
            var lineSymbolDown = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
            var rgbUp = this.hexToRgb(this.viewModel.upstreamColor.get());
            var red = rgbUp.r;
            var green = rgbUp.g;
            var blue = rgbUp.b;
            lineSymbolUp.setColor(new esri.Color([red, green, blue, 0.5]));
            var rgbDown = this.hexToRgb(this.viewModel.downstreamColor.get());
            red = rgbDown.r;
            green = rgbDown.g;
            blue = rgbDown.b;
            lineSymbolDown.setColor(new esri.Color([red, green, blue, 0.5]));
            if (this._upstreamGraphic !== null) {
                this._upstreamGraphic.setSymbol(lineSymbolUp);
            }
            if (this._downstreamGraphic !== null) {
                this._downstreamGraphic.setSymbol(lineSymbolDown);
            }
        };
        FindFeederModule.prototype.FindFeedermapExtentChangeHandler = function (context, evt) {
            var w = this.app.map.extent.xmax - this.app.map.extent.xmin;
            var relativeSize = (2000 / w);
            var bufferSize = this.viewModel.numBufferSize.get();
            $('#numBufferChange').val;
            this._size = bufferSize * relativeSize;
            if (this._data !== null) {
                //this._size = 10;
                this.drawFeederGraphics();
                this.drawUpstreamDownstreamLine(false);
            }
        };
        FindFeederModule.prototype.mercatorToLatLon = function (mercX, mercY) {
            var rMajor = 6378137; //Equatorial Radius, WGS84
            var shift = Math.PI * rMajor;
            var lon = mercX / shift * 180.0;
            var lat = mercY / shift * 180.0;
            lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180.0)) - Math.PI / 2.0);
            lon = Math.round(lon * 10000) / 10000;
            lat = Math.round(lat * 10000) / 10000;
            return { 'Lon': lon, 'Lat': lat };
        };
        FindFeederModule.prototype.showArrows = function () {
            alert("No implemented yet");
        };
        FindFeederModule.prototype.drawFlagGraphic = function (pnt) {
            var markerSymbol = new esri.symbol.SimpleMarkerSymbol();
            if (this.flagGraphic !== null) {
                this.app.map.graphics.remove(this.flagGraphic);
            }
            markerSymbol.setPath("M9.5,3v10c8,0,8,4,16,4V7C17.5,7,17.5,3,9.5,3z M6.5,29h2V3h-2V29z");
            markerSymbol.size = 30;
            markerSymbol.setColor(new esri.Color([0, 255, 0, .5]));
            this.flagGraphic = new esri.Graphic(pnt, markerSymbol);
            this.app.map.graphics.add(this.flagGraphic);
        };
        return FindFeederModule;
    })(geocortex.framework.application.ModuleBase);
    FindFeederModules.FindFeederModule = FindFeederModule;
})(FindFeederModules || (FindFeederModules = {}));
/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />
/// <reference path="../../resources/libs/jquery.d.ts" />
/// <reference path="typeahead.d.ts" />
/// <reference path="../../resources/libs/jqueryui.d.ts" />
/// <reference path="../../resources/libs/jquery.colorpicker.d.ts" />
var eg = esri.geometry;
var et = esri.tasks;
var FindFeederModules;
(function (FindFeederModules) {
    var FindFeederView = (function (_super) {
        __extends(FindFeederView, _super);
        function FindFeederView(app, lib) {
            _super.call(this, app, lib);
            this._tieDeviceLayer = null;
            this.states = ['Aa', 'Bb', 'Cc', 'Dd', 'Ee'];
            this._viewModel = null;
        }
        FindFeederView.prototype.PopulateFeederList = function () {
            var _this = this;
            var query = new et.Query();
            query.outFields = ["ID", "CIRCUITNAME"];
            query.where = "1=1";
            query.orderByFields = ["CIRCUITNAME"];
            query.returnDistinctValues = true;
            var url = "http://52.1.143.233/arcgis103/rest/services/Schneiderville/AcmeElectric/MapServer/17";
            var qTasks = new et.QueryTask(url);
            qTasks.execute(query, function (fs) {
                //alert("in complete");
                var cboFindFeederFeederList = $("#cboFindFeederFeederList");
                cboFindFeederFeederList.empty();
                var firstID = fs.features[0].attributes["ID"]; //Used later to trigger a change on the combo box
                _this.states = [];
                for (var i = 0; i < fs.features.length; i++) {
                    var name = fs.features[i].attributes["CIRCUITNAME"];
                    var id = fs.features[i].attributes["ID"];
                    //cboFindFeederFeederList.append("<option value='" + id + "'>" + name + ":" + id + "</option>");
                    _this.states.push(name + ":" + id);
                }
                var substringMatcher = function (strs) {
                    return function findMatches(q, cb) {
                        var matches, substringRegex;
                        // an array that will be populated with substring matches
                        matches = [];
                        // regex used to determine if a string contains the substring `q`
                        var substrRegex = new RegExp(q, 'i');
                        // iterate through the pool of strings and for any string that
                        // contains the substring `q`, add it to the `matches` array
                        $.each(strs, function (i, str) {
                            if (substrRegex.test(str)) {
                                matches.push(str);
                            }
                        });
                        cb(matches);
                    };
                };
                $('#the-basics .typeahead').typeahead({
                    hint: true,
                    highlight: true,
                    minLength: 1
                }, {
                    name: 'states',
                    source: substringMatcher(_this.states)
                });
                //$('#cboFindFeederFeederList').val(firstID).trigger('change');
            }, function (err) {
                alert(err.toString());
            });
        };
        FindFeederView.prototype.setTieDeviceData = function () {
            //alert("1");
            var tieDevices = this._viewModel.data.get().feeder.tieDevices[0];
            var tieDevice = $("#cboTieDevices option:selected").index();
            var facID = tieDevices[tieDevice].FACILITYID;
            var feederIDS = tieDevices[tieDevice].FEEDERIDS;
            var streetAddress = tieDevices[tieDevice].STREETADDRESS;
            $('#lblTieDeviceFacilityID').text(facID);
            //$('#lblTieDeviceAddress').text(streetAddress);
            this._viewModel.tieDeviceAddress.set(streetAddress);
            var selectedEID = tieDevices[tieDevice].EID;
            this._viewModel.tieDeviceEID.set(selectedEID);
            //loop through the graphics in the graphics layer and set the selected property = true or false
            if (this._tieDeviceLayer != null) {
                for (var i = 0; i < this._tieDeviceLayer.graphics.length; i++) {
                    var gr = this._tieDeviceLayer.graphics[i];
                    if (gr.attributes["EID"] === selectedEID) {
                        gr.setAttributes({ "SELECTED": "True", "EID": gr.attributes["EID"] });
                    }
                    else {
                        gr.setAttributes({ "SELECTED": "False", "EID": gr.attributes["EID"] });
                    }
                }
                this._tieDeviceLayer.redraw();
            }
            $('#lblTieDeviceFeederIDs').text(feederIDS);
        };
        FindFeederView.prototype.DrawTieDevices = function () {
            if (this._tieDeviceLayer == null) {
                this._tieDeviceLayer = new esri.layers.GraphicsLayer();
                this._tieDeviceLayer.setInfoTemplate;
            }
            this._tieDeviceLayer.clear();
            var tieDevicePointSymbol1 = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 30, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0]), 2), new esri.Color([255, 255, 0, 0.9]));
            var tieDevicePointSymbol2 = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 20, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new esri.Color([0, 255, 255]), 2), new esri.Color([0, 255, 255, 0.5]));
            var uniqueValuerenderer = new esri.renderer.UniqueValueRenderer(tieDevicePointSymbol1, "SELECTED");
            uniqueValuerenderer.addValue("True", tieDevicePointSymbol1);
            uniqueValuerenderer.addValue("False", tieDevicePointSymbol2);
            //var tieDeviceRenderer = new esri.renderer.SimpleRenderer(tieDevicePointSymbol);
            this._tieDeviceLayer.setRenderer(uniqueValuerenderer);
            var tieDevices = this._viewModel.data.get().feeder.tieDevices[0];
            var eidsToHighlight = {};
            for (var i = 0; i < tieDevices.length; i++) {
                eidsToHighlight[tieDevices[i].EID.toString()] = 1;
            }
            var eid = this._viewModel.tieDeviceEID.get();
            var eidToPointGeoms = this._viewModel.data.get().feeder.eidToPointGeometry;
            for (var i = 0; i < eidToPointGeoms.length; i++) {
                var eidInJson = eidToPointGeoms[i][0];
                if (eidInJson.toString() in eidsToHighlight) {
                    var xy = eidToPointGeoms[i][1];
                    var map = this.app.map;
                    var gra = new esri.Graphic(new esri.geometry.Point(xy[0], xy[1], map.spatialReference));
                    gra.setAttributes({ "SELECTED": "False", "EID": eidInJson.toString() });
                    //gra.setAttributes({ "EID": eidInJson.toString() });
                    /*if (i < 1000) {
                        gra.setAttributes({ "SELECTED": "True" });
                    }
                    else {
                        gra.setAttributes({ "SELECTED": "False" });
                    }*/
                    this._tieDeviceLayer.add(gra);
                }
            }
            this.app.map.addLayer(this._tieDeviceLayer);
        };
        FindFeederView.prototype.ClearTieDevices = function () {
            if (this._tieDeviceLayer == null) {
                this._tieDeviceLayer = new esri.layers.GraphicsLayer();
            }
            this._tieDeviceLayer.clear();
        };
        FindFeederView.prototype.attach = function (viewModel) {
            var _this = this;
            this._viewModel = viewModel;
            _super.prototype.attach.call(this, viewModel);
            this.PopulateFeederList();
            viewModel.data.bind(this, function (data) {
                var tds = data.feeder.tieDevices[0];
                $('#cboTieDevices').empty();
                var firstFacID = "";
                for (var tdIndex = 0; tdIndex < tds.length; tdIndex++) {
                    var facID = tds[tdIndex].FACILITYID;
                    if (firstFacID === "") {
                        firstFacID = facID;
                    }
                    $('#cboTieDevices').append($('<option>', {
                        value: facID,
                        text: facID
                    }));
                }
                $("#cboTieDevices").val(firstFacID);
                _this.setTieDeviceData();
                //this.DrawTieDevices();
            });
            $('#btnZoomToTie').on('click', function (e) {
                var scale = 1;
                if (e.shiftKey) {
                    scale = 2;
                }
                if (e.ctrlKey) {
                    scale = .5;
                }
                if (e.altKey) {
                    if (scale === .5) {
                        scale = .25;
                    }
                    else if (scale === 2) {
                        scale = 4;
                    }
                }
                var eid = viewModel.tieDeviceEID.get();
                var eidToPointGeoms = viewModel.data.get().feeder.eidToPointGeometry;
                for (var i = 0; i < eidToPointGeoms.length; i++) {
                    var eidInJson = eidToPointGeoms[i][0];
                    if (eidInJson.toString() == eid) {
                        var xy = eidToPointGeoms[i][1];
                        var map = _this.app.map;
                        var pnt = new esri.geometry.Point(xy[0], xy[1], map.spatialReference);
                        map.setScale(map.getScale() * scale);
                        map.centerAt(pnt);
                        return;
                    }
                }
            });
            $("#cboTieDevices").on('change', function () {
                _this.setTieDeviceData();
                //this.DrawTieDevices();
            });
            $("#btnSelect").on('click', function () {
                _this.app.command("doSelectFeatures").execute();
            });
            $("#btnZoomTo").on('click', function () {
                _this.app.command("doZoomToFeeder").execute();
            });
            $("#numBuffer").on('change', function () {
                //this.app.command("doZoomToFeeder").execute();
                //var xmin: number = this.app.map.extent.xmin - .001;
                //var xmax: number = this.app.map.extent.xmax - .001;
                //var ymin: number = this.app.map.extent.ymin - .001;
                //var ymax: number = this.app.map.extent.ymax - .001;
                var ext = _this.app.map.extent;
                _this.app.map.setExtent(ext);
            });
            $("#downstreamColor").on('change', function () {
                //this.app.command("doZoomToFeeder").execute();
                var xmin = _this.app.map.extent.xmin - .001;
                var xmax = _this.app.map.extent.xmax - .001;
                var ymin = _this.app.map.extent.ymin - .001;
                var ymax = _this.app.map.extent.ymax - .001;
                var ext = new eg.Extent(xmin, ymin, xmax, ymax, _this.app.map.spatialReference);
                _this.app.map.setExtent(ext);
            });
            $("#btnGetJson").on('click', function () {
                _this.app.command("doGetJson").execute();
            });
            var map = this.app.map;
            $(".lblShowArrows").on('click', function () {
                $(".lblShowArrows").toggleClass("off");
                $(".showArrows").toggleClass("off");
                $(".showArrowsBox").toggleClass("off");
                if ($(".lblShowArrows").hasClass("off")) {
                    viewModel.showArrows.set(false);
                }
                else {
                    viewModel.showArrows.set(true);
                }
            });
            $("#btnClear").on('click', function () {
                _this.app.command("doClearResults").execute();
            });
            $(".lblAutoZoom").on('click', function () {
                //alert(viewModel.autoZoom.get());
                $(".lblAutoZoom").toggleClass("off");
                $(".showAutoZoom").toggleClass("off");
                $(".showAutoZoomBox").toggleClass("off");
                if ($(".lblAutoZoom").hasClass("off")) {
                    viewModel.autoZoom.set(false);
                }
                else {
                    viewModel.autoZoom.set(true);
                }
            });
            $(".lblTraceUpDown").on('click', function () {
                $(".lblTraceUpDown").toggleClass("off");
                $(".traceUpDown").toggleClass("off");
                $(".traceUpDownBox").toggleClass("off");
                if ($(".lblTraceUpDown").hasClass("off")) {
                    viewModel.showTraceUpDown.set(true);
                }
                else {
                    viewModel.showTraceUpDown.set(false);
                }
            });
            $(".lblZoomToUpstream").on('click', function () {
                $(".lblZoomToUpstream").toggleClass("off");
                $(".zoomToUpstream").toggleClass("off");
                $(".zoomToUpstreamBox").toggleClass("off");
                if ($(".lblZoomToUpstream").hasClass("off")) {
                    viewModel.zoomToUpstream.set(true);
                }
                else {
                    viewModel.zoomToUpstream.set(false);
                }
            });
            $(".lblZoomToDownstream").on('click', function () {
                $(".lblZoomToDownstream").toggleClass("off");
                $(".zoomToDownstream").toggleClass("off");
                $(".zoomToDownstreamBox").toggleClass("off");
                if ($(".lblZoomToDownstream").hasClass("off")) {
                    viewModel.zoomToDownstream.set(true);
                }
                else {
                    viewModel.zoomToDownstream.set(false);
                }
            });
            $(".lblTraceFromCache").on('click', function () {
                $(".lblTraceFromCache").toggleClass("off");
                $(".showTrace").toggleClass("off");
                $(".showTraceBox").toggleClass("off");
                if ($(".lblTraceFromCache").hasClass("off")) {
                    viewModel.traceFromCache.set(false);
                }
                else {
                    viewModel.traceFromCache.set(true);
                }
            });
            var context = this;
            this.app.event("FindFeederViewModelAttached").subscribe(this, function (model) {
                //InitJS(window, $,null);
                //Set up accordion control
                var that = _this;
                jQuery('.accordion-section-title').click(function (e) {
                    // Grab current anchor value
                    var currentAttrValue = jQuery(this).attr('href');
                    if (jQuery(e.target).is('.active')) {
                        jQuery('.accordion .accordion-section-title').removeClass('active');
                        jQuery('.accordion .accordion-section-content').slideUp(300).removeClass('open');
                    }
                    else {
                        if ($("#accSelection select option").length == 0) {
                            var mapService = null;
                            for (var i = 0; i < that.app.site.essentialsMap.mapServices.length; i++) {
                                mapService = that.app.site.essentialsMap.mapServices[i];
                                var layers = mapService.layers;
                                for (var j = 0; j < layers.length; j++) {
                                    $('#accSelection select').append($('<option>', {
                                        value: mapService.id + ":" + j,
                                        text: layers[j].name
                                    }));
                                }
                            }
                        }
                        jQuery('.accordion .accordion-section-title').removeClass('active');
                        jQuery('.accordion .accordion-section-content').slideUp(300).removeClass('open');
                        // Add active class to section title
                        jQuery(this).addClass('active');
                        // Open up the hidden content panel
                        jQuery('.accordion ' + currentAttrValue).slideDown(300).addClass('open');
                        if (currentAttrValue.toUpperCase().indexOf("TIEDEVICE") > -1) {
                            that.DrawTieDevices();
                            that.setTieDeviceData();
                        }
                        else {
                            that.ClearTieDevices();
                        }
                    }
                    e.preventDefault();
                });
                var substringMatcher = function (strs) {
                    return function findMatches(q, cb) {
                        var matches, substringRegex;
                        // an array that will be populated with substring matches
                        matches = [];
                        // regex used to determine if a string contains the substring `q`
                        var substrRegex = new RegExp(q, 'i');
                        // iterate through the pool of strings and for any string that
                        // contains the substring `q`, add it to the `matches` array
                        $.each(strs, function (i, str) {
                            if (substrRegex.test(str)) {
                                matches.push(str);
                            }
                        });
                        cb(matches);
                    };
                };
                //var states = ['A', 'B', 'C', 'D', 'E'];
                /*
                $('#the-basics .typeahead').typeahead({
                    hint: true,
                    highlight: true,
                    minLength: 1
                },
                {
                    name: 'states',
                    source: substringMatcher(context.states)
                });
                */
            });
            this.app.event("FindFeederViewModelAttached").publish(viewModel);
        };
        return FindFeederView;
    })(geocortex.framework.ui.ViewBase);
    FindFeederModules.FindFeederView = FindFeederView;
})(FindFeederModules || (FindFeederModules = {}));
function AttachTypeAhead() {
}
/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />
var FindFeederModules;
(function (FindFeederModules) {
    var FindFeederViewModel = (function (_super) {
        __extends(FindFeederViewModel, _super);
        function FindFeederViewModel(app, lib) {
            _super.call(this, app, lib);
            this.numRadius = new Observable();
            this.tieDevices = new Observable();
            this.tieDeviceEID = new Observable();
            this.tieDeviceAddress = new Observable();
            this.showArrows = new Observable();
            this.downstreamColor = new Observable();
            this.feederColor = new Observable();
            this.upstreamColor = new Observable();
            this.showTraceUpDown = new Observable();
            this.zoomToUpstream = new Observable();
            this.zoomToDownstream = new Observable();
            this.autoZoom = new Observable();
            this.traceFromCache = new Observable();
            this.zoomToSource = new Observable();
            this.urlToLayerWeWantToSelect = new Observable();
            this.selectedFeeder = new Observable();
            this.ffLoadA = new Observable();
            this.ffLoadB = new Observable();
            this.ffLoadC = new Observable();
            this.ffLoadTotal = new Observable();
            this.ffCustomersA = new Observable();
            this.ffCustomersB = new Observable();
            this.ffCustomersC = new Observable();
            this.ffCustomersTotal = new Observable();
            this.numBuffer = new Observable();
            this.ffConductorTotal = new Observable();
            this.numBufferSize = new Observable();
            this.ffPriUG = new Observable();
            this.ffSecUG = new Observable();
            this.ffPriOH = new Observable();
            this.ffSecOH = new Observable();
            this.ffUGTotal = new Observable();
            this.ffOHTotal = new Observable();
            this.data = new Observable();
            this.ffPriTotal = new Observable();
            this.ffSecTotal = new Observable();
            this.ffFlowDirectionTraceMode = new Observable();
        }
        FindFeederViewModel.prototype.initialize = function (config) {
            this.autoZoom.set(true);
            this.feederColor.set("#FF0000");
            this.upstreamColor.set("#00FF00");
            this.downstreamColor.set("#0000FF");
            this.numBufferSize.set(25);
        };
        return FindFeederViewModel;
    })(geocortex.framework.ui.ViewModelBase);
    FindFeederModules.FindFeederViewModel = FindFeederViewModel;
})(FindFeederModules || (FindFeederModules = {}));
//# sourceMappingURL=AcmeUtilities_Modules_ts_out.js.map