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
    },
    startCamera: function (successCallback, errorCallback, setup) {
        var mediaRec = new Windows.Media.Capture.MediaCapture();
        var div = document.getElementById("windowsPreview");
        var settings = new Windows.Media.Capture.MediaCaptureInitializationSettings();

        

        var deviceList = [];
        function enumerateCameras() {
            var deviceInfo = Windows.Devices.Enumeration.DeviceInformation;
            deviceInfo.findAllAsync(Windows.Devices.Enumeration.DeviceClass.videoCapture).then(function (devices) {
                // Add the devices to deviceList                                                                                                               
                if (devices.length > 0) {

                    for (var i = 0; i < devices.length; i++) {
                        deviceList.push(devices[i]);
                    }
                } else {
                    console.log("No devices found");
                }
            }, function () { console.log("error"); });
        }

        enumerateCameras();
        settings.videoDeviceId = deviceList[0];

        mediaRec.initializeAsync().then(function () {
            div.src = URL.createObjectURL(mediaRec); // Set the div data source. Most important part
            div.play(); // read the source and display it
        })

    }
};

require("cordova/exec/proxy").add("CameraPreview", module.exports);