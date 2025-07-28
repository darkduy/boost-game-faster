package com.boostgamefaster;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.util.List;

public class GameDetectorModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public GameDetectorModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "GameDetector";
    }

    @ReactMethod
    public void getInstalledGames(Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            List<ApplicationInfo> packages = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            WritableArray gameList = new WritableNativeArray();

            for (ApplicationInfo app : packages) {
                // Check if the app belongs to CATEGORY_GAME or has game-like characteristics
                if ((app.category == ApplicationInfo.CATEGORY_GAME) ||
                    (app.metaData != null && app.metaData.containsKey("com.google.android.play.games")) ||
                    app.packageName.contains("game")) {
                    WritableMap gameInfo = new WritableNativeMap();
                    gameInfo.putString("name", pm.getApplicationLabel(app).toString());
                    gameInfo.putString("packageName", app.packageName);
                    gameInfo.putString("status", "Ready");
                    gameInfo.putString("resolution", "1920x1080"); // Default value
                    gameInfo.putString("fpsCap", "60"); // Default value
                    gameList.pushMap(gameInfo);
                }
            }
            promise.resolve(gameList);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get installed games: " + e.getMessage());
        }
    }

    @ReactMethod
    public void launchGame(String packageName, Promise promise) {
        try {
            Intent launchIntent = reactContext.getPackageManager().getLaunchIntentForPackage(packageName);
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(launchIntent);
                promise.resolve("Launched " + packageName);
            } else {
                promise.reject("ERROR", "Could not launch game: " + packageName);
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to launch game: " + e.getMessage());
        }
    }
}