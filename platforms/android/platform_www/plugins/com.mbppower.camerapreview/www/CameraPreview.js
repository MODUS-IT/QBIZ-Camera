cordova.define("com.mbppower.camerapreview.CameraPreview", function(require, exports, module) {
    var argscheck = require('cordova/argscheck'),
        utils = require('cordova/utils'),
        exec = require('cordova/exec');

    var PLUGIN_NAME = "CameraPreview";

    module.exports = {

        setOnPictureTakenHandler: function (onPictureTaken) {
            exec(onPictureTaken, onPictureTaken, PLUGIN_NAME, "setOnPictureTakenHandler", []);
        },
        startCamera: function (startAsBackground, screen) {
            exec(null, null, PLUGIN_NAME, "startCamera", [startAsBackground, screen.w, screen.h]);
        },
        stopCamera: function () {
            exec(null, null, PLUGIN_NAME, "stopCamera", []);
        },
        takePicture: function () {
            var params = [0, 0];
            if (size) {
                params = [size.maxWidth, size.maxHeight];
            }
            exec(null, null, PLUGIN_NAME, "takePicture", params);
        },
        switchCamera: function () {
            exec(null, null, PLUGIN_NAME, "switchCamera", []);
        },
        hideCamera: function () {
            exec(null, null, PLUGIN_NAME, "hideCamera", []);
        },
        show: function () {
            exec(null, null, PLUGIN_NAME, "showCamera", []);
        },
        logCamera: function () {
            exec(null, null, PLUGIN_NAME, "logCamera", []);
        },
        fullRes: function () {
            exec(null, null, PLUGIN_NAME, "setupCamera", []);
        },
        useTimer: function useTimer() {
            exec(null, null, PLUGIN_NAME, "useTimer", []);
        },
        useMotionDetection: function useMotionDetection() {
            exec(null, null, PLUGIN_NAME, "useMotionDetection", []);
        },
        motionDetectionStart: function motionDetectionStart() {
            exec(null, null, PLUGIN_NAME, "motionDetectionStart", []);
        },
        motionDetectionStop: function motionDetectionStop() {
            exec(null, null, PLUGIN_NAME, "motionDetectionStop", []);
        },
        echo: function (strInput) {
            function log(param) {
                console.log(param);
            }
            exec(log, log, PLUGIN_NAME, "echo", [strInput]);
        }

    }

});
