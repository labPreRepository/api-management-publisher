sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Filter",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../model/models",
    "../model/formatter",
    "../utils/index"
],
/**
 * @param {typeof sap.ui.core.mvc.Controller} Controller
 */
function (Controller, JSONModel, FilterOperator, Filter, MessageBox, MessageToast, models, formatter, u) {
    "use strict";

    return Controller.extend("bunge.hubapi.controller.Main", {

        formatter: formatter,

        dialogDataModel: {
            api: {
                title: "",
                name: "",
                path: "",
                description: ""
            },
            user: "",
            yamlarchive: "",
            provider: "",
            provider_path: "",
            product: "",
            application: "",
            authentication: {
                username: "",
                password: "",
                clientid: "",
                clientsecret: "",
                url: ""
            },
            
            _apiName: "",
            _apiPath: "",
            _version: 1,
            _selectedAuthentication: "basicAuth",
            _isCustomProduct: false,
        },

        onInit: function () {
            const oView = this.getView();

            oView.setModel(new JSONModel([]), "data");
            oView.setModel(new JSONModel([]), "chartApplications");
            oView.setModel(new JSONModel([]), "chartProviders");
            oView.setModel(new JSONModel([]), "chartProxy");
            oView.setModel(new JSONModel(u.clone(this.dialogDataModel)), "dialogData");
            oView.setModel(new JSONModel([]), "applicationList");
            oView.setModel(new JSONModel([]), "productsList");
            oView.setModel(new JSONModel([]), "userInfo")
            oView.setModel(new JSONModel([]), "token");
            oView.setModel(new JSONModel([]), "base64archive")
            oView.setModel(new JSONModel({
                "model_name": "apiNonProdManagement"
            }), "config");

            this.getToken();
            this.readData();
            this.getUser();
            
        },

        getToken: function () {
            const oView = this.getView();
            const sModelName = "apiProdManagement"

            models.getToken(sModelName).then(oData => {
                const oModel = oView.getModel("token");
                oModel.setData(oData.value);
                oModel.updateBindings();
            });
        },

        getUser: function(){
            if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService("UserInfo")) {
                const sUserEmail = sap.ushell.Container.getService("UserInfo").getEmail();
                const oView = this.getView();
                const oModel = oView.getModel("userInfo");
                return oModel.setData(sUserEmail)
                
            }

        },

        readData: function () {
            const oView = this.getView();

            const oConfig = oView.getModel("config");
            const sModelName = oConfig.getProperty("/model_name");

            models.readData(sModelName).then(oData => {
                const arrayData = this.formatData(oData.results);
                const oModel = oView.getModel("data");
                oModel.setData(arrayData);
                oModel.updateBindings();

                this.prepareDataCharts(arrayData);
            });

            models.readApplicationList(sModelName).then(oData => {
                const oModel = oView.getModel("applicationList");
                oModel.setData(oData.results);
                oModel.updateBindings();
            });

            models.readProductionList(sModelName).then(oData => {
                const oModel = oView.getModel("productsList");
                oModel.setData(oData.results);
                oModel.updateBindings();
            });
        },

        formatData: function (data) {
            const arrayData = data.map(function (item) {
                const productsName = item.apiProducts.results.map(item => item.name);

                const applicationsName = item.apiProducts.results.reduce((acc, item) => {
                    const names = item.applications.results.map(item => item.title)
                    return acc.concat(names)
                }, []);

                return {
                    provider_name: item.provider_name,
                    relativePath: item.targetEndPoints.results[0].relativePath,
                    name: item.name,
                    base_path: item.proxyEndPoints.results[0].base_path,
                    product: productsName,
                    application: applicationsName,
                    service_code: item.service_code,
                    status: item.state
                };

            }.bind(this));

            return arrayData;
        },

        prepareDataCharts: function (oData) {
            const oApps = {};
            const oProxy = {};
            const oProviders = {};

            let nApps = 0;
            let nProxy = 0;
            let nProviders = 0;

            oData.forEach(oApi => {
                // APPS
                const aApps = oApi.application;

                aApps.forEach(sApp => {
                    if (!oApps[sApp]) {
                        oApps[sApp] = {
                            "count": 0
                        };
                    }
    
                    oApps[sApp].count++;
                    nApps++;
                });

                // PROXIES
                const sProxy = oApi.service_code;

                if (sProxy) {
                    if (!oProxy[sProxy]) {
                        oProxy[sProxy] = {
                            "count": 0
                        };
                    }
    
                    oProxy[sProxy].count++;
                    nProxy++;
                }

                // PROVIDERS
                const sProvider = oApi.provider_name;

                if (sProvider && (sProvider !== "NONE")) {
                    if (!oProviders[sProvider]) {
                        oProviders[sProvider] = {
                            "count": 0
                        };
                    }
    
                    oProviders[sProvider].count++;
                    nProviders++;
                }
            });

            const fEntries = (oData, nTotal) => {
                const aEntries = Object.entries(oData);
                const aData = aEntries.map(([name, value]) => {
                    return {
                        "name": name,
                        "percent": `${ Math.round((value.count / nTotal) * 100) }%`,
                        ...value
                    };
                });

                return aData.sort((a, b) => {
                    return b.count - a.count;
                });
            };

            let aApps = fEntries(oApps, nApps);
            let aProxy = fEntries(oProxy, nProxy);
            let aProviders = fEntries(oProviders, nProviders);

            const oView = this.getView();
            oView.getModel("chartApplications").setData(aApps);
            oView.getModel("chartProxy").setData(aProxy);
            oView.getModel("chartProviders").setData(aProviders);
        },

        onCheckVersion: function () {
            const oView = this.getView();
            const oModel = oView.getModel("dialogData");
            
            const sApiName = oModel.getProperty("/_apiName");
            const sApiPath = oModel.getProperty("/_apiPath");
            const version = oModel.getProperty("/_version");

            if (sApiName && version) {
                oModel.setProperty("/api/name", `${ sApiName }_v${ version }`);
            } else {
                oModel.setProperty("/api/name", "");
            }

            if (sApiPath && version) {
                if (sApiPath.startsWith("/")) {
                    oModel.setProperty("/api/path", `/v${ version }${ sApiPath }`);
                } else {
                    oModel.setProperty("/api/path", `/v${ version }/${ sApiPath }`);
                }
            } else {
                oModel.setProperty("/api/path", "");
            }
        },

        onEnvironmentChange: function (oEvent) {
            const oView = this.getView();
            const oModel = oView.getModel("data");
            oModel.setData([]);
            
            this.readData();
        },

        copyProviderToProduct: function () {
            const oModel = this.getView().getModel("dialogData");
            const bCustom = oModel.getProperty("/_isCustomProduct");

            if (!bCustom) {
                const sProvider = oModel.getProperty("/provider");
                oModel.setProperty("/product", sProvider);
            }
        },

        viewApiDialogOpen: function (oEvent) {
            const oDialog = this.byId("dialogviewapi");
            oDialog.open();

            const oListItem = oEvent.getParameter("listItem");
            const sPath = oListItem.getBindingContextPath();

            const oView = this.getView();
            const oListModel = oView.getModel("data");
            const oData = oListModel.getProperty(sPath);

            const oModel = oView.getModel("dialogData");
            oModel.setProperty("/api/name", oData.name);
            oModel.setProperty("/provider", oData.provider_name);
            oModel.setProperty("/product", oData.product);
            oModel.setProperty("/application", oData.application);

            oDialog.bindObject({
                path: sPath,
                model: "data"
            });
        },

        viewApiDialogClose: function () {
            this.byId("dialogviewapi").close();
            this.resetModelDialog();
        },

        implementApiDialogOpen: function () {
            this.byId("dialogimplementapi").open();
        },

        implementApiDialogClose: function () {
            this.byId("dialogimplementapi").close();
        },

        createNewApiDialogOpen: function () {
            this.byId("dialognewapi").open();
        },

        createNewApiDialogClose: function () {
            this.byId("dialognewapi").close();
            this.resetModelDialog();
        },

        isFormEmpty: function() {
            const userBasic = this.byId("inputuserbasic").getValue()
            const passBasic = this.byId("inputpassbasic").getValue()

            const ClientId = this.byId("inputclientidoauth").getValue()
            const clientSecret = this.byId("inputclientsecretoauth").getValue()
            const Token = this.byId("inputtokenoauth").getValue()

            const oView = this.getView();
            const oModel = oView.getModel("dialogData");
            const oData = oModel.getData();

            switch (oData._selectedAuthentication) {
                case "basicAuth":
                    if(userBasic === "" || passBasic === ""){
                        return  false
                    }
                break
                case "oauth2.0":
                    if(ClientId === "" || clientSecret === "" || Token === ""){
                        return false
                    }
                break
            }
            return true
        },

        isFormDialogValid: function () {
            const apiTitle = this.byId("inputapititle").getValue()
            const apiName = this.byId("inputapiname").getValue()
            const apiPath = this.byId("inputapipath").getValue()
            const description = this.byId("textareadescription").getValue()
            const providerPath = this.byId("inputproviderpath").getValue()
            const product = this.byId("inputproduct").getValue()


            const nameRegex = /^[a-z0-9-]+$/;
            const apiPathRegex = /^[\w-][\w-\/]+$/
            const descriptionRegex = /^[\w ]*$/
            const providerPathRegex = /^[\w-/]+$/
            const productRegex = /^[A-Za-z-_]+$/

            if(!nameRegex.test(apiName)){
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("errorName");
                MessageToast.show(sText);
                return false 
            }
            if(!apiPathRegex.test(apiPath)){
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("errorNamePath");
                MessageToast.show(sText);
                return false
            }
            if(!descriptionRegex.test(description)){
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("errorDescription");
                MessageToast.show(sText);
                return false
            }
            if(!providerPathRegex.test(providerPath)){
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("errorPath");
                MessageToast.show(sText);
                return false
            }
            if(!productRegex.test(product)){
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("errorProduct");
                MessageToast.show(sText);
                return false
            }  
            return true;
        },

        getAuthProperties: function () {
            const oView = this.getView();
            const oModel = oView.getModel("dialogData");
            const oData = oModel.getData();

            switch (oData._selectedAuthentication) {
                default:
                    return {};
                case "basicAuth":
                    return  {
                        "username": oData.authentication.username,
                        "password": oData.authentication.password
                    };
                case "oauth2.0":
                    return {
                        "clientId": oData.authentication.clientid,
                        "clientSecret": oData.authentication.clientsecret,
                        "tokenUrl": oData.authentication.url
                    };
            }
        },

        toBase64: async function(currentFile){
            const oView = this.getView();
            const oModel = oView.getModel("base64archive");
            new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(currentFile);
                reader.onload = () => {
                    resolve(oModel.setData(reader.result))
                }
                reader.onerror = reject;
            });
        },
        
        onChangeFileUploader : async function(oEvt){
            
            var aFiles=oEvt.getParameters().files;
            var currentFile = aFiles[0];
            await this.toBase64(currentFile)
            

        },

        createNewApi: function (oEvent) {
            const bValid = this.isFormDialogValid();
            if (!bValid) {
                return;
            }

            const oProperties = this.getAuthProperties();

            const oView = this.getView();
            const oModel = oView.getModel("dialogData");
            const oData = oModel.getData();
            const oUserEmail = oView.getModel("userInfo").getData();
            const yamlArchive = oView.getModel("base64archive").getData();

            const oJson = {
                "route": "/integration",
                "user": oUserEmail,
                "yamlarchive": yamlArchive,
                "proxy": {
                    "title": oData.api.title,
                    "name": oData.api.name,
                    "path": oData.api.path,
                    "description": oData.api.description,
                },
                "product": {
                    "name": oData.product
                },
                "application": {
                    "name": oData.application
                },
                "provider": {
                    "name": oData.provider,
                    "path": oData.provider_path,
                    "auth": {
                        "type": oData._selectedAuthentication,
                        "properties": oProperties
                    }
                }
            };

            oView.setBusy(true);
            oView.setBusyIndicatorDelay(0);
            this.sendToGitHub(oJson).then(() => {
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("successMessage");

                MessageBox.success(sText, {
                    title: this.getView().getModel("i18n").getResourceBundle().getText("titlePopup")
                });
            }).catch(oError => {
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("errorMessage");
                const sDetails = models.handleGenericError(oError);

                MessageBox.error(sText, {
                    title: this.getView().getModel("i18n").getResourceBundle().getText("titlePopup"),
                    details: sDetails
                });
            }).finally(() => {
                oView.setBusy(false);
            });
            this.createNewApiDialogClose()
        },

        deployApiToPrd: function (oEvent) {
            const bValid = this.isFormEmpty();
            if (!bValid) {
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("errorRegex");
                MessageToast.show(sText);
                return;
            }

            const oProperties = this.getAuthProperties();

            const oView = this.getView();
            const oModel = oView.getModel("dialogData");
            const oData = oModel.getData();

            const oJson = {
                "route": "/deploy",
                "proxy": {
                    "name": oData.api.name
                },
                "product": {
                    "name": oData.product.join(",")
                },
                "application": {
                    "name": oData.application.join(",")
                },
                "provider": {
                    "name": oData.provider,
                    "auth": {
                        "type": oData._selectedAuthentication,
                        "properties": oProperties
                    }
                }
            };

            oView.setBusy(true);
            oView.setBusyIndicatorDelay(0);
            this.sendToGitHub(oJson).then(() => {
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("successMessage");

                MessageBox.success(sText, {
                    title: this.getView().getModel("i18n").getResourceBundle().getText("titlePopup")
                });
            }).catch(oError => {
                const sText = this.getView().getModel("i18n").getResourceBundle().getText("errorMessage");
                const sDetails = models.handleGenericError(oError);

                MessageBox.error(sText, {
                    title: this.getView().getModel("i18n").getResourceBundle().getText("titlePopup"),
                    details: sDetails
                });
            }).finally(() => {
                oView.setBusy(false);
                
            });
            this.implementApiDialogClose()
            this.viewApiDialogClose()

        },

        sendToGitHub: async function (oData, token) {
            const sPath = "newAPI.json";
            const oView = this.getView();
            token = oView.getModel("token").getData()
            const oFile = await models.getFile(sPath, token);
            const oBranch = await models.getBranch(token);
            const oDataString = oData;
            return await models.createFile(sPath, oDataString, oFile.sha, token, oBranch[0].object.sha);
        },

        resetModelDialog: function () {
            const oView = this.getView();
            const oModel = oView.getModel("dialogData");
            oModel.setData(this.dialogDataModel);
        },

        seachFieldTable: function (oEvent) {
            const sQuery = oEvent.getParameter("newValue");

            const aFilters = [];

            if (sQuery) {
                aFilters.push(new Filter({
                    path: "name",
                    operator: FilterOperator.Contains,
                    caseSensitive: false,
                    value1: sQuery
                }));
            }

            const oList = this.byId("apiList");
            const oBinding = oList.getBinding("items");
            oBinding.filter(aFilters);
        }
    });
});
