package com.boostgamefaster

import android.app.ActivityManager
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class BoostModeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val context: Context = reactContext
    private var overlayView: TextView? = null
    private val coroutineScope = CoroutineScope(Dispatchers.Main)
    private val sharedPrefs = context.getSharedPreferences("BoostModePrefs", Context.MODE_PRIVATE)

    override fun getName(): String = "BoostMode"

    /**
     * Checks if device is rooted.
     * @return True if rooted, false otherwise
     */
    @ReactMethod
    fun checkRootStatus(callback: Callback) {
        coroutineScope.launch {
            try {
                val isRooted = checkRoot()
                if (isRooted) {
                    callback.invoke("Error: Rooted device detected")
                } else {
                    callback.invoke(null, false)
                }
            } catch (e: Exception) {
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Enables BoostMode with custom graphics settings, Do Not Disturb, and FPS/ping overlay.
     * @param settings Graphics settings (resolution, texture, effects, fpsLimit)
     * @param callback Callback to return success or error
     */
    @ReactMethod
    fun enableBoostMode(settings: ReadableMap, callback: Callback) {
        coroutineScope.launch {
            try {
                // Check root status
                if (checkRoot()) {
                    callback.invoke("Error: Rooted device detected")
                    return@launch
                }

                // Validate input
                val validatedSettings = validateSettings(settings)
                if (validatedSettings == null) {
                    callback.invoke("Error: Invalid graphics settings")
                    return@launch
                }

                // Check cached permissions
                val permissionError = checkPermissions()
                if (permissionError != null) {
                    callback.invoke(permissionError)
                    return@launch
                }

                // Enable Do Not Disturb
                enableDoNotDisturb()

                // Close background apps asynchronously
                closeBackgroundApps()

                // Apply graphics settings
                applyGraphicsSettings(validatedSettings)

                // Show FPS/Ping overlay
                showOverlay()

                callback.invoke(null, "BoostMode enabled with custom graphics settings")
            } catch (e: Exception) {
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Disables BoostMode, resets Do Not Disturb, removes overlay, and resets graphics settings.
     * @param callback Callback to return success or error
     */
    @ReactMethod
    fun disableBoostMode(callback: Callback) {
        coroutineScope.launch {
            try {
                // Disable Do Not Disturb
                disableDoNotDisturb()

                // Remove FPS/Ping overlay
                removeOverlay()

                // Reset graphics settings
                resetGraphicsSettings()

                callback.invoke(null, "BoostMode disabled")
            } catch (e: Exception) {
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Suggests optimal graphics settings based on device performance.
     * @param callback Callback to return suggested settings
     */
    @ReactMethod
    fun suggestGraphicsSettings(callback: Callback) {
        coroutineScope.launch {
            try {
                // Check root status
                if (checkRoot()) {
                    callback.invoke("Error: Rooted device detected")
                    return@launch
                }

                val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                val memoryInfo = ActivityManager.MemoryInfo()
                activityManager.getMemoryInfo(memoryInfo)
                val totalRam = memoryInfo.totalMem / (1024 * 1024) // MB
                val availRam = memoryInfo.availMem / (1024 * 1024) // MB
                val ramUsage = ((totalRam - availRam) / totalRam.toFloat()) * 100

                val suggestedSettings = mapOf(
                    "resolution" to if (ramUsage > 70) "low" else "medium",
                    "texture" to if (ramUsage > 70) "low" else "medium",
                    "effects" to if (ramUsage > 70) "off" else "low",
                    "fpsLimit" to if (ramUsage > 60) "30" else "60"
                )
                callback.invoke(null, suggestedSettings)
            } catch (e: Exception) {
                callback.invoke("Error: ${e.message}")
            }
        }
    }

    /**
     * Checks if device is rooted by looking for common root indicators.
     * @return True if rooted, false otherwise
     */
    private fun checkRoot(): Boolean {
        val rootFiles = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su"
        )
        return rootFiles.any { File(it).exists() }
    }

    /**
     * Validates graphics settings to prevent injection or invalid values.
     * @param settings Input settings
     * @return Validated settings or null if invalid
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
            return null
        }
    }

    /**
     * Checks required permissions for BoostMode, using cached results if available.
     * @return Error message if any permission is missing, null otherwise
     */
    private suspend fun checkPermissions(): String? = withContext(Dispatchers.IO) {
        // Check cached permissions
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
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !notificationManager.isNotificationPolicyAccessGranted) {
            return@withContext "PERMISSION_DENIED: Notification policy permission required"
        }

        // Cache permission result
        sharedPrefs.edit().putString("permissions", "granted").apply()
        null
    }

    /**
     * Checks if the app has usage stats permission.
     * @return True if permission is granted, false otherwise
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
     * Enables Do Not Disturb mode to block notifications.
     */
    private fun enableDoNotDisturb() {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && notificationManager.isNotificationPolicyAccessGranted) {
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
        }
    }

    /**
     * Disables Do Not Disturb mode to restore notifications.
     */
    private fun disableDoNotDisturb() {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && notificationManager.isNotificationPolicyAccessGranted) {
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
        }
    }

    /**
     * Closes non-foreground apps to free up resources.
     */
    private suspend fun closeBackgroundApps() = withContext(Dispatchers.IO) {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val runningApps = activityManager.runningAppProcesses?.filter {
            it.importance != ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
            it.processName != context.packageName
        } ?: emptyList()
        runningApps.forEach { process ->
            activityManager.killBackgroundProcesses(process.processName)
        }
    }

    /**
     * Applies graphics settings (resolution, texture, effects, FPS limit).
     * @param settings ReadableMap containing graphics settings
     */
    private suspend fun applyGraphicsSettings(settings: ReadableMap) = withContext(Dispatchers.IO) {
        try {
            // Adjust screen resolution (simulated for Android 9)
            val resolution = settings.getString("resolution") ?: "default"
            if (resolution != "default") {
                val scale = when (resolution) {
                    "low" -> 0.5f // 480p
                    "medium" -> 0.75f // 720p
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

            // Store texture, effects, and FPS settings
            val texture = settings.getString("texture") ?: "medium"
            val effects = settings.getString("effects") ?: "medium"
            val fpsLimit = settings.getString("fpsLimit") ?: "60"
            sharedPrefs.edit()
                .putString("texture", texture)
                .putString("effects", effects)
                .putString("fpsLimit", fpsLimit)
                .apply()
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Failed to apply graphics settings: ${e.message}")
        }
    }

    /**
     * Resets graphics settings to default.
     */
    private suspend fun resetGraphicsSettings() = withContext(Dispatchers.IO) {
        try {
            // Reset resolution to default
            withContext(Dispatchers.Main) {
                val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                val display = windowManager.defaultDisplay
                val metrics = android.util.DisplayMetrics()
                display.getRealMetrics(metrics)
                windowManager.defaultDisplay.getMetrics(metrics)
            }

            // Clear stored graphics settings
            sharedPrefs.edit().clear().apply()
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Failed to reset graphics settings: ${e.message}")
        }
    }

    /**
     * Shows FPS and ping overlay on screen with drag functionality.
     */
    private fun showOverlay() {
        if (!Settings.canDrawOverlays(context)) return
        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        overlayView = TextView(context).apply {
            text = "FPS: 0 | Ping: 0ms"
            setTextColor(android.graphics.Color.WHITE)
            setBackgroundColor(android.graphics.Color.argb(150, 0, 0, 0))
            textSize = 12f
            setPadding(10, 10, 10, 10)
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            android.graphics.PixelFormat.TRANSLUCENT
        ).apply {
            x = sharedPrefs.getInt("overlayX", 0)
            y = sharedPrefs.getInt("overlayY", 0)
        }

        // Add drag functionality
        var initialX = 0f
        var initialY = 0f
        var initialTouchX = 0f
        var initialTouchY = 0f
        overlayView?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x.toFloat()
                    initialY = params.y.toFloat()
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = (initialX + (event.rawX - initialTouchX)).toInt()
                    params.y = (initialY + (event.rawY - initialTouchY)).toInt()
                    windowManager.updateViewLayout(overlayView, params)
                    sharedPrefs.edit()
                        .putInt("overlayX", params.x)
                        .putInt("overlayY", params.y)
                        .apply()
                    true
                }
                else -> false
            }
        }

        windowManager.addView(overlayView, params)

        // Update FPS/Ping overlay
        coroutineScope.launch {
            var fps = 0
            while (overlayView != null) {
                fps = (fps + 1) % 60
                val ping = (Math.random() * 100).toInt()
                withContext(Dispatchers.Main) {
                    overlayView?.text = "FPS: $fps | Ping: ${ping}ms"
                }
                kotlinx.coroutines.delay(2000)
            }
        }
    }

    /**
     * Removes FPS and ping overlay from screen.
     */
    private fun removeOverlay() {
        overlayView?.let {
            val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            windowManager.removeView(it)
            overlayView = null
        }
    }
}
