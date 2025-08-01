package com.boostgamefaster;

import android.app.ActivityManager;
import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import java.util.Arrays;
import java.util.List;

public class BackgroundProcessModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private static final List<String> SYSTEM_APPS = Arrays.asList(
        "com.android.systemui",
        "com.android.phone",
        "com.android.settings",
        "com.android.launcher",
        "com.android.dialer"
    );

    public BackgroundProcessModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "BackgroundProcess";
    }

    /**
     * Closes background apps based on mode.
     */
    @ReactMethod
    public void closeBackgroundApps(String mode, Callback callback) {
        try {
            ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            List<ActivityManager.RunningAppProcessInfo> runningApps = activityManager.getRunningAppProcesses();
            if (runningApps == null) {
                callback.invoke("Error: No running apps found");
                return;
            }
            boolean isExtreme = mode.equalsIgnoreCase("EXTREME");
            for (ActivityManager.RunningAppProcessInfo process : runningApps) {
                if (process.importance != ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                        !process.processName.equals(reactContext.getPackageName()) &&
                        !isSystemApp(process.processName) &&
                        (isExtreme || !isEssentialApp(process.processName))) {
                    activityManager.killBackgroundProcesses(process.processName);
                }
            }
            callback.invoke(null, "Background apps closed in " + mode + " mode");
        } catch (Exception e) {
            android.util.Log.e("BackgroundProcess", "Close background apps failed: " + e.getMessage());
            callback.invoke("Error: " + e.getMessage());
        }
    }

    /**
     * Checks if an app is a system app.
     */
    private boolean isSystemApp(String processName) {
        return SYSTEM_APPS.stream().anyMatch(processName::contains);
    }

    /**
     * Checks if an app is essential.
     */
    private boolean isEssentialApp(String processName) {
        return SYSTEM_APPS.stream()
                .filter(app -> app.contains("launcher") || app.contains("dialer"))
                .anyMatch(processName::contains);
    }
}
