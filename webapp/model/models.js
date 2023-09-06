sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "../connection/connector"
], 
/**
 * provide app-view type models (as in the first "V" in MVVC)
 * 
 * @param {typeof sap.ui.model.json.JSONModel} JSONModel
 * @param {typeof sap.ui.Device} Device
 * 
 * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
 */
function (JSONModel, Device, connector) {
    "use strict";

    return {
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        readData: function (sModelName) {
            return connector.read("/APIProxies", {
                "urlParameters": {
                    "$expand": "proxyEndPoints,targetEndPoints,apiProducts/applications"
                }
            }, sModelName).then(({ oData }) => oData);
        },

        readApplicationList: function (sModelName) {
            return connector.read("/Applications", null, sModelName).then(({ oData }) => oData);
        },

        readProductionList: function (sModelName) {
            return connector.read("/APIProviders", null, sModelName).then(({ oData }) => oData);
        },

        getToken: function(sModelName) {
            return connector.read("/KeyMapEntryValues(map_name='GithubCredentials',name='GITHUB_TOKEN')",
            {
                "urlParameters": {
                    "$select": "name, value, map_name"
                }
            }, sModelName).then(({oData}) => oData)
        },

        getFile: async function (sPath, token) {
            
            const response = await fetch(`https://api.github.com/repos/BungeBSA/sap-api-management-request-json/contents/${sPath}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${token}`,
                    'X-GitHub-Api-Version': '2022-11-28'
                },
            });
            
            if (!response.ok) {
                throw await response.text();
            }

            return await response.json();
        },

        getBranch: async function(token) {
            const response = await fetch(`https://api.github.com/repos/BungeBSA/sap-api-management-request-json/git/matching-refs/heads/main`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${token} `,
                    'X-GitHub-Api-Version': '2022-11-28'
                },
            });
            
            if (!response.ok) {
                throw await response.text();
            }

            return await response.json();
        },

        createFile: async function (sPath, sContent, sHash, token, sBranch) {
            const sCommitMessage = "integration:create new entity properties file";
            const today = new Date().toLocaleDateString();
            const branchName = `${sContent.proxy.name}-${today}`;

            const oBody = {
                "branch": branchName,
                "message": sCommitMessage,
                "content": window.btoa(JSON.stringify(sContent))
            };

            const oBranch = {
                "ref": `refs/heads/${branchName}`
            };

            const oReviewers = {
                team_reviewers: ["sap-integration-suite"]
            }

            const oMerge = {
                "body": "Requisicao de implementacao de API",
                "title": `Proxy: ${sContent.proxy.name}, Provider: ${sContent.provider.name}`,
                "head": branchName,
                "base": "main"
            };

            if (sBranch) {
                oBranch["sha"] = sBranch;
            }

            if (sHash) {
                oBody["sha"] = sHash;
            }

            const createBranch = await fetch('https://api.github.com/repos/BungeBSA/sap-api-management-request-json/git/refs', {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${token} `,
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify(oBranch)
            })

            const response = await fetch(`https://api.github.com/repos/BungeBSA/sap-api-management-request-json/contents/${sPath}`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${token} `,
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify(oBody)
            });

            const mergeBranch = await fetch('https://api.github.com/repos/BungeBSA/sap-api-management-request-json/pulls',{
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${token} `,
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify(oMerge)
            });

            const mergeBody = await mergeBranch.json()
            const setReviwers = await fetch(`https://api.github.com/repos/BungeBSA/sap-api-management-request-json/pulls/${mergeBody.number}/requested_reviewers`, {
                method:'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${token} `,
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify(oReviewers)
            })

            if (!response.ok) {
                throw await response.text();
            }
            
            return await response.json();
        },
        
        handleGenericError: function (oErrorInstance) {
            if (typeof oErrorInstance === "string") {
                return oErrorInstance;
            }

            var oError = oErrorInstance.response || oErrorInstance;
            oError =
                oError.getParameters && oError.getParameters()
                    ? oError.getParameters()
                    : oError;

            var sErrorMessage =
                oError.statusCode +
                (oError.statusText ? " (" + oError.statusText + ")" : "");
                
            var sErrorDetails = oError.responseText || oError.body;

            try {
                sErrorMessage += JSON.parse(responseText).error.message.value;
            } catch (e) {}

            return sErrorDetails ? sErrorMessage + "\n\n" + sErrorDetails : sErrorMessage;
        }
    };
});
