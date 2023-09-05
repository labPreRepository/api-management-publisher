sap.ui.define([
], function () {
	"use strict";
	return {
    clone: function(json){
      return JSON.parse(JSON.stringify(json))
    }
	};
});

  