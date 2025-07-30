package com.boostgamefaster

import android.app.ActivityManager
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import android.widget.TextView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReadableMap

class BoostModeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val context: Context = reactContext
    private var overlayView: TextView? = null

    override fun getName(): String = "BoostMode"

    /**
     * Enables BoostMode with custom graphics settings, Do Not Disturb, and FPS/ping overlay.
     * @param settings Graphics settings (resolution, texture, effects, fpsLimit)
     * @param callback Callback to return success or error
     */
    @ReactMethod
    fun enableBoostMode(settings: ReadableMap, callback: Callback) {
        try {
            // Check all required permissions
            val permissionError = checkPermissions()
            if (permissionError != null) {
                callback.invoke(permissionError)
                return
            }

            // Enable Do Not Disturb
            enableDoNotDisturb()

            // Close background apps
            closeBackgroundApps()

            // Apply graphics settings
            applyGraphicsSettings(settings)

            // Show FPS/Ping overlay
            showOverlay()

            callback.invoke(null, "BoostMode enabled with custom graphics settings")
        } catch (e: Exception) {
            callback.invoke("Error: ${e.message}")
        }
    }

    /**
     * Disables BoostMode, resets Do Not Disturb, removes overlay, and resets graphics settings.
     * @param callback Callback to return success or error
     */
    @ReactMethod
    fun disableBoostMode(callback: Callback) {
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

    /**
     * Checks required permissions for BoostMode.
     * @return Error message if any permission is missing, null otherwise
     */
    private fun checkPermissions(): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            return "PERMISSION_DENIED: Overlay permission required"
        }
        if (!hasUsageStatsPermission()) {
            return "PERMISSION_DENIED: Usage stats permission required"
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.System.canWrite(context)) {
            return "PERMISSION_DENIED: Write settings permission required"
        }
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !notificationManager.isNotificationPolicyAccessGranted) {
            return "PERMISSION_DENIED: Notification policy permission required"
        }
        return null
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
        notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)
    }

    /**
     * Disables Do Not Disturb mode to restore notifications.
     */
    private fun disableDoNotDisturb() {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
    }

    /**
     * Closes non-foreground apps to free up resources.
     */
    private fun closeBackgroundApps() {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val runningApps = activityManager.runningAppProcesses ?: emptyList()
        for (process in runningApps) {
            if (process.importance != ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                activityManager.killBackgroundProcesses(process.processName)
            }
        }
    }

    /**
     * Applies graphics settings (resolution, texture, effects, FPS limit).
     * @param settings ReadableMap containing graphics settings
     */
    private fun applyGraphicsSettings(settings: ReadableMap) {
        try {
            // Adjust screen resolution (simulated for Android 9)
            val resolution = settings.getString("resolution") ?: "default"
            if (resolution != "default") {
                val scale = when (resolution) {
                    "low" -> 0.5f // 480p
                    "medium" -> 0.75f // 720p
                    else -> 1.0f
                }
                val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
                val display = windowManager.defaultDisplay
                val metrics = android.util.DisplayMetrics()
                display.getMetrics(metrics)
                metrics.density = metrics.density * scale
                windowManager.defaultDisplay.getMetrics(metrics)
            }

            // Store texture, effects, and FPS settings
            val texture = settings.getString("texture") ?: "medium"
            val effects = settings.getString("effects") ?: "medium"
            val fpsLimit = settings.getString("fpsLimit") ?: "60"
            val sharedPrefs = context.getSharedPreferences("BoostModePrefs", Context.MODE_PRIVATE)
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
    private fun resetGraphicsSettings() {
        try {
            // Reset resolution to default
            val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val display = windowManager.defaultDisplay
            val metrics = android.util.DisplayMetrics()
            display.getRealMetrics(metrics)
            windowManager.defaultDisplay.getMetrics(metrics)

            // Clear stored graphics settings
            val sharedPrefs = context.getSharedPreferences("BoostModePrefs", Context.MODE_PRIVATE)
            sharedPrefs.edit().clear().apply()
        } catch (e: Exception) {
            android.util.Log.e("BoostMode", "Failed to reset graphics settings: ${e.message}")
        }
    }

    /**
     * Shows FPS and ping overlay on screen.
     */
    private fun showOverlay() {
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
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            android.graphics.PixelFormat.TRANSLUCENT
        ).apply {
            x = 0
            y = 0
        }

        windowManager.addView(overlayView, params)

        // Simulate FPS/Ping updates
        Thread {
            var fps = 0
            while (overlayView != null) {
                fps = (fps + 1) % 60
                val ping = (Math.random() * 100).toInt()
                reactApplicationContext.runOnUiQueueThread {
                    overlayView?.text = "FPS: $fps | Ping: ${ping}ms"
                }
                Thread.sleep(1000)
            }
        }.start()
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
