package com.boostgamefaster

import android.app.GameManager
import android.content.Context
import android.os.Build
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
                promise.reject("ERROR", "Game Mode is not supported on this Android version.")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to enable Game Mode: ${e.message}")
        }
    }
}
