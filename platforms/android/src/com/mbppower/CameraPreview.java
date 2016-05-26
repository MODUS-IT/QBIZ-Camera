package com.mbppower;

import android.app.FragmentManager;
import android.app.FragmentTransaction;
import android.hardware.Camera;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.TypedValue;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import java.util.TimerTask;
import java.util.Timer;

public class CameraPreview extends CordovaPlugin implements CameraActivity.CameraPreviewListener {

	private final String TAG = "QBIZ CameraPreview";
	private final String setOnPictureTakenHandlerAction = "setOnPictureTakenHandler";
	private final String setColorEffectAction = "setColorEffect";
	private final String startCameraAction = "startCamera";
	private final String stopCameraAction = "stopCamera";
	private final String switchCameraAction = "switchCamera";
	private final String takePictureAction = "takePicture";
	private final String showCameraAction = "showCamera";
	private final String hideCameraAction = "hideCamera";

	private CameraActivity fragment;
	private CallbackContext takePictureCallbackContext;
	private int containerViewId = 1;
	public CameraPreview(){
		super();
		Log.d(TAG, "Constructing");
	}

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {

    	if (setOnPictureTakenHandlerAction.equals(action)){
    		return setOnPictureTakenHandler(args, callbackContext);
    	}
        else if (startCameraAction.equals(action)){
    		return startCamera(args, callbackContext);
    	}
	    else if (takePictureAction.equals(action)){
		    return takePicture(args, callbackContext);
	    }
	    else if (stopCameraAction.equals(action)){
		    return stopCamera(args, callbackContext);
	    }
	    else if (hideCameraAction.equals(action)){
		    return hideCamera(args, callbackContext);
	    }
	    else if (showCameraAction.equals(action)){
		    return showCamera(args, callbackContext);
	    }
	    else if (switchCameraAction.equals(action)){
		    return switchCamera(args, callbackContext);
	    }
        else if (action.equals("logCamera")) {
            return logCamera(args, callbackContext);
        } else if(action.equals("setupCamera")) {
            return setupCamera(args, callbackContext);
        } else if( action.equals("useMotionDetection") ) {
            return useMotionDetection(args, callbackContext);
        } else if ( action.equals("useTimer") ) {
            return useTimer(args, callbackContext);
        } else if( action.equals("motionDetectionStart") ) {
            return motionDetectionStart(args, callbackContext);
        } else if( action.equals("motionDetectionStop")) {
            return motionDetectionStop(args, callbackContext);
        }

    	return false;
    }

	private boolean startCamera(final JSONArray args, CallbackContext callbackContext) {
        if(fragment != null){
	        return false;
        }
		fragment = new CameraActivity();
		fragment.setEventListener(this);
		cordova.getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
				try {
					DisplayMetrics metrics = cordova.getActivity().getResources().getDisplayMetrics();
					int width = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, args.getInt(1), metrics);
					int height = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, args.getInt(2), metrics);
					Boolean toBack = args.getBoolean(0);

					fragment.defaultCamera = "back";
					fragment.setRect(0, 0, width, height);

					//create or update the layout params for the container view
					FrameLayout containerView = (FrameLayout)cordova.getActivity().findViewById(containerViewId);
					if(containerView == null){
						containerView = new FrameLayout(cordova.getActivity().getApplicationContext());
						containerView.setId(containerViewId);

						FrameLayout.LayoutParams containerLayoutParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
						cordova.getActivity().addContentView(containerView, containerLayoutParams);
					}
                    
					//display camera below the webview
					if(toBack){
						webView.getView().setBackgroundColor(0x00000000);
						((ViewGroup)webView.getView()).bringToFront();
					}
					else{
						//set camera back to front
						containerView.bringToFront();
					}

					//add the fragment to the container
					FragmentManager fragmentManager = cordova.getActivity().getFragmentManager();
					FragmentTransaction fragmentTransaction = fragmentManager.beginTransaction();
					fragmentTransaction.add(containerView.getId(), fragment);
					fragmentTransaction.commit();
					new Timer().schedule(new TimerTask() {          
						@Override
						public void run() {
							Log.d(TAG, "timer cameraRes");
                            fragment.setLargestCameraResolution();    
						}
					}, 2000);
				}
				catch(Exception e){
					e.printStackTrace();
				}
            }
        });
		return true;
	}
	private boolean takePicture(final JSONArray args, CallbackContext callbackContext) {
	Log.d(TAG, "boolean TakePicture CameraPreview");
		if(fragment == null){
			return false;
		}
		PluginResult pluginResult = new PluginResult(PluginResult.Status.OK);
		Log.d(TAG, "pluginResult CameraPreview");
		pluginResult.setKeepCallback(true);
		Log.d(TAG, "setKeepCallback CameraPreview");
		callbackContext.sendPluginResult(pluginResult);
		Log.d(TAG, "sendPluginResult CameraPreview");
		try {
			double maxWidth = 0;
			double maxHeight = 0;
			Log.d(TAG, "b4 fragment.takePicture");
			fragment.takePicture(maxWidth, maxHeight);
		}
		catch(Exception e){
			e.printStackTrace();
			return false;
		}
		return true;
	}

	public void onPictureTaken(String originalPicturePath){
		JSONArray data = new JSONArray();
		data.put(originalPicturePath);
		PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, data);
		pluginResult.setKeepCallback(true);
		takePictureCallbackContext.sendPluginResult(pluginResult);
	}

	private boolean stopCamera(final JSONArray args, CallbackContext callbackContext) {
		if(fragment == null){
			return false;
		}

		FragmentManager fragmentManager = cordova.getActivity().getFragmentManager();
		FragmentTransaction fragmentTransaction = fragmentManager.beginTransaction();
		fragmentTransaction.remove(fragment);
		fragmentTransaction.commit();
		fragment = null;

		return true;
	}

	private boolean showCamera(final JSONArray args, CallbackContext callbackContext) {
		if(fragment == null){
			return false;
		}

		FragmentManager fragmentManager = cordova.getActivity().getFragmentManager();
		FragmentTransaction fragmentTransaction = fragmentManager.beginTransaction();
		fragmentTransaction.show(fragment);
		fragmentTransaction.commit();

		return true;
	}
	private boolean hideCamera(final JSONArray args, CallbackContext callbackContext) {
		if(fragment == null) {
			return false;
		}

		FragmentManager fragmentManager = cordova.getActivity().getFragmentManager();
		FragmentTransaction fragmentTransaction = fragmentManager.beginTransaction();
		fragmentTransaction.hide(fragment);
		fragmentTransaction.commit();

		return true;
	}
	private boolean switchCamera(final JSONArray args, CallbackContext callbackContext) {
		if(fragment == null){
			return false;
		}
		fragment.switchCamera();
		return true;
	}
    private boolean logCamera(final JSONArray args, CallbackContext callbackContext ) {
        if(fragment == null) return false;
        Log.d(TAG, fragment.logCamera());
        return true;
    }
    
    private boolean setupCamera(final JSONArray args, CallbackContext callbackContext) {
        if(fragment == null) return false;
        fragment.setupCamera();
        return true;
    }
    
    private boolean setOnPictureTakenHandler(JSONArray args, CallbackContext callbackContext) {
        Log.d(TAG, "--- setOnPictureTakenHandler ---");
	    takePictureCallbackContext = callbackContext;
    	return true;
	}
    
    private boolean useMotionDetection(JSONArray args, CallbackContext callbackContext) {
        if(fragment == null) return false;
        fragment.useMotionDetection();
        return true;
    }
    
    private boolean motionDetectionStart(JSONArray args, CallbackContext callbackContext) {
        if(fragment == null) return false;
        fragment.motionDetectionStart();
        return true;
    }
    
    private boolean motionDetectionStop(JSONArray args, CallbackContext callbackContext) {
        if(fragment == null) return false;
        fragment.motionDetectionStop();
        return true;
    }
    
    private boolean useTimer(JSONArray args, CallbackContext callbackContext) {
        if(fragment == null) return false;
        fragment.useTimer();
        return true;
    }
}
