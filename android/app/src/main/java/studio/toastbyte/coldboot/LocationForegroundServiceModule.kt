package studio.toastbyte.coldboot

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native bridge module that exposes start/stop methods for the
 * [LocationForegroundService] so JavaScript can control it when recording
 * begins and ends.
 */
class LocationForegroundServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LocationForegroundService"

    /** Starts the foreground service. Fire-and-forget — no callback needed. */
    @ReactMethod
    fun start() {
        try {
            val context = reactApplicationContext
            val intent = Intent(context, LocationForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (_: Exception) {
            // Non-fatal — recording still works; GPS may stop when backgrounded
        }
    }

    /** Stops the foreground service. Fire-and-forget — no callback needed. */
    @ReactMethod
    fun stop() {
        try {
            val context = reactApplicationContext
            context.stopService(Intent(context, LocationForegroundService::class.java))
        } catch (_: Exception) {
            // Non-fatal
        }
    }
}
