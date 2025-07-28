package com.boostgamefaster;

import android.app.ActivityManager;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.os.Build;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.util.List;

public class BackgroundProcessModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public BackgroundProcessModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "BackgroundProcess";
    }

    @ReactMethod
    public void getRunningApps(Promise promise) {
        try {
            ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
            WritableArray appList = new WritableNativeArray();

            for (ActivityManager.RunningAppProcessInfo process : processes) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                    continue; // Skip foreground apps on Android 10+
                }
                WritableMap appInfo = new WritableNativeMap();
                appInfo.putString("name", process.processName);
                appInfo.putInt("pid", process.pid);
                appList.pushMap(appInfo);
            }
            promise.resolve(appList);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get running apps: " + e.getMessage());
        }
    }

    @ReactMethod
    public void closeBackgroundApps(Promise promise) {
        try {
            ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
            String packageName = reactContext.getPackageName();
            WritableArray closedApps = new WritableNativeArray();

            for (ActivityManager.RunningAppProcessInfo process : processes) {
                if (!process.processName.equals(packageName)) {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                            continue; // Skip foreground apps
                        }
                        activityManager.killBackgroundProcesses(process.processName);
                        WritableMap appInfo = new WritableNativeMap();
                        appInfo.putString("name", process.processName);
                        closedApps.pushMap(appInfo);
                    } catch (SecurityException e) {
                        // Skip apps that can't be closed
                    }
                }
            }
            promise.resolve(closedApps);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to close background apps: " + e.getMessage());
        }
    }
}
