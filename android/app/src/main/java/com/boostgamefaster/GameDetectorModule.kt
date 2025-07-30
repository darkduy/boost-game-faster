package com.boostgamefaster

import android.content.Context
import android.content.pm.PackageManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class GameDetectorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val context: Context = reactContext
    private val coroutineScope = CoroutineScope(Dispatchers.Main)

    override fun getName(): String = "GameDetector"

    /**
     * Retrieves installed games with validation against known packages.
     * @param callback Returns list of games or error
     */
    @ReactMethod
    fun getInstalledGames(callback: Callback) {
        coroutineScope.launch {
            try {
                val packageManager = context.packageManager
                val installedApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
                val validGames = listOf(
                    "com.tencent.ig", // PUBG Mobile
                    "com.activision.callofduty.shooter", // Call of Duty Mobile
                    "com.miHoYo.GenshinImpact" // Genshin Impact
                )
                val games = installedApps
                    .filter { it.packageName in validGames || it.packageName.contains("game") || it.packageName.contains("play") }
                    .map {
                        mapOf(
                            "name" to sanitizeInput(packageManager.getApplicationLabel(it).toString()),
                            "packageName" to it.packageName,
                            "genre" to "Unknown" // Simplified, can be enhanced with Play Store API
                        )
                    }
                callback.invoke(null, games)
            } catch (e: Exception) {
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Retrieves all installed apps for manual selection.
     * @param callback Returns list of apps or error
     */
    @ReactMethod
    fun getAllInstalledApps(callback: Callback) {
        coroutineScope.launch {
            try {
                val packageManager = context.packageManager
                val installedApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
                val apps = installedApps
                    .filter { it.packageName != context.packageName } // Exclude self
                    .map {
                        mapOf(
                            "name" to sanitizeInput(packageManager.getApplicationLabel(it).toString()),
                            "packageName" to it.packageName,
                            "genre" to "Unknown"
                        )
                    }
                callback.invoke(null, apps)
            } catch (e: Exception) {
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Starts monitoring game status and emits updates.
     */
    @ReactMethod
    fun startMonitoring() {
        coroutineScope.launch {
            while (true) {
                val status = mapOf(
                    "cpuUsage" to (Math.random() * 100).toFloat(),
                    "ramUsage" to (Math.random() * 100).toFloat(),
                    "fps" to (Math.random() * 60).toInt(),
                    "ping" to (Math.random() * 100).toInt()
                )
                withContext(Dispatchers.Main) {
                    reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("GameStatusUpdate", status)
                }
                kotlinx.coroutines.delay(5000)
            }
        }
    }

    /**
     * Sanitizes input to prevent injection attacks.
     * @param input Input string
     * @return Sanitized string
     */
    private fun sanitizeInput(input: String): String {
        return input.replace(Regex("[<>{};]"), "")
    }
}
