/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />
/// <reference path="../../resources/libs/jquery.d.ts" />
/// <reference path="typeahead.d.ts" />
/// <reference path="../../resources/libs/jqueryui.d.ts" />
/// <reference path="../../resources/libs/jquery.colorpicker.d.ts" />

import eg = esri.geometry;
import et = esri.tasks;

module FindFeederModules {
    
    export class FindFeederView extends geocortex.framework.ui.ViewBase {
        app: geocortex.essentialsHtmlViewer.ViewerApplication;
        _tieDeviceLayer: esri.layers.GraphicsLayer = null;
        states: string[] = ['Aa', 'Bb', 'Cc', 'Dd', 'Ee'];
        _viewModel: FindFeederViewModel = null;
        constructor(app: geocortex.essentialsHtmlViewer.ViewerApplication, lib: string) {
            super(app, lib);
        }



        PopulateFeederList() {
            var query: et.Query = new et.Query();
            query.outFields = ["ID","CIRCUITNAME"];
            query.where = "1=1";
            query.orderByFields = ["CIRCUITNAME"];
            query.returnDistinctValues = true;
            var url: string = "http://52.1.143.233/arcgis103/rest/services/Schneiderville/AcmeElectric/MapServer/17";
            var qTasks: et.QueryTask = new et.QueryTask(url);
            qTasks.execute(query, (fs : et.FeatureSet) => {
                //alert("in complete");
                var cboFindFeederFeederList = $("#cboFindFeederFeederList");
                cboFindFeederFeederList.empty();
                var firstID = fs.features[0].attributes["ID"];//Used later to trigger a change on the combo box
                this.states = [];
                for (var i = 0; i < fs.features.length; i++) {
                    var name: string = fs.features[i].attributes["CIRCUITNAME"];
                    var id: string = fs.features[i].attributes["ID"];
                    //cboFindFeederFeederList.append("<option value='" + id + "'>" + name + ":" + id + "</option>");
                    this.states.push(name + ":" + id);
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
                },
                {
                    name: 'states',
                    source: substringMatcher(this.states)
                });

                //$('#cboFindFeederFeederList').val(firstID).trigger('change');


            }, (err : any) => {

                alert(err.toString());
                });

        }
        setTieDeviceData() {
            //alert("1");
            var tieDevices: any[] = this._viewModel.data.get().feeder.tieDevices[0];
            var tieDevice: any = $("#cboTieDevices option:selected").index()
            var facID = tieDevices[tieDevice].FACILITYID;
            var feederIDS = tieDevices[tieDevice].FEEDERIDS;
            var streetAddress = tieDevices[tieDevice].STREETADDRESS;
            $('#lblTieDeviceFacilityID').text(facID);
            //$('#lblTieDeviceAddress').text(streetAddress);
            this._viewModel.tieDeviceAddress.set(streetAddress);
            var selectedEID : string = tieDevices[tieDevice].EID;
            this._viewModel.tieDeviceEID.set(selectedEID);
            //loop through the graphics in the graphics layer and set the selected property = true or false
            if (this._tieDeviceLayer != null) {
                for (let i = 0; i < this._tieDeviceLayer.graphics.length; i++) {
                    let gr: esri.Graphic = this._tieDeviceLayer.graphics[i];
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
            
        }

        DrawTieDevices() {
            if (this._tieDeviceLayer == null) {
                this._tieDeviceLayer = new esri.layers.GraphicsLayer();
                this._tieDeviceLayer.setInfoTemplate
            }
            this._tieDeviceLayer.clear();

            var tieDevicePointSymbol1 = new esri.symbol.SimpleMarkerSymbol(
                esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE,
                30,
                new esri.symbol.SimpleLineSymbol(
                    esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                    new esri.Color([255, 255, 0]), 2
                    ),
                new esri.Color([255, 255, 0, 0.9])
                ); 

            var tieDevicePointSymbol2 = new esri.symbol.SimpleMarkerSymbol(
                esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE,
                20,
                new esri.symbol.SimpleLineSymbol(
                    esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                    new esri.Color([0, 255, 255]), 2
                    ),
                new esri.Color([0, 255, 255, 0.5])
                ); 

            var uniqueValuerenderer = new esri.renderer.UniqueValueRenderer(tieDevicePointSymbol1, "SELECTED");
            uniqueValuerenderer.addValue("True", tieDevicePointSymbol1);
            uniqueValuerenderer.addValue("False", tieDevicePointSymbol2);
            //var tieDeviceRenderer = new esri.renderer.SimpleRenderer(tieDevicePointSymbol);
            this._tieDeviceLayer.setRenderer(uniqueValuerenderer);


            var tieDevices: any[] = this._viewModel.data.get().feeder.tieDevices[0];

            var eidsToHighlight = {};
            for (var i = 0; i < tieDevices.length; i++) {
                eidsToHighlight[tieDevices[i].EID.toString()] = 1;
            }

            var eid: string = this._viewModel.tieDeviceEID.get();
            var eidToPointGeoms: any[] = this._viewModel.data.get().feeder.eidToPointGeometry;
            for (var i = 0; i < eidToPointGeoms.length; i++) {
                var eidInJson: string = eidToPointGeoms[i][0];
                if (eidInJson.toString() in eidsToHighlight) {
                    var xy = eidToPointGeoms[i][1];
                    var map: esri.Map = this.app.map;
                    var gra: esri.Graphic = new esri.Graphic(new esri.geometry.Point(xy[0], xy[1], map.spatialReference));
                    gra.setAttributes({ "SELECTED": "False", "EID": eidInJson.toString()});
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
        }

        ClearTieDevices() {
            if (this._tieDeviceLayer == null) {
                this._tieDeviceLayer = new esri.layers.GraphicsLayer();
            }
            this._tieDeviceLayer.clear();
        }
        attach(viewModel?: FindFeederViewModel): void {
            this._viewModel = viewModel;
            super.attach(viewModel);
            this.PopulateFeederList();
            

            viewModel.data.bind(this, (data: any) => {
                var tds: any = data.feeder.tieDevices[0];
                $('#cboTieDevices').empty()
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
                this.setTieDeviceData();
                //this.DrawTieDevices();
            });



            $('#btnZoomToTie').on('click', (e) => {
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
                    else if (scale === 2){
                        scale = 4;
                    }
                }
                var eid: string = viewModel.tieDeviceEID.get();
                var eidToPointGeoms: any[] = viewModel.data.get().feeder.eidToPointGeometry;
                for (var i = 0; i < eidToPointGeoms.length; i++) {
                    var eidInJson : string = eidToPointGeoms[i][0];
                    if (eidInJson.toString() == eid) {
                        var xy = eidToPointGeoms[i][1];
                        var map: esri.Map = this.app.map;
                        var pnt: esri.geometry.Point = new esri.geometry.Point(xy[0], xy[1], map.spatialReference);
                        map.setScale(map.getScale() * scale);
                        map.centerAt(pnt);
                        return;
                    }
                }

            });

            $("#cboTieDevices").on('change', () => {
                this.setTieDeviceData();
                //this.DrawTieDevices();
            });

            
            $("#btnSelect").on('click', () => {
                this.app.command("doSelectFeatures").execute();
            });
            $("#btnZoomTo").on('click', () => {
                this.app.command("doZoomToFeeder").execute();
            });
            $("#numBuffer").on('change', () => {
                //this.app.command("doZoomToFeeder").execute();
                //var xmin: number = this.app.map.extent.xmin - .001;
                //var xmax: number = this.app.map.extent.xmax - .001;
                //var ymin: number = this.app.map.extent.ymin - .001;
                //var ymax: number = this.app.map.extent.ymax - .001;
                var ext: eg.Extent = this.app.map.extent;
                this.app.map.setExtent(ext);
            });
            $("#downstreamColor").on('change', () => {
                //this.app.command("doZoomToFeeder").execute();
                var xmin: number = this.app.map.extent.xmin - .001;
                var xmax: number = this.app.map.extent.xmax - .001;
                var ymin: number = this.app.map.extent.ymin - .001;
                var ymax: number = this.app.map.extent.ymax - .001;
                var ext: eg.Extent = new eg.Extent(xmin, ymin, xmax, ymax, this.app.map.spatialReference);
                this.app.map.setExtent(ext);
            });
            $("#btnGetJson").on('click', () => {
                this.app.command("doGetJson").execute();
            });

            var map = this.app.map;


            $(".lblShowArrows").on('click', () => {
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

            $("#btnClear").on('click', () => {

                this.app.command("doClearResults").execute();
            });

            $(".lblAutoZoom").on('click', () => {
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

            $(".lblTraceUpDown").on('click', () => {
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

            $(".lblZoomToUpstream").on('click', () => {
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

            $(".lblZoomToDownstream").on('click', () => {
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



            $(".lblTraceFromCache").on('click', () => {
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



            this.app.event("FindFeederViewModelAttached").subscribe(this, (model: FindFeederViewModel) => {
                //InitJS(window, $,null);
                //Set up accordion control
                var that = this;
                jQuery('.accordion-section-title').click(function (e) {
                    // Grab current anchor value
                    var currentAttrValue = jQuery(this).attr('href');

                    if (jQuery(e.target).is('.active')) {
                        jQuery('.accordion .accordion-section-title').removeClass('active');
                        jQuery('.accordion .accordion-section-content').slideUp(300).removeClass('open');
                    } else {
                        if ($("#accSelection select option").length == 0) {
                            var mapService: geocortex.essentials.MapService = null;
                            for (var i: number = 0; i < that.app.site.essentialsMap.mapServices.length; i++) {
                                mapService = that.app.site.essentialsMap.mapServices[i];
                                var layers: geocortex.essentials.Layer[] = mapService.layers;
                                for (var j: number = 0; j < layers.length; j++) {
                                    $('#accSelection select').append($('<option>', {
                                        value: mapService.id + ":" + j,
                                        text: layers[j].name
                                    }));
                                    //viewModel.layerNameToURL_Association[mapService.id + ":" + j] = layers[j].mapService.serviceUrl + "/" + layers[j].id;
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
        }

    }

}

function AttachTypeAhead() {


}