/// <reference path="../Libs/Framework.d.ts" />
/// <reference path="../Libs/Mapping.Infrastructure.d.ts" />
/// <reference path="../Libs/arcgis-js-api.d.ts" />
/// <reference path="../Libs/jquery.d.ts" />
/// <reference path="../../Modules/FindFeeder/typeahead.d.ts" />
/// <reference path="../libs/jqueryui.d.ts" />
/// <reference path="../libs/jquery.colorpicker.d.ts" />
declare module GeocortexCore {
    class Utilities {
        static createNewGcxFeature(layerName: string, site: geocortex.essentials.Site, type?: string, templateName?: string, geometry?: esri.geometry.Geometry): geocortex.essentialsHtmlViewer.mapping.infrastructure.Feature;
        static getFeatureService(layerName: string, site: geocortex.essentials.Site): esri.layers.FeatureLayer;
        static getFeatureLayer(name: string, site: geocortex.essentials.Site): esri.layers.FeatureLayer;
        static getEssentialsLayer(name: string, site: geocortex.essentials.Site): geocortex.essentials.Layer;
        static getMapServiceByLayer(layer: esri.layers.Layer, site: geocortex.essentials.Site): geocortex.essentials.MapService;
        static findMapServiceByMap(map: esri.Map, serviceId: string): esri.layers.Layer;
    }
}
declare module FindFeederModules {
    class FindFeederModule extends geocortex.framework.application.ModuleBase {
        viewModel: FindFeederViewModel;
        _tieDevices: any[];
        _size: number;
        _data: any;
        _feederExtent: esri.geometry.Extent;
        _upstreamEIDS: any;
        _downstreamEIDS: any;
        app: geocortex.essentialsHtmlViewer.ViewerApplication;
        downstreamLayer: esri.layers.GraphicsLayer;
        upstreamstreamLayer: esri.layers.GraphicsLayer;
        feederLayer: esri.layers.GraphicsLayer;
        _feederGraphic: esri.Graphic;
        _upstreamGraphic: esri.Graphic;
        _downstreamGraphic: esri.Graphic;
        circleGraphic: esri.Graphic;
        flagGraphic: esri.Graphic;
        _selectedFeatures: esri.tasks.FeatureSet;
        esriQuery: esri.tasks.Query;
        esriQueryTask: esri.tasks.QueryTask;
        private _circleGraphicLayer;
        _token: string;
        constructor(app: geocortex.essentialsHtmlViewer.ViewerApplication, lib: string);
        clearResults(): void;
        zoomToFeederClick(): void;
        zoomToFeeder(forceZoom: boolean): void;
        getJson(): void;
        hexToRgb(hex: string): {
            r: number;
            g: number;
            b: number;
        };
        drawJunctionFeederGraphics(data: any): void;
        drawFeederGraphics(): void;
        getJson2(context: FindFeederModule, selectedFeeder: string): void;
        initialize(config: any): void;
        FindFeederMapClickHandler(context: any, evt: any): void;
        drawUpstreamDownstreamLine(refresh: boolean): void;
        FindFeedermapExtentChangeHandler(context: any, evt: any): void;
        mercatorToLatLon(mercX: any, mercY: any): {
            'Lon': number;
            'Lat': number;
        };
        showArrows(): void;
        drawFlagGraphic(pnt: esri.geometry.Point): void;
    }
}
import eg = esri.geometry;
import et = esri.tasks;
declare module FindFeederModules {
    class FindFeederView extends geocortex.framework.ui.ViewBase {
        app: geocortex.essentialsHtmlViewer.ViewerApplication;
        _tieDeviceLayer: esri.layers.GraphicsLayer;
        states: string[];
        _viewModel: FindFeederViewModel;
        constructor(app: geocortex.essentialsHtmlViewer.ViewerApplication, lib: string);
        PopulateFeederList(): void;
        setTieDeviceData(): void;
        DrawTieDevices(): void;
        ClearTieDevices(): void;
        attach(viewModel?: FindFeederViewModel): void;
    }
}
declare function AttachTypeAhead(): void;
declare module FindFeederModules {
    class FindFeederViewModel extends geocortex.framework.ui.ViewModelBase {
        app: geocortex.essentialsHtmlViewer.ViewerApplication;
        numRadius: Observable<number>;
        tieDevices: Observable<any[]>;
        tieDeviceEID: Observable<string>;
        tieDeviceAddress: Observable<string>;
        showArrows: Observable<boolean>;
        downstreamColor: Observable<string>;
        feederColor: Observable<string>;
        upstreamColor: Observable<string>;
        showTraceUpDown: Observable<boolean>;
        zoomToUpstream: Observable<boolean>;
        zoomToDownstream: Observable<boolean>;
        autoZoom: Observable<boolean>;
        traceFromCache: Observable<boolean>;
        zoomToSource: Observable<string>;
        urlToLayerWeWantToSelect: Observable<string>;
        selectedFeeder: Observable<string>;
        ffLoadA: Observable<string>;
        ffLoadB: Observable<string>;
        ffLoadC: Observable<string>;
        ffLoadTotal: Observable<string>;
        ffCustomersA: Observable<string>;
        ffCustomersB: Observable<string>;
        ffCustomersC: Observable<string>;
        ffCustomersTotal: Observable<string>;
        numBuffer: Observable<number>;
        ffConductorTotal: Observable<string>;
        numBufferSize: Observable<number>;
        ffPriUG: Observable<number>;
        ffSecUG: Observable<string>;
        ffPriOH: Observable<number>;
        ffSecOH: Observable<string>;
        ffUGTotal: Observable<string>;
        ffOHTotal: Observable<string>;
        data: Observable<any>;
        ffPriTotal: Observable<string>;
        ffSecTotal: Observable<string>;
        ffFlowDirectionTraceMode: Observable<boolean>;
        constructor(app: geocortex.essentialsHtmlViewer.ViewerApplication, lib: string);
        initialize(config: any): void;
    }
}
