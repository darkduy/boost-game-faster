package com.boostgamefaster;

import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class SystemSettingsModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private static final String TAG = "SystemSettingsModule";

    public SystemSettingsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SystemSettings";
    }

    @ReactMethod
    public void enableHighPerformanceMode(Promise promise) {
        try {
            ContentResolver resolver = reactContext.getContentResolver();
            // Check if we have WRITE_SETTINGS permission
            if (Settings.System.canWrite(reactContext)) {
                // Example: Adjust screen brightness to max (255) to optimize for gaming
                Settings.System.putInt(resolver, Settings.System.SCREEN_BRIGHTNESS, 255);
                // Note: Some devices support custom performance modes (e.g., Game Mode)
                // This is device-specific and may require OEM-specific APIs
                promise.resolve("High performance mode enabled: Screen brightness set to max.");
            } else {
                // Request WRITE_SETTINGS permission
                Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS);
                intent.setData(Uri.parse("package:" + reactContext.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.reject("PERMISSION_DENIED", "Please grant WRITE_SETTINGS permission.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error enabling high performance mode: " + e.getMessage());
            promise.reject("ERROR", "Failed to enable high performance mode: " + e.getMessage());
        }
    }

    @ReactMethod
    public void restoreDefaultSettings(Promise promise) {
        try {
            ContentResolver resolver = reactContext.getContentResolver();
            if (Settings.System.canWrite(reactContext)) {
                // Restore screen brightness to auto mode
                Settings.System.putInt(resolver, Settings.System.SCREEN_BRIGHTNESS_MODE, 
                    Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC);
                promise.resolve("Restored default settings.");
            } else {
                promise.reject("PERMISSION_DENIED", "WRITE_SETTINGS permission required.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error restoring settings: " + e.getMessage());
            promise.reject("ERROR", "Failed to restore settings: " + e.getMessage());
        }
    }
}