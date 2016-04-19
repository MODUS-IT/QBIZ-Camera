cordova.define("com.mbppower.camerapreview.CameraPreview", function(require, exports, module) {
    var argscheck = require('cordova/argscheck'),
        utils = require('cordova/utils'),
        exec = require('cordova/exec');

    var PLUGIN_NAME = "CameraPreview";

    function CameraPreview() {
        CameraPreview.prototype.setOnPictureTakenHandler = function (onPictureTaken) {
            exec(onPictureTaken, onPictureTaken, PLUGIN_NAME, "setOnPictureTakenHandler", []);
        };

        CameraPreview.prototype.startCamera = function (rect, defaultCamera, tapEnabled, dragEnabled, toBack, alpha) {
            if (typeof (alpha) === 'undefined') alpha = 1;
            exec(null, null, PLUGIN_NAME, "startCamera", [rect.x, rect.y, rect.width, rect.height, defaultCamera, !!tapEnabled, !!dragEnabled, !!toBack, alpha]);
        };

        CameraPreview.prototype.stopCamera = function () {
            exec(null, null, PLUGIN_NAME, "stopCamera", []);
        };

        CameraPreview.prototype.takePicture = function (size) {
            var params = [0, 0];
            if (size) {
                params = [size.maxWidth, size.maxHeight];
            }
            exec(null, null, PLUGIN_NAME, "takePicture", params);
        };

        CameraPreview.prototype.switchCamera = function () {
            exec(null, null, PLUGIN_NAME, "switchCamera", []);
        };

        CameraPreview.prototype.hide = function () {
            exec(null, null, PLUGIN_NAME, "hideCamera", []);
        };

        CameraPreview.prototype.show = function () {
            exec(null, null, PLUGIN_NAME, "showCamera", []);
        };

        CameraPreview.prototype.logCamera = function () {
            exec(null, null, PLUGIN_NAME, "logCamera", []);
            console.log('hello');
        }

        CameraPreview.prototype.fullRes = function () {
            exec(null, null, PLUGIN_NAME, "doSth", []);
        }

        CameraPreview.prototype.useTimer = function useTimer() {
            exec(null, null, PLUGIN_NAME, "useTimer", []);
        }

        CameraPreview.prototype.useMotionDetection = function useMotionDetection() {
            exec(null, null, PLUGIN_NAME, "useMotionDetection", []);
        }

        CameraPreview.prototype.motionDetectionStart = function motionDetectionStart() {
            exec(null, null, PLUGIN_NAME, "motionDetectionStart", []);
        }

        CameraPreview.prototype.motionDetectionStop = function motionDetectionStop() {
            exec(null, null, PLUGIN_NAME, "motionDetectionStop", []);
        }

        CameraPreview.prototype.echo = function (str, callback) {
            exec(callback, function (err) { console.log('LOL'); }, PLUGIN_NAME, "echo", [str]);
        }
        this.test = 3;
    };

    module.exports = new CameraPreview();

});
