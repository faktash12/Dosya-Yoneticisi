package com.filemanagerpro

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class StoragePermissionModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "StoragePermissionModule"

  @ReactMethod
  fun isAllFilesAccessGranted(promise: Promise) {
    try {
      val granted =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          Environment.isExternalStorageManager()
        } else {
          true
        }

      promise.resolve(granted)
    } catch (error: Exception) {
      promise.reject("STORAGE_PERMISSION_CHECK_FAILED", error)
    }
  }

  @ReactMethod
  fun openAllFilesAccessSettings(promise: Promise) {
    try {
      val context = reactApplicationContext
      val packageUri = Uri.parse("package:${context.packageName}")
      val intent =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, packageUri)
        } else {
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri)
        }

      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      promise.resolve(true)
    } catch (_: Exception) {
      try {
        val fallbackIntent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
        fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(fallbackIntent)
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("STORAGE_PERMISSION_SETTINGS_FAILED", error)
      }
    }
  }
}
