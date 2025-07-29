package com.boostgamefaster;

import android.content.ContentResolver;
import android.provider.Settings;
import android.os.Build;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class SystemSettingsModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

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
            if (Settings.System.canWrite(reactContext)) {
                // Increase screen brightness
                Settings.System.putInt(resolver, Settings.System.SCREEN_BRIGHTNESS, 255);
                // Attempt to disable battery saver (limited on newer APIs)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    promise.resolve("High performance mode enabled (max brightness).");
                } else {
                    promise.resolve("High performance mode enabled (max brightness).");
                }
            } else {
                promise.reject("PERMISSION_DENIED", "Please grant WRITE_SETTINGS permission.");
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to enable high performance mode: " + e.getMessage());
        }
    }
}
