var cordova = require('cordova'), QBIZCamera = require('./CameraPreview');

module.exports = {
    echo: function (successCallback, errorCallback, strInput) {
        console.log('hello');
        if (!strInput || !strInput.length) {
            errorCallback("Error, something was wrong with the input string. =>" + strInput);
        }
        else {
            successCallback(strInput + "echo");
        }
    }
};

require("cordova/exec/proxy").add("CameraPreview", module.exports);