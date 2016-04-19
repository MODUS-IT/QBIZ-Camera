    var argscheck = require('cordova/argscheck'),
        utils = require('cordova/utils'),
        exec = require('cordova/exec');

    var PLUGIN_NAME = "CameraPreview";

    module.exports = {
        setOnPictureTakenHandler: function (onPictureTaken) {
            exec(onPictureTaken, onPictureTaken, PLUGIN_NAME, "setOnPictureTakenHandler", []);
        },
        startCamera: function (rect, defaultCamera, tapEnabled, dragEnabled, toBack, alpha) {
            if (typeof (alpha) === 'undefined') alpha = 1;
            exec(null, null, PLUGIN_NAME, "startCamera", [rect.x, rect.y, rect.width, rect.height, defaultCamera, !!tapEnabled, !!dragEnabled, !!toBack, alpha]);
        },
        stopCamera: function () {
            exec(null, null, PLUGIN_NAME, "stopCamera", []);
        },
        takePicture: function (size) {
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
            console.log('hello');
        },
        fullRes: function () {
            exec(null, null, PLUGIN_NAME, "doSth", []);
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

    }
