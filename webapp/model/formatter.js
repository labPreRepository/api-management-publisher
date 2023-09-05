sap.ui.define([

],
function () {
    "use strict";

    return {
        apiStatus: function () {
            return "Success";
        },

        attributeArray: function (aData) {
            if (!aData || !Array.isArray(aData)) {
                return aData;
            }

            return aData.join(", ");
        }
    };
});