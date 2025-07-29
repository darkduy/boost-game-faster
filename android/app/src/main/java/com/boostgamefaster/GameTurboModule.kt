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
import com.facebook.react.modules.core.DeviceEventManagerModule

class GameTurboModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val context: Context = reactContext
    private var overlayView: TextView? = null

    override fun getName(): String {
        return "GameTurbo"
    }

    @ReactMethod
    fun enableGameTurbo(callback: Callback) {
        try {
            // Check permissions
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                callback.invoke("PERMISSION_DENIED: Overlay permission required")
                return
            }
            if (!hasUsageStatsPermission()) {
                callback.invoke("PERMISSION_DENIED: Usage stats permission required")
                return
            }

            // Enable Do Not Disturb
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !notificationManager.isNotificationPolicyAccessGranted) {
                callback.invoke("PERMISSION_DENIED: Notification policy permission required")
                return
            }
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE)

            // Close background apps
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val runningApps = activityManager.runningAppProcesses ?: emptyList()
            for (process in runningApps) {
                if (process.importance != ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                    activityManager.killBackgroundProcesses(process.processName)
                }
            }

            // Show FPS/Ping overlay
            showOverlay()

            callback.invoke(null, "Game Turbo enabled")
        } catch (e: Exception) {
            callback.invoke("Error: ${e.message}")
        }
    }

    @ReactMethod
    fun disableGameTurbo(callback: Callback) {
        try {
            // Disable Do Not Disturb
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)

            // Remove FPS/Ping overlay
            removeOverlay()

            callback.invoke(null, "Game Turbo disabled")
        } catch (e: Exception) {
            callback.invoke("Error: ${e.message}")
        }
    }

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

        // Simulate FPS/Ping updates (replace with actual logic if available)
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

    private fun removeOverlay() {
        overlayView?.let {
            val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            windowManager.removeView(it)
            overlayView = null
        }
    }
}
