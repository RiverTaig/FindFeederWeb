/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />
/// <reference path="../../utilities/utilities.ts" />
/// <reference path="../../resources/libs/arcgis-js-api.d.ts" />

module FindFeederModules {
    
    export class FindFeederModule extends geocortex.framework.application.ModuleBase {
        viewModel: FindFeederViewModel = null;
        _tieDevices = [];
        _size: number = 15;
        _data: any = null;
        _feederExtent: esri.geometry.Extent = null;
        _upstreamEIDS = null;
        _downstreamEIDS = null;
        app: geocortex.essentialsHtmlViewer.ViewerApplication;
        downstreamLayer: esri.layers.GraphicsLayer = null;
        upstreamstreamLayer: esri.layers.GraphicsLayer = null;
        feederLayer: esri.layers.GraphicsLayer = null;
        _feederGraphic: esri.Graphic = null;
        _upstreamGraphic: esri.Graphic = null;
        _downstreamGraphic: esri.Graphic = null;
        
        circleGraphic: esri.Graphic;
        flagGraphic: esri.Graphic;
        _selectedFeatures: esri.tasks.FeatureSet;
        esriQuery: esri.tasks.Query = null;
        esriQueryTask: esri.tasks.QueryTask = null;
        private _circleGraphicLayer: esri.layers.GraphicsLayer = null;
        _token: string = "";
        constructor(app: geocortex.essentialsHtmlViewer.ViewerApplication, lib: string) {
            super(app, lib);
            
        }
        clearResults() {
            this._data = null;
            this._upstreamEIDS = null;
            this._downstreamEIDS = null;
            this._feederGraphic = null;
            this._upstreamGraphic = null;
            this._downstreamGraphic = null;
            this.upstreamstreamLayer.clear();
            this.downstreamLayer.clear();
            this.feederLayer.clear();
        }
        zoomToFeederClick() {
            this.zoomToFeeder(true);
        }
        zoomToFeeder(forceZoom : boolean) {
            if (this.viewModel.autoZoom.get() || forceZoom) {
                if (this._feederExtent != null) {
                    this.app.map.setExtent(this._feederExtent);
                }
                else if (forceZoom) {
                    alert("Unable to zoom to the feeder.");
                }
            }
        }
        getJson() {
            var selectedFeederID : string = $("#cboFindFeederFeederList").val().split(":")[1];
            this.viewModel.selectedFeeder.set("Looking for Feeder " + $("#cboFindFeederFeederList").val());
            $("#imgSpinner").css("display", "inline");
            //setTimeout(this.getJson2, 1000, this, selectedFeederID);
            this.getJson2(this, selectedFeederID);
        }
        hexToRgb(hex : string) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        drawJunctionFeederGraphics(data) {

        }

        drawFeederGraphics() {
            //this._data = data;
            var data = this._data;
            if (data === undefined) {
                return;
            }
            if ($.inArray("feederLayer", this.app.map.graphicsLayerIds) === -1) {
                var fl: esri.layers.GraphicsLayer = new esri.layers.GraphicsLayer();
                fl.id = "feederLayer";
                var dn: esri.layers.GraphicsLayer = new esri.layers.GraphicsLayer();
                dn.id = "downstreamLayer";
                var us: esri.layers.GraphicsLayer = new esri.layers.GraphicsLayer();
                us.id = "upstreamLayer";
                this.app.map.addLayers([fl,dn,us]);
                this.feederLayer = fl;
                this.upstreamstreamLayer = us;
                this.downstreamLayer = dn;
            }
            //this.feederLayer.clear();
            //this.app.map.graphics.clear();
            var lineSymbol = new esri.symbol.CartographicLineSymbol(
                esri.symbol.CartographicLineSymbol.STYLE_SOLID,
                new esri.Color([255, 255, 0, .5]), this._size,
                esri.symbol.CartographicLineSymbol.CAP_ROUND,
                esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3"
                );
            var rgb: any = this.hexToRgb(this.viewModel.feederColor.get());
            var red: number = rgb.r;
            var green: number = rgb.g;
            var blue: number = rgb.b;
            lineSymbol.setColor(new esri.Color([red,green,blue,0.5]));
            
            var eidToLineGeometry: any = data.feeder.eidToLineGeometry;
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
            

        }
        getJson2(context : FindFeederModule, selectedFeeder : string) {
            //var context = this;
            var map = context.app.map;
            var vm: FindFeederViewModel = this.viewModel;
            var context: FindFeederModule = this;
            var urlToJson: string = "/Html5Viewer260/Resources/Feeders/" + selectedFeeder + ".json";
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

                    var feederExtent: eg.Extent = new eg.Extent(data.feeder.extent);

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
            
        }
        initialize(config: any): void {
            this.app.command("doShowArrows").register(this, this.showArrows);
            this.app.command("doClearResults").register(this, this.clearResults);
            this.app.command("doZoomToFeeder").register (this, this.zoomToFeederClick);
            this.app.command("doGetJson").register(this, this.getJson);

            this.app.event("FindFeederViewModelAttached").subscribe(this, (model: FindFeederViewModel) => {
                this.app.map.on("extent-change", (evt) => { this.FindFeedermapExtentChangeHandler(this, evt); });
                this.app.map.on("click", (evt) => { this.FindFeederMapClickHandler(this, evt); });


                //alert("from the module");
                this.viewModel = model;
                var graphicLayers: string[] = this.app.map.graphicsLayerIds;

                for (var i: number = 0; i < graphicLayers.length; i++) {
                    console.log(graphicLayers[i]);
                }


                
                //this.viewModel.notifyView(this.app);
                
            });
            
        }

        FindFeederMapClickHandler(context, evt) {
            if (this.viewModel.showTraceUpDown.get()) {
                //this.viewModel.ffFlowDirectionTraceMode.set(false);
                var eidToUpstreamAssocArray = [];
                for (var eidIndex = 0; eidIndex < this._data.feeder.uptopology.length; eidIndex ++){
                    var eid_upEIDPair = this._data.feeder.uptopology[eidIndex];
                    eidToUpstreamAssocArray[eid_upEIDPair[0]] = eid_upEIDPair[1];
                }

                var eidToDownstreamAssocArray = [];
                for (var eidIndex = 0; eidIndex < this._data.feeder.downTopology.length; eidIndex++) {
                    var eid_downEIDSPair = this._data.feeder.downTopology[eidIndex];
                    eidToDownstreamAssocArray[eid_downEIDSPair[0]] = eid_downEIDSPair[1];
                }

                var eidToLineGeometry: any = this._data.feeder.eidToLineGeometry;
                var mapPoint: esri.geometry.Point = evt.mapPoint;
                var mapPointX = mapPoint.x;
                var mapPointY = mapPoint.y;
                var closestSoFar = 9999;
                var startEID = -9999;
                for (var i = 0; i < eidToLineGeometry.length; i++) {
                    var verticiesOnLineSegment = eidToLineGeometry[i][1][0];
                    for (var j = 0; j < verticiesOnLineSegment.length; j++) {
                        var pointOnLine  = verticiesOnLineSegment[j];
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
                    currentEID = eidToUpstreamAssocArray[currentEID]
                }


                //Now get the downstreamEIDS
                var eidsToVisit = [];
                var downstreamEidsToDraw = [];
                eidsToVisit.push(-1 * startEID);
                var visitIndexPoint = 0;
                while (visitIndexPoint < eidsToVisit.length) {
                    var eid = eidsToVisit[visitIndexPoint];
                    if (eidToDownstreamAssocArray[eid] !== undefined){
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
        }
        drawUpstreamDownstreamLine(refresh : boolean) {
            var upstreamEids: number[] = this._upstreamEIDS;
            var downstreamEids: number[] = this._downstreamEIDS;
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


                var lineSymbolUp = new esri.symbol.CartographicLineSymbol(
                    esri.symbol.CartographicLineSymbol.STYLE_SOLID,
                    new esri.Color([255, 255, 0, .5]), this._size,
                    esri.symbol.CartographicLineSymbol.CAP_ROUND,
                    esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3"
                    );

                var lineSymbolDown = new esri.symbol.CartographicLineSymbol(
                    esri.symbol.CartographicLineSymbol.STYLE_SOLID,
                    new esri.Color([255, 255, 0, .5]), this._size,
                    esri.symbol.CartographicLineSymbol.CAP_ROUND,
                    esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3"
                    );

                var rgbUp: any = this.hexToRgb(this.viewModel.upstreamColor.get());
                var red: number = rgbUp.r;
                var green: number = rgbUp.g;
                var blue: number = rgbUp.b;
                lineSymbolUp.setColor(new esri.Color([red, green, blue,1]));

                var rgbDown: any = this.hexToRgb(this.viewModel.downstreamColor.get());
                red = rgbDown.r;
                green = rgbDown.g;
                blue = rgbDown.b;
                lineSymbolDown.setColor(new esri.Color([red, green, blue,1]));

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


            var lineSymbolUp = new esri.symbol.CartographicLineSymbol(
                esri.symbol.CartographicLineSymbol.STYLE_SOLID,
                new esri.Color([255, 255, 0, .5]), this._size,
                esri.symbol.CartographicLineSymbol.CAP_ROUND,
                esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3"
                );

            var lineSymbolDown = new esri.symbol.CartographicLineSymbol(
                esri.symbol.CartographicLineSymbol.STYLE_SOLID,
                new esri.Color([255, 255, 0, .5]), this._size,
                esri.symbol.CartographicLineSymbol.CAP_ROUND,
                esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3"
                );

            var rgbUp: any = this.hexToRgb(this.viewModel.upstreamColor.get());
            var red: number = rgbUp.r;
            var green: number = rgbUp.g;
            var blue: number = rgbUp.b;
            lineSymbolUp.setColor(new esri.Color([red, green, blue, 0.5]));

            var rgbDown: any = this.hexToRgb(this.viewModel.downstreamColor.get());
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
        }

        FindFeedermapExtentChangeHandler(context, evt) {
            var w = this.app.map.extent.xmax - this.app.map.extent.xmin;
            var relativeSize: number = (2000 / w);
            var bufferSize = this.viewModel.numBufferSize.get();
            $('#numBufferChange').val
            this._size = bufferSize * relativeSize;

            if (this._data !== null) {
                //this._size = 10;
                this.drawFeederGraphics();
                this.drawUpstreamDownstreamLine(false);
            }
        }
 
        mercatorToLatLon(mercX, mercY) {
            var rMajor = 6378137; //Equatorial Radius, WGS84
            var shift = Math.PI * rMajor;
            var lon = mercX / shift * 180.0;
            var lat = mercY / shift * 180.0;
            lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180.0)) - Math.PI / 2.0);
            lon = Math.round(lon * 10000) / 10000;
            lat = Math.round(lat * 10000) / 10000;
            return { 'Lon': lon, 'Lat': lat };
        }


        showArrows() {
            alert("No implemented yet");
        }


        drawFlagGraphic(pnt: esri.geometry.Point): void {
            var markerSymbol = new esri.symbol.SimpleMarkerSymbol();
            if (this.flagGraphic !== null) {
                this.app.map.graphics.remove(this.flagGraphic);
            }
            markerSymbol.setPath("M9.5,3v10c8,0,8,4,16,4V7C17.5,7,17.5,3,9.5,3z M6.5,29h2V3h-2V29z");
            markerSymbol.size = 30;
            markerSymbol.setColor(new esri.Color([0, 255, 0, .5]));
            this.flagGraphic = new esri.Graphic(pnt, markerSymbol);
            this.app.map.graphics.add(this.flagGraphic);
        }

    }
} 