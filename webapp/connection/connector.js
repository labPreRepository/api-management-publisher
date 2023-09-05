sap.ui.define([
    "sap/ui/model/odata/v2/ODataModel"
], function (ODataModel) {
    "use strict";

    return {
        _oPromises: {},
        _oComponent: null,

        init: function (oComponent) {
            this._oComponent = oComponent;

            const aEntries = Object.entries(oComponent.oModels);
        
            aEntries.forEach(([sModelName, oModel]) => {
                const sClassName = oModel.getMetadata().getName();
                
                if (sClassName === "sap.ui.model.odata.v2.ODataModel") {
                    this.setODataMetadata(oModel, sModelName);
                }
            });
        },

        getOwnerComponent: function () {
            return this._oComponent;
        },

        getPromise: function (...aModelNames) {
            var aPromises = aModelNames.map(sModelName => {
                return this._oPromises[sModelName];
            });

            return Promise.all(aPromises);
        },

        setODataModel: function (oModel, sName) {
            var oComponent = this.getOwnerComponent();
            oComponent.setModel(oModel, sName);

            this.setODataMetadata(oModel);
        },

        setODataMetadata: function (oModel, sName) {
            this._oPromises[sName] = oModel.metadataLoaded(true);
        },

        read: function (sPath, oOptions, sModelName) {
            var oComponent = this.getOwnerComponent(),
                oModel = oComponent.getModel(sModelName);

            return new Promise((fnResolve, fnReject) => {
                if (!oOptions) {
                    oOptions = {};
                }

                oOptions = {
                    ...oOptions,
                    success: (oData, oResponse) => fnResolve({ oData, oResponse }),
                    error: oError => fnReject(oError)
                };

                oModel.read(sPath, oOptions);
            });
        },

        create: function (sPath, oObject, oOptions, sModelName) {
            var oComponent = this.getOwnerComponent(),
                oModel = oComponent.getModel(sModelName);

            return new Promise((fnResolve, fnReject) => {
                if (!oOptions) {
                    oOptions = {};
                }

                oOptions = {
                    ...oOptions,
                    success: (oData, oResponse) => fnResolve({ oData, oResponse }),
                    error: oError => fnReject(oError)
                };

                oModel.create(sPath, oObject, oOptions);
            });
        },

        update: function (sPath, oObject, oOptions, sModelName) {
            var oComponent = this.getOwnerComponent(),
                oModel = oComponent.getModel(sModelName);

            return new Promise((fnResolve, fnReject) => {
                if (!oOptions) {
                    oOptions = {};
                }

                oOptions = {
                    ...oOptions,
                    success: (oData, oResponse) => fnResolve({ oData, oResponse }),
                    error: oError => fnReject(oError)
                };

                oModel.update(sPath, oObject, oOptions);
            });
        },

        remove: function (sPath, oOptions, sModelName) {
            var oComponent = this.getOwnerComponent(),
                oModel = oComponent.getModel(sModelName);

            return new Promise((fnResolve, fnReject) => {
                if (!oOptions) {
                    oOptions = {};
                }

                oOptions = {
                    ...oOptions,
                    success: (oData, oResponse) => fnResolve({ oData, oResponse }),
                    error: oError => fnReject(oError)
                };

                oModel.remove(sPath, oObject, oOptions);
            });
        }
    };
});