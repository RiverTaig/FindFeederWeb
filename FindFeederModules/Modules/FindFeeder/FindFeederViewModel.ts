/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />

module FindFeederModules {

    export class FindFeederViewModel extends geocortex.framework.ui.ViewModelBase {

        app: geocortex.essentialsHtmlViewer.ViewerApplication;
        numRadius: Observable<number> = new Observable<number>();
        tieDevices: Observable<any[]> = new Observable<any[]>();
        tieDeviceEID: Observable<string> = new Observable<string>();
        tieDeviceAddress: Observable<string> = new Observable<string>();
        showArrows: Observable<boolean> = new Observable<boolean>();
        downstreamColor: Observable<string> = new Observable<string>();
        feederColor: Observable<string> = new Observable<string>();
        upstreamColor: Observable<string> = new Observable<string>();
        showTraceUpDown: Observable<boolean> = new Observable<boolean>();
        zoomToUpstream: Observable<boolean> = new Observable<boolean>();
        zoomToDownstream: Observable<boolean> = new Observable<boolean>();
        autoZoom: Observable<boolean> = new Observable<boolean>();
        traceFromCache: Observable<boolean> = new Observable<boolean>();
        zoomToSource: Observable<string> = new Observable<string>();
        urlToLayerWeWantToSelect: Observable<string> = new Observable<string>();
        selectedFeeder: Observable<string> = new Observable<string>();
        ffLoadA: Observable<string> = new Observable<string>();
        ffLoadB: Observable<string> = new Observable<string>();
        ffLoadC: Observable<string> = new Observable<string>();
        ffLoadTotal: Observable<string> = new Observable<string>();
        ffCustomersA: Observable<string> = new Observable<string>();
        ffCustomersB: Observable<string> = new Observable<string>();
        ffCustomersC: Observable<string> = new Observable<string>();
        ffCustomersTotal: Observable<string> = new Observable<string>();
        numBuffer: Observable<number> = new Observable<number>();
        ffConductorTotal: Observable<string> = new Observable<string>();
        numBufferSize: Observable<number> = new Observable<number>();
        ffPriUG: Observable<number> = new Observable<number>();
        ffSecUG: Observable<string> = new Observable<string>();
        ffPriOH: Observable<number> = new Observable<number>();
        ffSecOH: Observable<string> = new Observable<string>();
        ffUGTotal: Observable<string> = new Observable<string>();
        ffOHTotal: Observable<string> = new Observable<string>();
        data: Observable<any> = new Observable<any>();

        ffPriTotal: Observable<string> = new Observable<string>();
        ffSecTotal: Observable<string> = new Observable<string>();
        ffFlowDirectionTraceMode: Observable<boolean> = new Observable<boolean>();
        

        constructor(app: geocortex.essentialsHtmlViewer.ViewerApplication, lib: string) {
            super(app, lib);
            
        }


        initialize(config: any): void {
            this.autoZoom.set(true);
            this.feederColor.set("#FF0000");
            this.upstreamColor.set("#00FF00");
            this.downstreamColor.set("#0000FF");
            this.numBufferSize.set(25);
        }

    }
} 