package com.filemanagerpro

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class StoragePermissionModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private var permissionPromise: Promise? = null

  private val permissionListener =
    PermissionListener { requestCode, _, grantResults ->
      if (requestCode != STORAGE_PERMISSION_REQUEST_CODE) {
        return@PermissionListener false
      }

      val granted =
        grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }

      permissionPromise?.resolve(granted)
      permissionPromise = null
      true
    }

  override fun getName(): String = "StoragePermissionModule"

  @ReactMethod
  fun isAllFilesAccessGranted(promise: Promise) {
    try {
      promise.resolve(hasStorageAccess(reactApplicationContext))
    } catch (error: Exception) {
      promise.reject("STORAGE_PERMISSION_CHECK_FAILED", error)
    }
  }

  @ReactMethod
  fun openAllFilesAccessSettings(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        requestLegacyStoragePermission(promise)
        return
      }

      val context = reactApplicationContext
      val packageUri = Uri.parse("package:${context.packageName}")
      val intent =
        Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, packageUri)

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

  private fun requestLegacyStoragePermission(promise: Promise) {
    if (hasStorageAccess(reactApplicationContext)) {
      promise.resolve(true)
      return
    }

    val activity = reactApplicationContext.currentActivity as? PermissionAwareActivity
    if (activity == null) {
      promise.reject(
        "STORAGE_PERMISSION_ACTIVITY_MISSING",
        "İzin istemek için etkin bir Activity bulunamadı.",
      )
      return
    }

    permissionPromise = promise
    activity.requestPermissions(
      arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE),
      STORAGE_PERMISSION_REQUEST_CODE,
      permissionListener,
    )
  }

  companion object {
    private const val STORAGE_PERMISSION_REQUEST_CODE = 2901

    fun hasStorageAccess(context: Context): Boolean {
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        Environment.isExternalStorageManager()
      } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        ContextCompat.checkSelfPermission(
          context,
          Manifest.permission.READ_EXTERNAL_STORAGE,
        ) == PackageManager.PERMISSION_GRANTED
      } else {
        true
      }
    }
  }
}
