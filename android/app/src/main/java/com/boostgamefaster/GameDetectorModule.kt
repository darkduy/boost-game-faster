package com.boostgamefaster

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap
import java.io.InputStreamReader

class GameDetectorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val gameCache = ConcurrentHashMap<String, WritableMap>()
    private val scope = CoroutineScope(Dispatchers.IO)
    private val popularGames: Set<String> by lazy { loadPopularGames() }

    override fun getName(): String = "GameDetector"

    private fun loadPopularGames(): Set<String> {
        return try {
            val inputStream = reactApplicationContext.assets.open("popular_games.json")
            val reader = InputStreamReader(inputStream)
            val json = reader.readText()
            reader.close()
            val jsonArray = org.json.JSONArray(json)
            val games = mutableSetOf<String>()
            for (i in 0 until jsonArray.length()) {
                games.add(jsonArray.getJSONObject(i).getString("packageName"))
            }
            games
        } catch (e: Exception) {
            emptySet()
        }
    }

    @ReactMethod
    fun getInstalledGames(promise: Promise) {
        if (gameCache.isNotEmpty()) {
            val gameList = WritableNativeArray()
            gameCache.values.forEach { gameList.pushMap(it) }
            promise.resolve(gameList)
            return
        }

        scope.launch {
            try {
                val pm = reactApplicationContext.packageManager
                val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA or PackageManager.GET_PERMISSIONS)
                val gameList = WritableNativeArray()

                for (app in packages) {
                    if (isGameApp(app, pm)) {
                        val gameInfo = WritableNativeMap().apply {
                            putString("name", pm.getApplicationLabel(app).toString())
                            putString("packageName", app.packageName)
                            putString("status", "Ready")
                            putString("resolution", "1920x1080")
                            putString("fpsCap", "60")
                        }
                        gameCache[app.packageName] = gameInfo
                        gameList.pushMap(gameInfo)
                    }
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(gameList)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("ERROR", "Failed to get installed games: ${e.message}")
                }
            }
        }
    }

    @ReactMethod
    fun getAllInstalledApps(promise: Promise) {
        scope.launch {
            try {
                val pm = reactApplicationContext.packageManager
                val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA)
                val appList = WritableNativeArray()

                for (app in packages) {
                    val appInfo = WritableNativeMap().apply {
                        putString("name", pm.getApplicationLabel(app).toString())
                        putString("packageName", app.packageName)
                    }
                    appList.pushMap(appInfo)
                }
                withContext(Dispatchers.Main) {
                    promise.resolve(appList)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("ERROR", "Failed to get installed apps: ${e.message}")
                }
            }
        }
    }

    private fun isGameApp(app: ApplicationInfo, pm: PackageManager): Boolean {
        val hasInternet = pm.checkPermission("android.permission.INTERNET", app.packageName) == PackageManager.PERMISSION_GRANTED
        val hasVibrate = pm.checkPermission("android.permission.VIBRATE", app.packageName) == PackageManager.PERMISSION_GRANTED
        val usesOpenGL = app.metaData?.containsKey("com.google.android.gms.games") == true ||
                         app.metaData?.getString("unityplayer.UnityActivity") != null ||
                         app.metaData?.getString("com.epicgames.ue4.GameActivity") != null
        return (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) app.category == ApplicationInfo.CATEGORY_GAME else false) ||
               (app.metaData?.containsKey("com.google.android.play.games") == true) ||
               app.packageName.contains("game", ignoreCase = true) ||
               pm.getLaunchIntentForPackage(app.packageName)?.categories?.contains(Intent.CATEGORY_GAME) == true ||
               (hasInternet && hasVibrate && usesOpenGL) ||
               popularGames.contains(app.packageName)
    }

    @ReactMethod
    fun launchGame(packageName: String, promise: Promise) {
        try {
            val launchIntent = reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(launchIntent)
                promise.resolve("Launched $packageName")
            } else {
                promise.reject("ERROR", "Could not launch game: $packageName")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to launch game: ${e.message}")
        }
    }

    override fun onCatalystInstanceDestroy() {
        scope.cancel()
    }
}
