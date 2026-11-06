package studio.toastbyte.coldboot

import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native bridge module that reports the battery's temperature, so the
 * app can warn when it's too cold to charge.
 *
 * Android keeps the last battery status as a sticky broadcast; registering a
 * null receiver just returns it, so nothing stays registered and no
 * permission is needed. iOS has no public equivalent, which is why this
 * module is Android only.
 */
class BatteryTemperatureModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BatteryTemperature"

    /**
     * Resolves with the battery temperature in °C, or null when the device
     * doesn't report one. Android reports it in tenths of a degree.
     */
    @ReactMethod
    fun getTemperature(promise: Promise) {
        try {
            val status: Intent? = reactApplicationContext.registerReceiver(
                null,
                IntentFilter(Intent.ACTION_BATTERY_CHANGED),
            )
            val tenths = status?.getIntExtra(
                BatteryManager.EXTRA_TEMPERATURE,
                Int.MIN_VALUE,
            ) ?: Int.MIN_VALUE
            if (tenths == Int.MIN_VALUE) {
                promise.resolve(null)
            } else {
                promise.resolve(tenths / 10.0)
            }
        } catch (_: Exception) {
            // Non-fatal: the app simply doesn't show a temperature.
            promise.resolve(null)
        }
    }
}
