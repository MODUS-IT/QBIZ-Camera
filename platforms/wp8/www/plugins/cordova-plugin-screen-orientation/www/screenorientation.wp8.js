cordova.define("cordova-plugin-screen-orientation.screenorientation.wp8", function(require, exports, module) { var exec = require('cordova/exec'),
    screenOrientation = {};

screenOrientation.setOrientation = function(orientation) {
    exec(null, null, "YoikScreenOrientation", "screenOrientation", [orientation]);
};

module.exports = screenOrientation;
});
