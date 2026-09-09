package studio.toastbyte.coldboot

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(LocationForegroundServicePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    try {
      SoLoader.init(this, OpenSourceMergedSoMapping)
    } catch (e: java.io.IOException) {
      throw RuntimeException("SoLoader init failed", e)
    }
    load()
  }
}
