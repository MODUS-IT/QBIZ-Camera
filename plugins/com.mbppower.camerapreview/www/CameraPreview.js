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
            exec(null, null, PLUGIN_NAME, "takePicture", []);
        },
        switchCamera: function () {
            exec(null, null, PLUGIN_NAME, "switchCamera", []);
        },
        hide: function () {
            exec(null, null, PLUGIN_NAME, "hide", []);
        },
        show: function () {
            exec(null, null, PLUGIN_NAME, "show", []);
        },
        logCamera: function () {
            exec(function (camera) {
                console.log('Camera Resolution: ' + camera.resolution);
                console.log('Camera Preview Resolution: ' + camera.previewResolution);
            }, null, PLUGIN_NAME, "logCamera", []);
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
        }
    }
