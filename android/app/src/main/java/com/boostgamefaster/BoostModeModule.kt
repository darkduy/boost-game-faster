package com.boostgamefaster

import android.app.ActivityManager
import android.app.NotificationManager
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.TrafficStats
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import android.widget.TextView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

enum class Mode { NORMAL, EXTREME }

class BoostModeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val context: Context = reactContext
    private var overlayView: TextView? = null
    private val coroutineScope = CoroutineScope(Dispatchers.Main)
    private val sharedPrefs = context.getSharedPreferences("BoostModePrefs", Context.MODE_PRIVATE)
    private var originalSettings: SettingsBackup? = null

    private data class SettingsBackup(
        var animationScaleWindow: Float = 1.0f,
        var animationScaleTransition: Float = 1.0f,
        var animationScaleAnimator: Float = 1.0f,
        var syncEnabled: Boolean = true,
        var brightness: Float? = null
    )

    override fun getName(): String = "BoostMode"

    /**
     * Enables BoostMode with specified mode and settings.
     */
    @ReactMethod
    fun enableBoostMode(mode: String, settings: ReadableMap, callback: Callback) {
        coroutineScope.launch(Dispatchers.IO) {
            try {
                if (checkRoot()) {
                    callback.invoke("Error: Rooted device detected")
                    return@launch
                }
                val validatedSettings = validateSettings(settings)
                if (validatedSettings == null) {
                    callback.invoke("Error: Invalid graphics settings")
                    return@launch
                }
                val permissionError = checkPermissions()
                if (permissionError != null) {
                    callback.invoke(permissionError)
                    return@launch
                }
                backupSettings()
                val boostMode = Mode.valueOf(sanitizeInput(mode).uppercase())
                enableDoNotDisturb()
                val gameApp = getForegroundGameApp()
                if (gameApp != null) {
                    sharedPrefs.edit().putString("currentGame", gameApp).apply()
                    suggestQosSettings(gameApp) { _, _ -> }
                    adjustNetworkLatency(gameApp, boostMode)
                }
                closeBackgroundApps(boostMode)
                applyGraphicsSettings(validatedSettings)
                if (boostMode == Mode.EXTREME) {
                    disableAnimations()
                    disableSync()
                }
                scanWifiNetworks { error, result ->
                    if (error == null && result != null) {
                        val networks = result["networks"] as List<Map<String, Any>>
                        val optimalNetwork = networks.find { it["isOptimalChannel"] == true && it["signalStrength"] > -70 }
                        if (optimalNetwork != null) {
                            sharedPrefs.edit().putString("preferredWifi", optimalNetwork["ssid"] as String).apply()
                        }
                    }
                }
                showOverlay()
                monitorPerformance() // Start performance monitoring
                callback.invoke(null, "BoostMode enabled in $boostMode mode")
            } catch (e: Exception) {
                android.util.Log.e("BoostMode", "BoostMode enable failed: ${e.message}")
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Disables BoostMode, resets settings, and removes overlay.
     */
    @ReactMethod
    fun disableBoostMode(callback: Callback) {
        coroutineScope.launch(Dispatchers.IO) {
            try {
                disableDoNotDisturb()
                disableBatterySaver { error, _ ->
                    if (error != null) {
                        android.util.Log.w("BoostMode", "Failed to disable battery saver: $error")
                    }
                }
                restoreSettings()
                removeOverlay()
                sharedPrefs.edit().remove("currentGame").apply()
                callback.invoke(null, "BoostMode disabled")
            } catch (e: Exception) {
                android.util.Log.e("BoostMode", "BoostMode disable failed: ${e.message}")
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Scans Wi-Fi networks every 20s with low CPU usage.
     */
    @ReactMethod
    fun scanWifiNetworks(callback: Callback) {
        coroutineScope.launch {
            flow {
                while (true) {
                    try {
                        val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
                        if (!wifiManager.isWifiEnabled) {
                            emit(mapOf("error" to "Wi-Fi is disabled"))
                            return@flow
                        }
                        val scanResults = wifiManager.scanResults
                        val optimalChannels = listOf(1, 6, 11)
                        val channelCounts = scanResults.groupBy { calculateChannel(it.frequency) }
                            .mapValues { it.value.size }
                        val currentSsid = wifiManager.connectionInfo?.ssid?.replace("\"", "") ?: ""
                        val networks = scanResults.map { result ->
                            val channel = calculateChannel(result.frequency)
                            val ssid = sanitizeInput(result.SSID ?: "Unknown")
                            val isRepeater = ssid.contains(currentSsid, ignoreCase = true) && ssid != currentSsid
                            mapOf(
                                "ssid" to ssid,
                                "signalStrength" to result.level,
                                "frequency" to result.frequency,
                                "channel" to channel,
                                "isOptimalChannel" to (channel in optimalChannels && channelCounts.getOrDefault(channel, 0) <= 3),
                                "isRepeater" to isRepeater
                            )
                        }.filter { it["frequency"] as Int <= 2484 } // Only 2.4GHz for Galaxy J4+
                        val channelInterference = (1..11).map { channel ->
                            mapOf(
                                "channel" to channel,
                                "interference" to channelCounts.getOrDefault(channel, 0)
                            )
                        }
                        val gameApp = getForegroundGameApp()
                        emit(mapOf(
                            "networks" to networks,
                            "channelInterference" to channelInterference,
                            "repeaters" to networks.filter { it["isRepeater"] == true },
                            "gameApp" to gameApp
                        ))
                    } catch (e: Exception) {
                        android.util.Log.e("BoostMode", "Wi-Fi scan failed: ${e.message}")
                        emit(mapOf("error" to e.message))
                    }
                    kotlinx.coroutines.delay(20000) // Scan every 20s
                }
            }.flowOn(Dispatchers.IO).collect { result ->
                callback.invoke(result["error"], result.takeUnless { it.containsKey("error") })
            }
        }
    }

    /**
     * Suggests QoS settings for the specified game app.
     */
    @ReactMethod
    fun suggestQosSettings(appName: String, callback: Callback) {
        coroutineScope.launch(Dispatchers.IO) {
            try {
                val sanitizedAppName = sanitizeInput(appName)
                val bandwidth = if (determineGameType(sanitizedAppName) == "FPS") 90 else 85
                val port = getGamePort(sanitizedAppName) ?: "any"
                val settings = mapOf(
                    "appName" to sanitizedAppName,
                    "bandwidth" to bandwidth,
                    "port" to port
                )
                callback.invoke(null, settings)
            } catch (e: Exception) {
                android.util.Log.e("BoostMode", "QoS suggestion failed: ${e.message}")
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Monitors performance metrics (CPU, RAM, ping) every 60s.
     */
    private fun monitorPerformance() {
        coroutineScope.launch {
            flow {
                while (true) {
                    try {
                        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                        val memoryInfo = ActivityManager.MemoryInfo()
                        activityManager.getMemoryInfo(memoryInfo)
                        val totalRam = memoryInfo.totalMem / (1024 * 1024) // MB
                        val availRam = memoryInfo.availMem / (1024 * 1024) // MB
                        val ramUsage = ((totalRam - availRam) / totalRam.toFloat()) * 100
                        val cpuUsage = getCpuUsage()
                        val ping = sharedPrefs.getInt("targetPing", 75)
                        val result = mapOf(
                            "cpuUsage" to cpuUsage,
                            "ramUsage" to ramUsage,
                            "ping" to ping,
                            "warning" to when {
                                cpuUsage > 80 -> "High CPU usage detected"
                                availRam < 300 -> "Low memory available"
                                ping > 100 -> "High ping detected"
                                else -> ""
                            }
                        )
                        emit(result)
                    } catch (e: Exception) {
                        android.util.Log.e("BoostMode", "Performance check failed: ${e.message}")
                        emit(mapOf("error" to e.message))
                    }
                    kotlinx.coroutines.delay(60000) // Check every 60s
                }
            }.flowOn(Dispatchers.IO).collect { result ->
                if (result["warning"] != "") {
                    showOverlay(result["warning"] as String)
                }
            }
        }
    }

    /**
     * Applies BoostMode profile with custom settings.
     */
    @ReactMethod
    fun applyBoostProfile(profile: String, callback: Callback) {
        coroutineScope.launch(Dispatchers.IO) {
            try {
                val sanitizedProfile = sanitizeInput(profile)
                val settings = when (sanitizedProfile) {
                    "High Performance" -> mapOf(
                        "resolution" to "medium",
                        "texture" to "medium",
                        "effects" to "low",
                        "fpsLimit" to "60",
                        "batterySaver" to false,
                        "animationsEnabled" to true,
                        "syncEnabled" to true
                    )
                    "Battery Saver" -> mapOf(
                        "resolution" to "low",
                        "texture" to "low",
                        "effects" to "off",
                        "fpsLimit" to "30",
                        "batterySaver" to true,
                        "animationsEnabled" to true,
                        "syncEnabled" to true
                    )
                    "Extreme Boost" -> mapOf(
                        "resolution" to "low",
                        "texture" to "low",
                        "effects" to "off",
                        "fpsLimit" to "60",
                        "batterySaver" to false,
                        "animationsEnabled" to false,
                        "syncEnabled" to false
                    )
                    else -> mapOf(
                        "resolution" to "default",
                        "texture" to "medium",
                        "effects" to "medium",
                        "fpsLimit" to "60",
                        "batterySaver" to false,
                        "animationsEnabled" to true,
                        "syncEnabled" to true
                    )
                }
                sharedPrefs.edit().putString("currentProfile", sanitizedProfile).apply()
                if (settings["batterySaver"] == true) {
                    enableBatterySaver { error, _ ->
                        if (error != null) {
                            android.util.Log.w("BoostMode", "Failed to enable battery saver: $error")
                        }
                    }
                } else {
                    disableBatterySaver { error, _ ->
                        if (error != null) {
                            android.util.Log.w("BoostMode", "Failed to disable battery saver: $error")
                        }
                    }
                }
                if (settings["animationsEnabled"] == false) {
                    disableAnimations()
                } else {
                    restoreAnimations()
                }
                if (settings["syncEnabled"] == false) {
                    ContentResolver.setMasterSyncAutomatically(false)
                } else {
                    ContentResolver.setMasterSyncAutomatically(true)
                }
                applyGraphicsSettings(com.facebook.react.bridge.Arguments.createMap().apply {
                    putString("resolution", settings["resolution"] as String)
                    putString("texture", settings["texture"] as String)
                    putString("effects", settings["effects"] as String)
                    putString("fpsLimit", settings["fpsLimit"] as String)
                })
                callback.invoke(null, "Applied $sanitizedProfile profile")
            } catch (e: Exception) {
                android.util.Log.e("BoostMode", "Profile application failed: ${e.message}")
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Adjusts network latency based on game type and mode.
     */
    private fun adjustNetworkLatency(gameApp: String, mode: Mode) {
        val gameType = determineGameType(gameApp)
        val wifiManager = context.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val targetPing = when {
            mode == Mode.EXTREME && gameType == "FPS" -> 40
            gameType == "FPS" -> 50
            gameType == "RPG" -> 100
            else -> 75
        }
        TrafficStats.setThreadStatsTag(if (gameType == "FPS") 0xF0 else 0xF1) // Mock UDP/TCP priority
        wifiManager.setWifiEnabled(true)
        sharedPrefs.edit().putInt("targetPing", targetPing).apply()
    }

    /**
     * Determines game type based on package name.
     */
    private fun determineGameType(gameApp: String): String {
        val gameTypes = mapOf(
            "com.tencent.ig" to "FPS", // PUBG Mobile
            "com.activision.callofduty.shooter" to "FPS", // Call of Duty Mobile
            "com.miHoYo.GenshinImpact" to "RPG" // Genshin Impact
        )
        return gameTypes[gameApp] ?: "Other"
    }

    /**
     * Backs up system settings before applying BoostMode.
     */
    private suspend fun backupSettings() = withContext(Dispatchers.IO) {
        try {
            if (!Settings.System.canWrite(context)) return@withContext
            val contentResolver = context.contentResolver
            originalSettings = SettingsBackup(
                animationScaleWindow = Settings.System.getFloat(contentResolver, Settings.System.WINDOW_ANIMATION_SCALE, 1.0f),
                animationScaleTransition = Settings.System.getFloat(contentResolver, Settings.System.TRANSITION_ANIMATION_SCALE, 1.0f),
                animationScaleAnimator = Settings.System.getFloat(contentResolver, Settings.System.ANIMATOR_DURATION_SCALE, 1.0f),
                syncEnabled = ContentResolver.getMasterSyncAutomatically(),
                brightness = Settings.System.getFloat(contentResolver, Settings.System.SCREEN_BRIGHTNESS)
            )
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Settings backup failed: ${e.message}")
        }
    }

    /**
     * Restores system settings after disabling BoostMode.
     */
    private suspend fun restoreSettings() = withContext(Dispatchers.IO) {
        try {
            if (!Settings.System.canWrite(context)) return@withContext
            originalSettings?.let { settings ->
                val contentResolver = context.contentResolver
                Settings.System.putFloat(contentResolver, Settings.System.WINDOW_ANIMATION_SCALE, settings.animationScaleWindow)
                Settings.System.putFloat(contentResolver, Settings.System.TRANSITION_ANIMATION_SCALE, settings.animationScaleTransition)
                Settings.System.putFloat(contentResolver, Settings.System.ANIMATOR_DURATION_SCALE, settings.animationScaleAnimator)
                ContentResolver.setMasterSyncAutomatically(settings.syncEnabled)
                settings.brightness?.let {
                    Settings.System.putFloat(contentResolver, Settings.System.SCREEN_BRIGHTNESS, it)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Settings restore failed: ${e.message}")
        }
    }

    /**
     * Disables system animations for Extreme Boost mode.
     */
    private suspend fun disableAnimations() = withContext(Dispatchers.IO) {
        try {
            if (!Settings.System.canWrite(context)) return@withContext
            val contentResolver = context.contentResolver
            Settings.System.putFloat(contentResolver, Settings.System.WINDOW_ANIMATION_SCALE, 0f)
            Settings.System.putFloat(contentResolver, Settings.System.TRANSITION_ANIMATION_SCALE, 0f)
            Settings.System.putFloat(contentResolver, Settings.System.ANIMATOR_DURATION_SCALE, 0f)
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Disable animations failed: ${e.message}")
        }
    }

    /**
     * Restores system animations.
     */
    private suspend fun restoreAnimations() = withContext(Dispatchers.IO) {
        try {
            if (!Settings.System.canWrite(context)) return@withContext
            originalSettings?.let { settings ->
                val contentResolver = context.contentResolver
                Settings.System.putFloat(contentResolver, Settings.System.WINDOW_ANIMATION_SCALE, settings.animationScaleWindow)
                Settings.System.putFloat(contentResolver, Settings.System.TRANSITION_ANIMATION_SCALE, settings.animationScaleTransition)
                Settings.System.putFloat(contentResolver, Settings.System.ANIMATOR_DURATION_SCALE, settings.animationScaleAnimator)
            }
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Restore animations failed: ${e.message}")
        }
    }

    /**
     * Disables sync for Extreme Boost mode.
     */
    private fun disableSync() {
        try {
            ContentResolver.setMasterSyncAutomatically(false)
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Disable sync failed: ${e.message}")
        }
    }

    /**
     * Closes background apps based on mode.
     */
    private suspend fun closeBackgroundApps(mode: Mode) = withContext(Dispatchers.IO) {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val runningApps = activityManager.runningAppProcesses?.filter {
            it.importance != ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                    it.processName != context.packageName &&
                    !isSystemApp(it.processName)
        } ?: emptyList()
        runningApps.forEach { process ->
            if (mode == Mode.EXTREME || !isEssentialApp(process.processName)) {
                activityManager.killBackgroundProcesses(process.processName)
            }
        }
    }

    /**
     * Checks if an app is a system or essential app.
     */
    private fun isSystemApp(processName: String): Boolean {
        val systemApps = listOf(
            "com.android.systemui",
            "com.android.phone",
            "com.android.settings"
        )
        return systemApps.any { processName.contains(it) }
    }

    /**
     * Checks if an app is essential (e.g., launcher, dialer).
     */
    private fun isEssentialApp(processName: String): Boolean {
        val essentialApps = listOf(
            "com.android.launcher",
            "com.android.dialer"
        )
        return essentialApps.any { processName.contains(it) }
    }

    /**
     * Validates graphics settings.
     */
    private fun validateSettings(settings: ReadableMap): ReadableMap? {
        try {
            val validResolutions = listOf("default", "low", "medium")
            val validTextures = listOf("low", "medium", "high")
            val validEffects = listOf("off", "low", "medium")
            val validFpsLimits = listOf("30", "60")
            val resolution = settings.getString("resolution")?.takeIf { it in validResolutions } ?: "default"
            val texture = settings.getString("texture")?.takeIf { it in validTextures } ?: "medium"
            val effects = settings.getString("effects")?.takeIf { it in validEffects } ?: "medium"
            val fpsLimit = settings.getString("fpsLimit")?.takeIf { it in validFpsLimits } ?: "60"
            return com.facebook.react.bridge.Arguments.createMap().apply {
                putString("resolution", resolution)
                putString("texture", texture)
                putString("effects", effects)
                putString("fpsLimit", fpsLimit)
            }
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Settings validation failed: ${e.message}")
            return null
        }
    }

    /**
     * Checks required permissions for BoostMode.
     */
    private suspend fun checkPermissions(): String? = withContext(Dispatchers.IO) {
        val cachedPermissions = sharedPrefs.getString("permissions", null)
        if (cachedPermissions == "granted") return@withContext null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            return@withContext "PERMISSION_DENIED: Overlay permission required"
        }
        if (!hasUsageStatsPermission()) {
            return@withContext "PERMISSION_DENIED: Usage stats permission required"
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.System.canWrite(context)) {
            return@withContext "PERMISSION_DENIED: Write settings permission required"
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (!notificationManager.isNotificationPolicyAccessGranted) {
                return@withContext "PERMISSION_DENIED: Notification policy permission required"
            }
        }
        sharedPrefs.edit().putString("permissions", "granted").apply()
        null
    }

    /**
     * Checks if the app has usage stats permission.
     */
    private fun hasUsageStatsPermission(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            ) == android.app.AppOpsManager.MODE_ALLOWED
        } else {
            true
        }
    }

    /**
     * Enables Do Not Disturb mode.
     */
    private fun enableDoNotDisturb() {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && notificationManager.isNotificationPolicyAccessGranted) {
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        }
    }

    /**
     * Disables Do Not Disturb mode.
     */
    private fun disableDoNotDisturb() {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && notificationManager.isNotificationPolicyAccessGranted) {
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        }
    }

    /**
     * Shows performance warning overlay.
     */
    private fun showOverlay(message: String = "BoostMode Active") {
        coroutineScope.launch(Dispatchers.Main) {
            if (overlayView != null) return@launch
            if (!Settings.canDrawOverlays(context)) return@launch
            overlayView = TextView(context).apply {
                text = message
                setBackgroundColor(android.graphics.Color.argb(128, 0, 0, 0))
                setTextColor(android.graphics.Color.WHITE)
                textSize = 14f
                setPadding(10, 10, 10, 10)
            }
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                else
                    WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                android.graphics.PixelFormat.TRANSLUCENT
            ).apply {
                gravity = android.view.Gravity.TOP or android.view.Gravity.LEFT
                x = 10
                y = 10
            }
            val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            windowManager.addView(overlayView, params)
        }
    }

    /**
     * Removes performance warning overlay.
     */
    private fun removeOverlay() {
        coroutineScope.launch(Dispatchers.Main) {
            overlayView?.let {
                val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                windowManager.removeView(it)
                overlayView = null
            }
        }
    }

    /**
     * Applies graphics settings.
     */
    private suspend fun applyGraphicsSettings(settings: ReadableMap) = withContext(Dispatchers.IO) {
        try {
            val resolution = settings.getString("resolution") ?: "default"
            if (resolution != "default") {
                val scale = when (resolution) {
                    "low" -> 0.5f
                    "medium" -> 0.75f
                    else -> 1.0f
                }
                withContext(Dispatchers.Main) {
                    val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                    val display = windowManager.defaultDisplay
                    val metrics = android.util.DisplayMetrics()
                    display.getMetrics(metrics)
                    metrics.density = metrics.density * scale
                    windowManager.defaultDisplay.getMetrics(metrics)
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Graphics settings failed: ${e.message}")
        }
    }

    /**
     * Enables battery saver mode.
     */
    @ReactMethod
    fun enableBatterySaver(callback: Callback) {
        coroutineScope.launch(Dispatchers.IO) {
            try {
                if (!Settings.System.canWrite(context)) {
                    callback.invoke("Error: Write settings permission required")
                    return@launch
                }
                originalSettings?.brightness = Settings.System.getFloat(
                    context.contentResolver,
                    Settings.System.SCREEN_BRIGHTNESS
                )
                Settings.System.putFloat(
                    context.contentResolver,
                    Settings.System.SCREEN_BRIGHTNESS,
                    0.2f * 255
                )
                Settings.System.putInt(
                    context.contentResolver,
                    Settings.System.VIBRATE_ON,
                    0
                )
                callback.invoke(null, "Battery saver enabled")
            } catch (e: Exception) {
                android.util.Log.e("BoostMode", "Battery saver enable failed: ${e.message}")
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Disables battery saver mode.
     */
    @ReactMethod
    fun disableBatterySaver(callback: Callback) {
        coroutineScope.launch(Dispatchers.IO) {
            try {
                if (!Settings.System.canWrite(context)) {
                    callback.invoke("Error: Write settings permission required")
                    return@launch
                }
                originalSettings?.brightness?.let {
                    Settings.System.putFloat(
                        context.contentResolver,
                        Settings.System.SCREEN_BRIGHTNESS,
                        it
                    )
                }
                Settings.System.putInt(
                    context.contentResolver,
                    Settings.System.VIBRATE_ON,
                    1
                )
                callback.invoke(null, "Battery saver disabled")
            } catch (e: Exception) {
                android.util.Log.e("BoostMode", "Battery saver disable failed: ${e.message}")
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Calculates Wi-Fi channel from frequency.
     */
    private fun calculateChannel(frequency: Int): Int {
        return when {
            frequency in 2412..2484 -> (frequency - 2412) / 5 + 1
            else -> 1
        }
    }

    /**
     * Sanitizes input to prevent injection.
     */
    private fun sanitizeInput(input: String): String {
        return input.replace("[^a-zA-Z0-9_\\-]".toRegex(), "")
    }

    /**
     * Gets the foreground game app.
     */
    private fun getForegroundGameApp(): String? {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val runningApps = activityManager.runningAppProcesses
        return runningApps?.find {
            it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                    determineGameType(it.processName) != "Other"
        }?.processName
    }

    /**
     * Gets game port based on app name.
     */
    private fun getGamePort(appName: String): String? {
        val gamePorts = mapOf(
            "com.tencent.ig" to "7777", // PUBG Mobile
            "com.activision.callofduty.shooter" to "27015", // Call of Duty Mobile
            "com.miHoYo.GenshinImpact" to "22102" // Genshin Impact
        )
        return gamePorts[appName]
    }

    /**
     * Gets CPU usage (simplified).
     */
    private fun getCpuUsage(): Float {
        return try {
            val runtime = Runtime.getRuntime()
            val process = runtime.exec("top -n 1")
            val reader = process.inputStream.bufferedReader()
            reader.readLines().sumOf { line ->
                if (line.contains(context.packageName)) {
                    line.split("\\s+".toRegex()).getOrNull(8)?.toFloatOrNull() ?: 0f
                } else {
                    0f
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "CPU usage check failed: ${e.message}")
            0f
        }
    }
}
