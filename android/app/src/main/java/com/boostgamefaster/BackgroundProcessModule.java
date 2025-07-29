package com.boostgamefaster;

import android.app.ActivityManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
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
    public void getRunningApps(String manufacturer, Promise promise) {
        try {
            WritableArray appList = new WritableNativeArray();
            if (manufacturer.equalsIgnoreCase("xiaomi") || manufacturer.equalsIgnoreCase("samsung")) {
                // OEM workaround: Use UsageStatsManager for restricted devices
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                    UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
                    long time = System.currentTimeMillis();
                    List<UsageStats> stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 1000 * 3600, time);
                    for (UsageStats stat : stats) {
                        if (stat.getTotalTimeInForeground() > 0) {
                            WritableMap appInfo = new WritableNativeMap();
                            appInfo.putString("name", stat.getPackageName());
                            appInfo.putInt("pid", 0); // UsageStats doesn't provide PID
                            appList.pushMap(appInfo);
                        }
                    }
                } else {
                    ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
                    List<ActivityManager.AppTask> tasks = activityManager.getAppTasks();
                    for (ActivityManager.AppTask task : tasks) {
                        WritableMap appInfo = new WritableNativeMap();
                        appInfo.putString("name", task.getTaskInfo().baseActivity.getPackageName());
                        appInfo.putInt("pid", task.getTaskInfo().id);
                        appList.pushMap(appInfo);
                    }
                }
            } else {
                ActivityManager activityManager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
                List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
                for (ActivityManager.RunningAppProcessInfo process : processes) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                        continue;
                    }
                    WritableMap appInfo = new WritableNativeMap();
                    appInfo.putString("name", process.processName);
                    appInfo.putInt("pid", process.pid);
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

            if (manufacturer.equalsIgnoreCase("xiaomi") || manufacturer.equalsIgnoreCase("samsung")) {
                // OEM workaround
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                    UsageStatsManager usageStatsManager = (UsageStatsManager) reactContext.getSystemService(Context.USAGE_STATS_SERVICE);
                    long time = System.currentTimeMillis();
                    List<UsageStats> stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 1000 * 3600, time);
                    for (UsageStats stat : stats) {
                        if (!stat.getPackageName().equals(packageName) && stat.getTotalTimeInForeground() > 0) {
                            try {
                                activityManager.killBackgroundProcesses(stat.getPackageName());
                                WritableMap appInfo = new WritableNativeMap();
                                appInfo.putString("name", stat.getPackageName());
                                closedApps.pushMap(appInfo);
                            } catch (SecurityException e) {
                                // Skip restricted apps
                            }
                        }
                    }
                } else {
                    List<ActivityManager.AppTask> tasks = activityManager.getAppTasks();
                    for (ActivityManager.AppTask task : tasks) {
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
