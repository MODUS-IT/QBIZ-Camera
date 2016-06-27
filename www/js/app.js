"use strict";

function log(obj, msg) {
    console.log(obj);
    console.log('^ ' + msg);
}

/**
 * @param {number} projectId
 * @param {string} projectName
 */
var Project = function Project (projectId, projectName) {
    this.id = projectId;
    this.projectName = projectName;
    this.images = [];
}

var Logger = function Logger() {
    this.log = [];
    this.add = function(str) {
        this.log.unshift(str);
    }
    this.show = function () {
        console.log(this.log);
    }
}

window.logger = new Logger();

function closeApp( index ) {
    if (index != 1) return;
    navigator.app.exitApp();
}

angular.module('cameraApp', ['ionic', 'ngCordova', 'cameraApp.PHPUpload', 'cameraApp.FileManipulation', 'cameraApp.localStorage', 'cameraApp.directives', 'cameraApp.settingsCtrl', 'cameraApp.mainCtrl'])
	.run(function($ionicPlatform, $state, $cordovaDialogs) {
		$ionicPlatform.ready(function() {
            window.screen.lockOrientation('portrait');
			$ionicPlatform.registerBackButtonAction(function() {
			switch( $state.current.name ) {
				case 'browser.imageBrowser': 
					$state.go('^.projectBrowser');
					break;
				case 'browser.projectBrowser':
					$state.go('mainView');
					break;
				case 'settings':
					$state.go('mainView');
					break;
				case 'mainView':
					$cordovaDialogs.confirm('Czy na pewno chcesz wyjść?', 'QBIZ Camera360', ['Wyjdź', 'Anuluj']).then( closeApp );
					break;
			}
		}, 101);
            if (window.cordova && window.cordova.plugins.Keyboard) {
				//cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
				cordova.plugins.Keyboard.disableScroll(true);
			}
			if (window.StatusBar) {
				window.StatusBar.styleDefault();
			}
		});
	})
	.config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider, $compileProvider) {
	    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|ms-appdata):/);
		$stateProvider
			.state('mainView', {
				url: '/mainView',
				views: {
					mainView: {
						templateUrl: 'main_view.html'
					}
				}
			})
			
			.state('browser', {
				url: '/browser',
				views: {
					"mainView": {
						templateUrl: 'browser/browser.html'
					}
				}
			})
			
			.state('browser.projectBrowser', {
				url: '/projectBrowser',
				views: {
					"browser": {
						templateUrl: 'browser/projects.html'
					}
				}
			})
			
			.state('browser.imageBrowser', {
				url: '/imageBrowser',
				views: {
					"browser": {
						templateUrl: 'browser/images.html'
					}
				}
			})

			.state('settings', {
				url: '/settings',
				views: {
					mainView: {
						templateUrl: 'settings.html'
					}
				}
			})

		$urlRouterProvider.otherwise('/mainView');
	});