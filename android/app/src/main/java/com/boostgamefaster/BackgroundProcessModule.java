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

    public BackgroundProcessModule(Context activityManager) {
        super(reactContext);
        this.context = reactContext;
    }

    @Override
    public String getName() {
        return "BackgroundProcess";
    }

    @ReactMethod
    public void getRunningApps(String manufacturer, Promise promise) {
        try {
            ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            WritableArray appList = new WritableNativeArray();
            if (manufacturer.equalsIgnoreCase("xiaomi")) {
                // Xiaomi workaround: Use getRunningTasks if available
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    List<ActivityManager.AppTasks> tasks = activityManager.getAppTasks();
                    for (ActivityManager.AppTaskInfo task : tasks) {
                        WritableMap appInfo = new WritableNativeMap();
                        appInfo.putString("name", task.getTaskInfo().baseActivity.getPackageName());
                        appInfo.putInt("pid", task.getTaskInfo().id);
                        appList.pushMap(appInfo);
                    }
                } else {
                    List<ActivityManager.AppInfo> processes = activityManager.getRunningApps();
                    for (ActivityManager.AppInfo process : processes) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && process.importance == ActivityManager.AppInfo.IMPORTANCE) {
                            continue;
                        }
                        WritableMap appInfo = new WritableNativeMap();
                        appInfo.putString("name", process.name);
                        appInfo.putInt("pid", process.pid);
                        appList.pushMap(appInfo);
                    }
                }
            } else {
                List<ActivityManager.AppInfo> processes = activityManager.getRunningApps();
                for (ActivityManager.AppInfo processInfo : processes) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && processInfo.importance == ActivityManager.AppInfo.IMPORTANCE) {
                        continue;
                    }
                    WritableMap appInfo = new WritableNativeMap();
                    appInfo.putString("name", processInfo.name);
                    appInfo.putInt("pid", processInfo.pid);
                    appList.pushMap(appInfo);
                }
            }
            promise.resolve(appList);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get running apps: " + e.getMessage());
        }
    }

    @ReactMethod
    public void closeBackgroundApps(String manufacturer, Promise promise) {
        try {
            ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
            String packageName = reactContext.getPackageName();
            WritableArray closedApps = new WritableNativeArray();

            if (manufacturer.equalsIgnoreCase("xiaomi")) {
                // Xiaomi workaround
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    List<ActivityManager.AppTasks> tasks = activityManager.getAppTasks();
                    for (ActivityManager.AppTaskInfo task : tasks) {
                        String taskPackage = task.getTaskInfo().baseActivity.getPackageName();
                        if (!taskPackage.equals(packageName)) {
                            try {
                                activityManager.moveTaskToBack(task.getTaskInfo().id);
                                WritableMap appInfo = new WritableNativeMap();
                                appInfo.putString("name", taskPackage);
                                closedApps.pushMap(appInfo);
                            } catch (SecurityException e) {
                                // Skip restricted tasks
                            }
                        }
                    }
                } else {
                    List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
                    for (ActivityManager.RunningAppProcessInfo process : processes) {
                        if (!process.processName.equals(packageName)) {
                            try {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                                    continue;
                                }
                                activityManager.killBackgroundProcesses(process.processName);
                                WritableMap appInfo = new WritableNativeMap();
                                appInfo.putString("name", process.processName);
                                closedApps.pushMap(appInfo);
                            } catch (SecurityException e) {
                                // Skip restricted apps
                            }
                        }
                    }
                }
            } else {
                List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
                for (ActivityManager.RunningAppProcessInfo process : processes) {
                    if (!process.processName.equals(packageName)) {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                                continue;
                            }
                            activityManager.killBackgroundProcesses(process.processName);
                            WritableMap appInfo = new WritableNativeMap();
                            appInfo.putString("name", process.processName);
                            closedApps.pushMap(appInfo);
                        } catch (SecurityException e) {
                            // Skip restricted apps
                        }
                    }
                }
            }
            promise.resolve(closedApps);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to close background apps: " + e.getMessage());
        }
    }
}
