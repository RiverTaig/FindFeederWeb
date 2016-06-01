/// <reference path="../Resources/Libs/Framework.d.ts" />
/// <reference path="../Resources/Libs/Mapping.Infrastructure.d.ts" />
module GeocortexCore {
    export class Utilities {


        static createNewGcxFeature(layerName: string, site:geocortex.essentials.Site, type?: string, templateName?: string, geometry?: esri.geometry.Geometry): geocortex.essentialsHtmlViewer.mapping.infrastructure.Feature {
            if (!templateName) {
                return this.createNewGcxFeature(layerName, site, "default", "default", geometry);
            }
            var featureServices = site.getFeatureServices();
            //debugger;
            var layer;
            var featureTemplate: esri.layers.FeatureTemplate;
            for (var i = 0; i < featureServices.length; i++) {
                if (featureServices[i].serviceLayer && featureServices[i].serviceLayer.name === layerName) {
                    var featureLayer = <esri.layers.FeatureLayer>featureServices[i].serviceLayer;
                    var featureType: esri.layers.FeatureType;
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
                                    break;//River added this line
                                }
                            }
                        }
                    }
                    var featureTemplates: Array<esri.layers.FeatureTemplate>;
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
        }
        static getFeatureService(layerName: string, site: geocortex.essentials.Site): esri.layers.FeatureLayer {
            if (!site) return;
            var mapServices = site.getFeatureServices();

            if (mapServices && mapServices.length > 0) {

                for (var s in mapServices) {
                    var mapService = mapServices[s];
                    if (mapService.serviceLayer && (<esri.layers.FeatureLayer>mapService.serviceLayer).name === layerName) {
                        return <esri.layers.FeatureLayer>mapService.serviceLayer;
                    }
                }
            }
            return null;
        }

        static getFeatureLayer(name: string, site: geocortex.essentials.Site): esri.layers.FeatureLayer {
            var featureServices = site.getFeatureServices();
            var featureLayer: esri.layers.FeatureLayer;
            featureServices.forEach((featureService: geocortex.essentials.FeatureLayerService) => {
                if (featureService.serviceLayer && featureService.serviceLayer.name === name) {
                    featureLayer = featureService.serviceLayer;
                    return;
                }
            });
            return featureLayer;
        }

        static getEssentialsLayer(name: string, site: geocortex.essentials.Site): geocortex.essentials.Layer {
            var essentialsLayer: geocortex.essentials.Layer;
            var featureServices = site.getFeatureServices();
            featureServices.forEach((featureService: geocortex.essentials.FeatureLayerService) => {
                if (featureService.findLayerByName(name)) {
                    essentialsLayer = featureService.findLayerByName(name);
                    return;
                }
            });

            return essentialsLayer;
        }


        static getMapServiceByLayer(layer: esri.layers.Layer, site: geocortex.essentials.Site): geocortex.essentials.MapService {
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
        }

        // Copied from geocortex.workflow.DefaultActivityHandlers (Essentials.js)
        static findMapServiceByMap(map: esri.Map, serviceId: string): esri.layers.Layer {
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
        }
    }
}