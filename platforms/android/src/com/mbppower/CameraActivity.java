package com.mbppower;

import android.app.Activity;
import android.app.Fragment;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.ImageFormat;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.graphics.YuvImage;
import android.hardware.Camera;
import android.os.Bundle;
import android.util.Log;
import android.util.DisplayMetrics;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.view.WindowManager;
import android.view.Display;

import org.apache.cordova.LOG;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.TimerTask;
import java.util.Timer;

//////////////////////////////////////////////////////////////////////
/*                          CameraActivity                          */
//////////////////////////////////////////////////////////////////////
public class CameraActivity extends Fragment {

	public interface CameraPreviewListener {
		public void onPictureTaken(String originalPicturePath);
	}

	private CameraPreviewListener eventListener;
	private static final String TAG = "CameraActivity";
	public FrameLayout mainLayout;
	public FrameLayout frameContainerLayout;

	private Preview mPreview;
	private boolean canTakePicture = true;

	private View view;
	private Camera.Parameters cameraParameters;
	private Camera mCamera;
	private int numberOfCameras;
	private int cameraCurrentlyLocked;

	// The first rear facing camera
	private int defaultCameraId;
	public String defaultCamera;
	public boolean isTakingPicture = false;

	public int width;
	public int height;
	public int x;
	public int y;

	public void setEventListener(CameraPreviewListener listener){
		eventListener = listener;
	}

	private String appResourcesPackage;

	@Override
	public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
		appResourcesPackage = getActivity().getPackageName();
		Log.d(TAG, "onCreateView");
		// Inflate the layout for this fragment
		view = inflater.inflate(getResources().getIdentifier("camera_activity", "layout", appResourcesPackage), container, false);
		createCameraPreview();
		return view;
	}

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
	}
	
	public void setRect(int x, int y, int width, int height){
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}

	private void createCameraPreview(){
		if(mPreview == null) {
			setDefaultCameraId();
			//set box position and size
			FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(width, height);
			layoutParams.setMargins(x, y, 0, 0);
			frameContainerLayout = (FrameLayout) view.findViewById(getResources().getIdentifier("frame_container", "id", appResourcesPackage));
			frameContainerLayout.setLayoutParams(layoutParams);

			//video view
			mPreview = new Preview(getActivity());
			mainLayout = (FrameLayout) view.findViewById(getResources().getIdentifier("video_view", "id", appResourcesPackage));
			mainLayout.setLayoutParams(new RelativeLayout.LayoutParams(RelativeLayout.LayoutParams.MATCH_PARENT, RelativeLayout.LayoutParams.MATCH_PARENT));
			mainLayout.addView(mPreview);
			mainLayout.setEnabled(false);
		}
	}
	
	private void setDefaultCameraId(){
		
		// Find the total number of cameras available
		numberOfCameras = Camera.getNumberOfCameras();
		
		int camId = defaultCamera.equals("front") ? Camera.CameraInfo.CAMERA_FACING_FRONT : Camera.CameraInfo.CAMERA_FACING_BACK;

		// Find the ID of the default camera
		Camera.CameraInfo cameraInfo = new Camera.CameraInfo();
		for (int i = 0; i < numberOfCameras; i++) {
			Camera.getCameraInfo(i, cameraInfo);
			if (cameraInfo.facing == camId) {
				defaultCameraId = camId;
				break;
			}
		}
	}
	
	@Override
	public void onResume() {
		super.onResume();
		
		mCamera = Camera.open(defaultCameraId);

		if (cameraParameters != null) {
			mCamera.setParameters(cameraParameters);
		}

		cameraCurrentlyLocked = defaultCameraId;
		
		if(mPreview.mPreviewSize == null){
		mPreview.setCamera(mCamera, cameraCurrentlyLocked);
	} else {
		mPreview.switchCamera(mCamera, cameraCurrentlyLocked);
		mCamera.startPreview();
	}

		Log.d(TAG, "cameraCurrentlyLocked:" + cameraCurrentlyLocked);

		final FrameLayout frameContainerLayout = (FrameLayout) view.findViewById(getResources().getIdentifier("frame_container", "id", appResourcesPackage));
		ViewTreeObserver viewTreeObserver = frameContainerLayout.getViewTreeObserver();
		if (viewTreeObserver.isAlive()) {
			viewTreeObserver.addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
				@Override
				public void onGlobalLayout() {
					frameContainerLayout.getViewTreeObserver().removeGlobalOnLayoutListener(this);
					frameContainerLayout.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
					final RelativeLayout frameCamContainerLayout = (RelativeLayout) view.findViewById(getResources().getIdentifier("frame_camera_cont", "id", appResourcesPackage));

					FrameLayout.LayoutParams camViewLayout = new FrameLayout.LayoutParams(frameContainerLayout.getWidth(), frameContainerLayout.getHeight());
					camViewLayout.gravity = Gravity.CENTER_HORIZONTAL | Gravity.CENTER_VERTICAL;
					frameCamContainerLayout.setLayoutParams(camViewLayout);
				}
			});
		}
	}

	@Override
	public void onPause() {
		super.onPause();

		// Because the Camera object is a shared resource, it's very
		// important to release it when the activity is paused.
		if (mCamera != null) {
			mPreview.setCamera(null, -1);
			mCamera.release();
			mCamera = null;
		}
	}

	public Camera getCamera() {
	  return mCamera;
	}
	
	public String logCamera() {
		Camera.Size oldSize = mCamera.getParameters().getPreviewSize();
		mCamera.stopPreview();
		Camera.Size newSize = oldSize;
			newSize.width = 1280;
			newSize.height = 720;
		Camera.Parameters params = mCamera.getParameters();
		
		params.setPictureSize( 3264, 2448 );
		params.setPreviewSize( newSize.width, newSize.height );
		
		mCamera.setParameters(params);
		mCamera.startPreview();
		return "PreviewSize: " + mCamera.getParameters().getPreviewSize().width + " x " + mCamera.getParameters().getPreviewSize().height + " PicSize: " + mCamera.getParameters().getPictureSize().width + " x " + mCamera.getParameters().getPictureSize().height;
	}
	
	public void switchCamera() {
		// check for availability of multiple cameras
		if (numberOfCameras == 1) {
			//There is only one camera available
		}
		Log.d(TAG, "numberOfCameras: " + numberOfCameras);

		// OK, we have multiple cameras.
		// Release this camera -> cameraCurrentlyLocked
		if (mCamera != null) {
			mCamera.stopPreview();
			mPreview.setCamera(null, -1);
			mCamera.release();
			mCamera = null;
		}

		// Acquire the next camera and request Preview to reconfigure
		// parameters.
		mCamera = Camera.open((cameraCurrentlyLocked + 1) % numberOfCameras);
		if (cameraParameters != null) {
			mCamera.setParameters(cameraParameters);
		}

		cameraCurrentlyLocked = (cameraCurrentlyLocked + 1) % numberOfCameras;
		mPreview.switchCamera(mCamera, cameraCurrentlyLocked);

		Log.d(TAG, "cameraCurrentlyLocked new: " + cameraCurrentlyLocked);

		// Start the preview
		mCamera.startPreview();
	}

	public void setCameraParameters(Camera.Parameters params) {
	  cameraParameters = params;

	  if (mCamera != null && cameraParameters != null) {
			mCamera.setParameters(cameraParameters);
	  }
	}
	
	public boolean hasFrontCamera(){
		return getActivity().getApplicationContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_FRONT);
	}
	
	//This method takes photo
	public void takePicture(final double maxWidth, final double maxHeight){

		isTakingPicture = true;
		Log.d(TAG, "Taking photo started");
		if(mPreview != null) {
			if(!canTakePicture) return;
			
			//Start taking picture
			canTakePicture = false;
			setLargestCameraResolution();
			mCamera.autoFocus( new Camera.AutoFocusCallback() {
				@Override
				public void onAutoFocus(boolean success, Camera camera) {
					if( !isTakingPicture ) return;
					new Timer().schedule(new TimerTask() {          
						@Override
						public void run() {
						takePictureUtility();     
						}
					}, 300);
					isTakingPicture = false;
				}
			});
		}
		else
		{
			canTakePicture = true;
		}
	}
	
	private void takePictureUtility() {
		mCamera.takePicture( null, null, new Camera.PictureCallback() {
			@Override
			public void onPictureTaken(byte[] data, Camera camera) {
				fixPreviewAspectRatio();
				Log.d(TAG, "onPictureTaken");
				BitmapFactory.Options options = new BitmapFactory.Options();
				options.inSampleSize = 1; //Skala
				options.inDither = false; // Disable Dithering mode
				options.inPurgeable = true; // Tell to gc that whether it needs free
											// memory, the Bitmap can be cleared
				options.inInputShareable = true; // Which kind of reference will be
											// used to recover the Bitmap
											// data after being clear, when
											// it will be used in the future
				options.inTempStorage = new byte[64 * 1024];
				options.inPreferredConfig = Bitmap.Config.RGB_565;
				Bitmap bitmap = BitmapFactory.decodeByteArray(data, 0, data.length, options);
				int orientation;
				Log.d(TAG, bitmap.getHeight() + " " + bitmap.getWidth());
				if(bitmap.getHeight() < bitmap.getWidth()) {
					orientation = 90;
				} else {
					orientation = 0;
				}
				
				Bitmap bMapRotate;
				if (orientation != 0) {
					Matrix matrix = new Matrix();
					matrix.postRotate(orientation);
					bMapRotate = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
				} else
					bMapRotate = Bitmap.createScaledBitmap(bitmap, bitmap.getWidth(), bitmap.getHeight(), true);
				
				Bitmap bThumb = Bitmap.createScaledBitmap( bMapRotate, bMapRotate.getWidth()/8, bMapRotate.getHeight()/8, true );
				File thumb = storeThumbnail( bThumb, "_qbiz" );
				final File picFile = storeImage( bMapRotate, "_qbiz");
				eventListener.onPictureTaken( picFile.getAbsolutePath() );
				//Start preview and unlock taking picture
				mCamera.startPreview();
				canTakePicture = true;
			}
		});
	}
	
	private void setLargestCameraResolution() {
		//Okej... Test
		mCamera.stopPreview(); 
		Log.d(TAG, "Preview STOPPED!");
		//Current Camera Parameters
		Camera.Parameters cameraParameters = mCamera.getParameters();
		//Currect Camera Picture Size
		Camera.Size current = cameraParameters.getPictureSize();
			Log.d(TAG, "Current WIDTH: " + current.width + "  HEIGHT:" + current.height);
		//Get all supported picture sizes and get the largest
		List<Camera.Size> sizes = cameraParameters.getSupportedPictureSizes();
		Camera.Size optimalSize = sizes.get(0);
		for( Camera.Size size : sizes ) {
			Log.d(TAG, "Supported image size: " + size.width + " H: " + size.height);
			if(size.width > optimalSize.width) {
				optimalSize = size;
			}
		}
		//Sets biggest picture size to camera
			Log.d(TAG, "Set sizes: " + optimalSize.width + " " + optimalSize.height);
		cameraParameters.setPictureSize( optimalSize.width, optimalSize.height );
			Log.d(TAG, "Preview size: W:" + cameraParameters.getPreviewSize().width + " H:" + cameraParameters.getPreviewSize().height);
		setCameraParameters( cameraParameters );
		mCamera.startPreview();
	}
	
	private void fixPreviewAspectRatio() {
		//Current Camera Parameters
		Camera.Parameters cameraParameters = mCamera.getParameters();
		Camera.Size previewSize = cameraParameters.getPreviewSize();
		Log.d(TAG, "Preview resolution: " + previewSize.width + " x " + previewSize.height);
		//Currect Camera Picture Size
		Camera.Size current = cameraParameters.getPictureSize();
			//Get all supported picture sizes and get the smallest to fix aspect ratio
		List<Camera.Size> sizes = cameraParameters.getSupportedPictureSizes();
		Camera.Size optimalSize = sizes.get(0);
		for( Camera.Size size : sizes ) {
			if(size.width < optimalSize.width) {
				optimalSize = size;
			}
		}
		cameraParameters.setPictureSize( optimalSize.width, optimalSize.height );
		setCameraParameters( cameraParameters );
	}

	private File getOutputMediaFile(String suffix, String ext){
		File mediaStorageDir = getActivity().getApplicationContext().getFilesDir();
		if (! mediaStorageDir.exists()){
			if (! mediaStorageDir.mkdirs()){
				return null;
			}
		}
		// Create a media file name
		String timeStamp = new SimpleDateFormat("dd_MM_yyyy_HHmm_ss").format(new Date());
		String mImageName = "img_" + timeStamp + suffix + ext;
		File mediaFile = new File(mediaStorageDir.getPath() + File.separator + mImageName);
		return mediaFile;
	}
	
	private File storeThumbnail(Bitmap image, String suffix) {
		File pictureFile = getOutputMediaFile(suffix, ".jpg.thumb");
		if (pictureFile != null) {
			try {
				FileOutputStream fos = new FileOutputStream(pictureFile);
				image.compress(Bitmap.CompressFormat.JPEG, 90, fos);
				fos.close();
				return pictureFile;
			}
			catch (Exception ex) {
			}
		}
		return null;
	}
	
	private File storeImage(Bitmap image, String suffix) {
		File pictureFile = getOutputMediaFile(suffix, ".jpg");
		if (pictureFile != null) {
			try {
				FileOutputStream fos = new FileOutputStream(pictureFile);
				image.compress(Bitmap.CompressFormat.JPEG, 90, fos);
				fos.close();
				return pictureFile;
			}
			catch (Exception ex) {
			}
		}
		return null;
	}
	
	@Override
	public void onDestroy() {
		super.onDestroy();
	}
}

/* 
////////////////////////////////////////////////////////////////////
	Preview Class
////////////////////////////////////////////////////////////////////
*/

class Preview extends RelativeLayout implements SurfaceHolder.Callback {
	private final String TAG = "Preview";

	CustomSurfaceView mSurfaceView;
	SurfaceHolder mHolder;
	Camera.Size mPreviewSize;
	List<Camera.Size> mSupportedPreviewSizes;
	Camera mCamera;
	int cameraId;
	int displayOrientation;

	Preview(Context context) {
		super(context);

		mSurfaceView = new CustomSurfaceView(context);
		addView(mSurfaceView);

		requestLayout();

		// Install a SurfaceHolder.Callback so we get notified when the
		// underlying surface is created and destroyed.
		mHolder = mSurfaceView.getHolder();
		mHolder.addCallback(this);
		mHolder.setType(SurfaceHolder.SURFACE_TYPE_PUSH_BUFFERS);
	}

	public void setCamera(Camera camera, int cameraId) {
		mCamera = camera;
		this.cameraId = cameraId;
		if (mCamera != null) {
			setAutoFocus();
			mSupportedPreviewSizes = mCamera.getParameters().getSupportedPreviewSizes();
			setCameraDisplayOrientation();
		}
	}
	
	private void setAutoFocus() {
		List<String> mFocusModes = mCamera.getParameters().getSupportedFocusModes();
		Camera.Parameters params = mCamera.getParameters();
		if (mFocusModes.contains("continuous-picture")) {
			params.setFocusMode( Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE );
		} else if (mFocusModes.contains("continuous-video")){
			params.setFocusMode( Camera.Parameters.FOCUS_MODE_CONTINUOUS_VIDEO );
		} else if (mFocusModes.contains("auto")){
			params.setFocusMode( Camera.Parameters.FOCUS_MODE_AUTO );
		}  
		mCamera.setParameters( params );
	}
	
	public int getDisplayOrientation() {
		return displayOrientation;
	}

	private void setCameraDisplayOrientation() {
		Camera.CameraInfo info=new Camera.CameraInfo();
		int rotation=
			((Activity)getContext()).getWindowManager().getDefaultDisplay()
						 .getRotation();
		int degrees=0;
		DisplayMetrics dm=new DisplayMetrics();

		Camera.getCameraInfo(cameraId, info);
		((Activity)getContext()).getWindowManager().getDefaultDisplay().getMetrics(dm);

		switch (rotation) {
			case Surface.ROTATION_0:
				degrees=0;
				break;
			case Surface.ROTATION_90:
				degrees=90;
				break;
			case Surface.ROTATION_180:
				degrees=180;
				break;
			case Surface.ROTATION_270:
				degrees=270;
				break;
		}

		if (info.facing == Camera.CameraInfo.CAMERA_FACING_FRONT) {
			displayOrientation=(info.orientation + degrees) % 360;
			displayOrientation=(360 - displayOrientation) % 360;
		} else {
			displayOrientation=(info.orientation - degrees + 360) % 360;
		}

		Log.d(TAG, "screen is rotated " + degrees + "deg from natural");
		Log.d(TAG, (info.facing == Camera.CameraInfo.CAMERA_FACING_FRONT ? "front" : "back")
			+ " camera is oriented -" + info.orientation + "deg from natural");
		Log.d(TAG, "need to rotate preview " + displayOrientation + "deg");
		mCamera.setDisplayOrientation(displayOrientation);
	}

	public void switchCamera(Camera camera, int cameraId) {
		setCamera(camera, cameraId);
		try {
			camera.setPreviewDisplay(mHolder);
			Camera.Parameters parameters = camera.getParameters();
			parameters.setPreviewSize(mPreviewSize.width, mPreviewSize.height);
			camera.setParameters(parameters);
		}
		catch (IOException exception) {
			Log.e(TAG, exception.getMessage());
		}
	}

	@Override
	protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
		// We purposely disregard child measurements because act as a
		// wrapper to a SurfaceView that centers the camera preview instead
		// of stretching it.
		final int width = resolveSize(getSuggestedMinimumWidth(), widthMeasureSpec);
		final int height = resolveSize(getSuggestedMinimumHeight(), heightMeasureSpec);
		setMeasuredDimension(width, height);

		if (mSupportedPreviewSizes != null) {
			mPreviewSize = getOptimalPreviewSize(mSupportedPreviewSizes, width, height);
		}
	}

	@Override
	protected void onLayout(boolean changed, int l, int t, int r, int b) {

		if (changed && getChildCount() > 0) {
			final View child = getChildAt(0);

			int width = r - l;
			int height = b - t;

			int previewWidth = width;
			int previewHeight = height;

			if (mPreviewSize != null) {
				previewWidth = mPreviewSize.width;
				previewHeight = mPreviewSize.height;

				if(displayOrientation == 90 || displayOrientation == 270) {
					previewWidth = mPreviewSize.height;
					previewHeight = mPreviewSize.width;
				}

				LOG.d(TAG, "previewWidth:" + previewWidth + " previewHeight:" + previewHeight);
			}

			int nW;
			int nH;
			int top;
			int left;

			float scale = 1.0f;

			// Center the child SurfaceView within the parent.
			if (width * previewHeight < height * previewWidth) {
				Log.d(TAG, "center horizontally");
				int scaledChildWidth = (int)((previewWidth * height / previewHeight) * scale);
				nW = (width + scaledChildWidth) / 2;
				nH = (int)(height * scale);
				top = 0;
				left = (width - scaledChildWidth) / 2;
			}
			else {
				Log.d(TAG, "center vertically");
				int scaledChildHeight = (int)((previewHeight * width / previewWidth) * scale);
				nW = (int)(width * scale);
				nH = (height + scaledChildHeight) / 2;
				top = (height - scaledChildHeight) / 2;
				left = 0;
			}
			child.layout(left, top, nW, nH);

			Log.d(TAG, "Lout left:" + left);
			Log.d(TAG, "Lout top:" + top);
			Log.d(TAG, "lout right:" + nW);
			Log.d(TAG, "lout bottom:" + nH);
		}
	}

	public void surfaceCreated(SurfaceHolder holder) {
		// The Surface has been created, acquire the camera and tell it where
		// to draw.
		try {
			if (mCamera != null) {
				mSurfaceView.setWillNotDraw(false);
				mCamera.setPreviewDisplay(holder);
			}
		} catch (IOException exception) {
			Log.e(TAG, "IOException caused by setPreviewDisplay()", exception);
		}
	}

	public void surfaceDestroyed(SurfaceHolder holder) {
		// Surface will be destroyed when we return, so stop the preview.
		if (mCamera != null) {
			mCamera.stopPreview();
		}
	}
	private Camera.Size getOptimalPreviewSize(List<Camera.Size> sizes, int w, int h) {
		final double ASPECT_TOLERANCE = 0.1;
		double targetRatio = (double) w / h;
		if (displayOrientation == 90 || displayOrientation == 270) {
			targetRatio = (double) h / w;
		}
		if (sizes == null) return null;

		Camera.Size optimalSize = null;
		double minDiff = Double.MAX_VALUE;

		int targetHeight = h;

		// Try to find an size match aspect ratio and size
		for ( Camera.Size size : sizes ) {
			double ratio = (double) size.width / size.height;
			if (Math.abs(ratio - targetRatio) > ASPECT_TOLERANCE) continue;
			if (Math.abs(size.height - targetHeight) < minDiff) {
				optimalSize = size;
				minDiff = Math.abs(size.height - targetHeight);
			}
		}

		// Cannot find the one match the aspect ratio, ignore the requirement
		if (optimalSize == null) {
			minDiff = Double.MAX_VALUE;
			for (Camera.Size size : sizes) {
				if (Math.abs(size.height - targetHeight) < minDiff) {
					optimalSize = size;
					minDiff = Math.abs(size.height - targetHeight);
				}
			}
		}
		
		optimalSize = sizes.get(0);
		for(int i = 0; i < sizes.size(); i++) {
			if(sizes.get(i).width > optimalSize.width) {
				optimalSize = sizes.get(i);
			}
		}

		Log.d(TAG, "optimal preview size: w: " + optimalSize.width + " h: " + optimalSize.height);
		return optimalSize;
	}

	public void surfaceChanged(SurfaceHolder holder, int format, int w, int h) {
		if(mCamera != null) {
			// Now that the size is known, set up the camera parameters and begin
			// the preview.
			Camera.Parameters parameters = mCamera.getParameters();
			requestLayout();
			mCamera.setParameters(parameters);
			mCamera.startPreview();
		}
	}

	public byte[] getFramePicture(byte[] data, Camera camera) {
		Camera.Parameters parameters = camera.getParameters();
		int format = parameters.getPreviewFormat();

		//YUV formats require conversion
		if (format == ImageFormat.NV21 || format == ImageFormat.YUY2 || format == ImageFormat.NV16) {
			int w = parameters.getPreviewSize().width;
			int h = parameters.getPreviewSize().height;

			// Get the YuV image
			YuvImage yuvImage = new YuvImage(data, format, w, h, null);
			// Convert YuV to Jpeg
			Rect rect = new Rect(0, 0, w, h);
			ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
			yuvImage.compressToJpeg(rect, 80, outputStream);
			return outputStream.toByteArray();
		}
		return data;
	}
	public void setOneShotPreviewCallback(Camera.PreviewCallback callback) {
		if(mCamera != null) {
			mCamera.setOneShotPreviewCallback(callback);
		}
	}
}

class TapGestureDetector extends GestureDetector.SimpleOnGestureListener{

	@Override
	public boolean onDown(MotionEvent e) {
		return false;
	}

	@Override
	public boolean onSingleTapUp(MotionEvent e) {
		return true;
	}

	@Override
	public boolean onSingleTapConfirmed(MotionEvent e) {
		return true;
	}
}

class CustomSurfaceView extends SurfaceView implements SurfaceHolder.Callback{
	private final String TAG = "CustomSurfaceView";

	CustomSurfaceView(Context context){
		super(context);
	}

	@Override
	public void surfaceCreated(SurfaceHolder holder) {
	}

	@Override
	public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
	}

	@Override
	public void surfaceDestroyed(SurfaceHolder holder) {
	}
}
