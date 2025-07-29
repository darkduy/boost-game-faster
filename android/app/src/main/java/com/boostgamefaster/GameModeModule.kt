package com.boostgamefaster

import android.app.GameManager
import android.content.ContentResolver
import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class GameModeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "GameMode"

    @ReactMethod
    fun enableGameMode(packageName: String, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val gameManager = reactApplicationContext.getSystemService(Context.GAME_SERVICE) as GameManager
                gameManager.setGameMode(packageName, GameManager.GAME_MODE_PERFORMANCE)
                promise.resolve("Game Mode enabled for $packageName.")
            } else {
                // Fallback for older APIs
                val resolver = reactApplicationContext.contentResolver
                if (Settings.System.canWrite(reactApplicationContext)) {
                    Settings.System.putInt(resolver, Settings.System.SCREEN_BRIGHTNESS, 255)
                    val powerManager = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        if (powerManager.isPowerSaveMode()) {
                            // Cannot disable power save mode programmatically, so inform user
                            promise.resolve("High performance mode enabled (max brightness). Disable power save mode manually for best performance.")
                        } else {
                            promise.resolve("High performance mode enabled (max brightness).")
                        }
                    } else {
                        promise.resolve("High performance mode enabled (max brightness).")
                    }
                } else {
                    promise.reject("PERMISSION_DENIED", "Please grant WRITE_SETTINGS permission to enable high performance mode.")
                }
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to enable Game Mode: ${e.message}")
        }
    }
}
