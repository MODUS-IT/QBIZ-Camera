cordova.define("com.mbppower.camerapreview.CameraPreviewWindows10", function(require, exports, module) {
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
        var Capture = Windows.Media.Capture;
        var DeviceInformation = Windows.Devices.Enumeration.DeviceInformation;
        var DeviceClass = Windows.Devices.Enumeration.DeviceClass;
        var DisplayOrientations = Windows.Graphics.Display.DisplayOrientations;
        var FileProperties = Windows.Storage.FileProperties;
        var Media = Windows.Media;
        var SimpleOrientation = Windows.Devices.Sensors.SimpleOrientation;
        var SimpleOrientationSensor = Windows.Devices.Sensors.SimpleOrientationSensor;

        var oOrientationSensor = SimpleOrientationSensor.getDefault();
        var oDisplayInformation = Windows.Graphics.Display.DisplayInformation.getForCurrentView();
        var oDeviceOrientation = SimpleOrientation.notRotated;
        var oDisplayOrientation = DisplayOrientations.portrait;

        var oDisplayRequest = new Windows.System.Display.DisplayRequest();
        var oSystemMediaControls = Media.SystemMediaTransportControls.getForCurrentView();

        var oMediaCapture = null;
        var isInitialized = false;
        var isPreviewing = false;
        var isRecording = false;

        var externalCamera = false;
        var mirroringPreview = false;

        var RotationKey = "C380465D-2271-428C-9B83-ECEA3B4A85C1";
        var deviceInfo = null;
        DeviceInformation.findAllAsync(DeviceClass.videoCapture).then(function (devices) {
            if (devices.length > 0) {
                deviceInfo = devices.getAt(0);
            }
        });

        oMediaCapture = new Capture.MediaCapture();
        var settings = new Capture.MediaCaptureInitializationSettings();
        settings.videoDeviceId = deviceInfo.id;
        settings.streamingCaptureMode = Capture.streamingCaptureMode.audioAndVideo;

        oMediaCapture.initializeAsync(settings).then(function () {
            isInitialized = true;
            oDisplayRequest.requestActive();
            var preview = document.getElementById("windowsPreview");
            var previewUrl = URL.createObjectURL(oMediaCapture);
            preview.src = previewUrl;
            preview.play();
        });
    }
};

require("cordova/exec/proxy").add("CameraPreview", module.exports);
});
