cordova.define("com.mbppower.camerapreview.CameraPreview", function(require, exports, module) {
    var argscheck = require('cordova/argscheck'),
        utils = require('cordova/utils'),
        exec = require('cordova/exec');

    var PLUGIN_NAME = "CameraPreview";

    function CameraPreview() {
        CameraPreview.setOnPictureTakenHandler = function (onPictureTaken) {
            exec(onPictureTaken, onPictureTaken, PLUGIN_NAME, "setOnPictureTakenHandler", []);
        };

        CameraPreview.startCamera = function (rect, defaultCamera, tapEnabled, dragEnabled, toBack, alpha) {
            if (typeof (alpha) === 'undefined') alpha = 1;
            exec(null, null, PLUGIN_NAME, "startCamera", [rect.x, rect.y, rect.width, rect.height, defaultCamera, !!tapEnabled, !!dragEnabled, !!toBack, alpha]);
        };

        CameraPreview.stopCamera = function () {
            exec(null, null, PLUGIN_NAME, "stopCamera", []);
        };

        CameraPreview.takePicture = function (size) {
            var params = [0, 0];
            if (size) {
                params = [size.maxWidth, size.maxHeight];
            }
            exec(null, null, PLUGIN_NAME, "takePicture", params);
        };

        CameraPreview.switchCamera = function () {
            exec(null, null, PLUGIN_NAME, "switchCamera", []);
        };

        CameraPreview.hide = function () {
            exec(null, null, PLUGIN_NAME, "hideCamera", []);
        };

        CameraPreview.show = function () {
            exec(null, null, PLUGIN_NAME, "showCamera", []);
        };

        CameraPreview.logCamera = function () {
            exec(null, null, PLUGIN_NAME, "logCamera", []);
            console.log('hello');
        }

        CameraPreview.fullRes = function () {
            exec(null, null, PLUGIN_NAME, "doSth", []);
        }

        CameraPreview.useTimer = function useTimer() {
            exec(null, null, PLUGIN_NAME, "useTimer", []);
        }

        CameraPreview.useMotionDetection = function useMotionDetection() {
            exec(null, null, PLUGIN_NAME, "useMotionDetection", []);
        }

        CameraPreview.motionDetectionStart = function motionDetectionStart() {
            exec(null, null, PLUGIN_NAME, "motionDetectionStart", []);
        }

        CameraPreview.motionDetectionStop = function motionDetectionStop() {
            exec(null, null, PLUGIN_NAME, "motionDetectionStop", []);
        }

        CameraPreview.echo = function (str, callback) {
            exec(callback, function (err) { console.log('LOL'); }, PLUGIN_NAME, "echo", [str]);
        }
    };

    module.exports = new CameraPreview();

});
