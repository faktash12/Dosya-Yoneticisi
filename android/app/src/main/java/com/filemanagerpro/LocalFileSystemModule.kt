package com.filemanagerpro

import android.content.Context
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Intent
import android.app.Activity
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.provider.OpenableColumns
import android.provider.MediaStore
import android.provider.Settings
import android.os.storage.StorageManager
import android.util.Base64
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.BufferedReader
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.ByteArrayOutputStream
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.URL
import java.net.ServerSocket
import java.net.Socket
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.Random
import java.util.zip.ZipInputStream

class LocalFileSystemModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private val pickFileRequestCode = 48120
  private val uninstallRequestCode = 48121
  private var pickFilePromise: Promise? = null
  private var uninstallPromise: Promise? = null
  private var uninstallPackageName: String? = null
  private val activityEventListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ): Unit {
        if (requestCode == uninstallRequestCode) {
          val promise = uninstallPromise ?: return
          val requestedPackage = uninstallPackageName
          uninstallPromise = null
          uninstallPackageName = null

          if (requestedPackage.isNullOrBlank()) {
            promise.reject(
              "LOCAL_FS_UNINSTALL_FAILED",
              "Kaldırma sonucu okunamadı.",
            )
            return
          }

          val isStillInstalled = isPackageInstalled(requestedPackage)
          promise.resolve(
            Arguments.createMap().apply {
              putString("packageName", requestedPackage)
              putString(
                "status",
                if (isStillInstalled) "cancelled" else "uninstalled",
              )
            },
          )
          return
        }

        if (requestCode != pickFileRequestCode) {
          return
        }

        val promise = pickFilePromise ?: return
        pickFilePromise = null

        try {
          if (resultCode != android.app.Activity.RESULT_OK || data?.data == null) {
            promise.reject("LOCAL_FS_PICK_CANCELLED", "Dosya seçimi iptal edildi.")
            return
          }

          promise.resolve(copyPickedUriToCache(data.data!!))
        } catch (error: Exception) {
          promise.reject("LOCAL_FS_PICK_FAILED", error.message, error)
        }
      }
    }

  private var mediaPlayer: MediaPlayer? = null
  private var mediaPath: String? = null
  @Volatile private var ftpServerSocket: ServerSocket? = null
  @Volatile private var ftpServerThread: Thread? = null
  @Volatile private var ftpPassword: String? = null
  @Volatile private var ftpIncludeHidden: Boolean = false

  override fun getName(): String = "LocalFileSystemModule"

  override fun getConstants(): MutableMap<String, Any> =
    mutableMapOf(
      "cloudEnvironment" to mapOf(
        "GOOGLE_DRIVE_CLIENT_ID" to BuildConfig.GOOGLE_DRIVE_CLIENT_ID,
        "GOOGLE_DRIVE_REDIRECT_URI" to BuildConfig.GOOGLE_DRIVE_REDIRECT_URI,
        "YANDEX_CLIENT_ID" to BuildConfig.YANDEX_CLIENT_ID,
        "YANDEX_CLIENT_SECRET" to BuildConfig.YANDEX_CLIENT_SECRET,
        "YANDEX_REDIRECT_URI" to BuildConfig.YANDEX_REDIRECT_URI,
        "ONEDRIVE_CLIENT_ID" to BuildConfig.ONEDRIVE_CLIENT_ID,
        "ONEDRIVE_REDIRECT_URI" to BuildConfig.ONEDRIVE_REDIRECT_URI,
        "DROPBOX_APP_KEY" to BuildConfig.DROPBOX_APP_KEY,
        "DROPBOX_REDIRECT_URI" to BuildConfig.DROPBOX_REDIRECT_URI,
      ),
    )

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  @ReactMethod
  fun getRootDirectory(promise: Promise) {
    try {
      promise.resolve(getExternalStorageRoot().absolutePath)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_ROOT_FAILED", error)
    }
  }

  @ReactMethod
  fun listDirectory(path: String, promise: Promise) {
    try {
      requireStorageAccess()

      val directory = resolveDirectory(path)
      val children =
        if (directory.canonicalPath == "/") {
          systemRootPaths()
            .map { File(it) }
            .filter { it.exists() && it.isDirectory && it.canRead() }
            .sortedBy { it.name.lowercase(Locale.ROOT) }
        } else {
          directory
            .listFiles()
            ?.sortedWith(
              compareBy<File>({ !it.isDirectory }, { it.name.lowercase(Locale.ROOT) })
            )
            ?: emptyList()
        }

      val results = Arguments.createArray()
      children.forEach { child ->
        results.pushMap(toNodeMap(child))
      }

      promise.resolve(results)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_LIST_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun searchDirectory(path: String, query: String, includeHidden: Boolean, promise: Promise) {
    try {
      requireStorageAccess()
      val rootDirectory = resolveDirectory(path)
      val normalizedQuery = query.trim().lowercase(Locale.ROOT)

      if (normalizedQuery.isBlank()) {
        promise.resolve(Arguments.createArray())
        return
      }

      val results = Arguments.createArray()
      collectSearchMatches(rootDirectory, normalizedQuery, includeHidden, results)
      promise.resolve(results)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_SEARCH_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun searchFilesByExtensions(
    path: String,
    extensions: ReadableArray,
    includeHidden: Boolean,
    promise: Promise,
  ) {
    try {
      requireStorageAccess()
      val rootDirectory = resolveDirectory(path)
      val normalizedExtensions =
        (0 until extensions.size())
          .mapNotNull { index -> extensions.getString(index)?.lowercase(Locale.ROOT) }
          .toSet()
      val results = Arguments.createArray()
      collectExtensionMatches(rootDirectory, normalizedExtensions, includeHidden, results)
      promise.resolve(results)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_EXTENSION_SEARCH_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun listFilesByCategory(
    category: String,
    includeHidden: Boolean,
    limit: Int,
    promise: Promise,
  ) {
    try {
      val extensions =
        when (category.lowercase(Locale.ROOT)) {
          "images" -> imageExtensions
          "video" -> videoExtensions
          "audio" -> audioExtensions
          "documents" -> documentExtensions
          else -> emptySet()
        }
      val mimePrefixes =
        when (category.lowercase(Locale.ROOT)) {
          "images" -> setOf("image/")
          "video" -> setOf("video/")
          "audio" -> setOf("audio/")
          "documents" -> setOf("text/", "application/pdf")
          else -> emptySet()
        }

      if (extensions.isEmpty()) {
        promise.resolve(Arguments.createArray())
        return
      }

      promise.resolve(
        queryMediaStoreFiles(
          extensions,
          includeHidden,
          limit,
          0L,
          mimePrefixes,
        ),
      )
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_CATEGORY_FILES_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun listRecentFiles(
    limit: Int,
    includeHidden: Boolean,
    sinceEpochMs: Double,
    promise: Promise,
  ) {
    try {
      promise.resolve(
        queryMediaStoreFiles(
          emptySet(),
          includeHidden,
          limit,
          sinceEpochMs.toLong(),
          emptySet(),
          setOf("tmp"),
        ),
      )
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_RECENT_FILES_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun listKnownMediaFolders(category: String, includeHidden: Boolean, promise: Promise) {
    try {
      val paths =
        when (category.lowercase(Locale.ROOT)) {
          "images" -> knownImageFolders()
          "video" -> knownVideoFolders()
          "audio" -> knownAudioFolders()
          else -> emptyList()
        }

      val seen = mutableSetOf<String>()
      val results = Arguments.createArray()
      paths
        .map { File(it) }
        .filter { folder ->
          folder.exists() &&
            folder.isDirectory &&
            (includeHidden || !folder.name.startsWith(".")) &&
            seen.add(folder.canonicalPath)
        }
        .sortedBy { folder -> folder.name.lowercase(Locale.ROOT) }
        .forEach { folder -> results.pushMap(toNodeMap(folder)) }

      promise.resolve(results)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_MEDIA_FOLDERS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun listSocialMediaFiles(
    appId: String,
    accountId: String,
    groupId: String,
    includeHidden: Boolean,
    limit: Int,
    promise: Promise,
  ) {
    Thread {
      try {
        requireStorageAccess()

        val normalizedAppId = appId.lowercase(Locale.ROOT)
        val normalizedAccountId = accountId.lowercase(Locale.ROOT)
        val normalizedGroupId = groupId.lowercase(Locale.ROOT)
        val results = Arguments.createArray()
        val seen = mutableSetOf<String>()
        val matches = mutableListOf<File>()

        socialMediaRoots(normalizedAppId, normalizedAccountId, normalizedGroupId)
          .filter { root -> root.exists() && root.isDirectory }
          .forEach { root ->
            collectSocialMediaMatches(
              root,
              normalizedAppId,
              normalizedGroupId,
              includeHidden,
              seen,
              matches,
            )
          }

        val limitedMatches =
          matches
            .sortedByDescending { file -> file.lastModified() }
            .let { sortedFiles -> if (limit > 0) sortedFiles.take(limit) else sortedFiles }

        limitedMatches.forEach { file -> results.pushMap(toNodeMap(file)) }
        promise.resolve(results)
      } catch (error: Exception) {
        promise.reject("LOCAL_FS_SOCIAL_MEDIA_FAILED", error.message, error)
      }
    }.start()
  }

  @ReactMethod
  fun analyzeStorage(promise: Promise) {
    Thread {
      try {
        requireStorageAccess()
        val totals = mutableMapOf(
          "Belgeler" to 0L,
          "Görseller" to 0L,
          "Videolar" to 0L,
          "Ses" to 0L,
          "Arşivler" to 0L,
          "Uygulamalar" to 0L,
          "Diğer" to 0L,
        )
        val breakdowns = mutableMapOf<String, MutableMap<String, Long>>()

        fun addSize(category: String, label: String, size: Long) {
          totals[category] = (totals[category] ?: 0L) + size
          val categoryBreakdown = breakdowns.getOrPut(category) { mutableMapOf() }
          categoryBreakdown[label] = (categoryBreakdown[label] ?: 0L) + size
        }

        fun scan(directory: File, depth: Int = 0) {
          if (depth > 12 || directory.name.startsWith(".")) {
            return
          }

          directory.listFiles()?.forEach { child ->
            if (child.name.startsWith(".")) {
              return@forEach
            }

            if (child.isDirectory) {
              scan(child, depth + 1)
              return@forEach
            }

            val extension = child.extension.lowercase(Locale.ROOT)
            val size = child.length()
            when {
              documentExtensions.contains(extension) -> addSize("Belgeler", extensionLabel(extension), size)
              imageExtensions.contains(extension) -> addSize("Görseller", extensionLabel(extension), size)
              videoExtensions.contains(extension) -> addSize("Videolar", extensionLabel(extension), size)
              audioExtensions.contains(extension) -> addSize("Ses", extensionLabel(extension), size)
              archiveExtensions.contains(extension) -> addSize("Arşivler", extensionLabel(extension), size)
              extension == "apk" -> addSize("Uygulamalar", "APK", size)
              else -> addSize("Diğer", if (extension.isBlank()) "Uzantısız" else extension.uppercase(Locale.ROOT), size)
            }
          }
        }

        scan(getExternalStorageRoot())

        val segments = Arguments.createArray()
        totals
          .filter { (_, usedBytes) -> usedBytes > 0L }
          .toList()
          .sortedByDescending { (_, usedBytes) -> usedBytes }
          .forEach { (label, usedBytes) ->
            segments.pushMap(
              Arguments.createMap().apply {
                putString("label", label)
                putDouble("usedBytes", usedBytes.toDouble())
                val breakdown = Arguments.createArray()
                breakdowns[label]
                  ?.toList()
                  ?.sortedByDescending { (_, itemBytes) -> itemBytes }
                  ?.take(8)
                  ?.forEach { (itemLabel, itemBytes) ->
                    breakdown.pushMap(
                      Arguments.createMap().apply {
                        putString("label", itemLabel)
                        putDouble("usedBytes", itemBytes.toDouble())
                      },
                    )
                  }
                putArray("breakdown", breakdown)
              },
            )
          }

        promise.resolve(segments)
      } catch (error: Exception) {
        promise.reject("LOCAL_FS_ANALYSIS_FAILED", error.message, error)
      }
    }.start()
  }

  @ReactMethod
  fun readTextFile(path: String, promise: Promise) {
    try {
      requireStorageAccess()
      val file = resolveFile(path)
      val content = file.readText(StandardCharsets.UTF_8)
      promise.resolve(content)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_READ_TEXT_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun writeTextFile(path: String, content: String, promise: Promise) {
    try {
      requireStorageAccess()
      val file = resolveFile(path)
      file.writeText(content, StandardCharsets.UTF_8)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_WRITE_TEXT_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun openFile(path: String, promise: Promise) {
    try {
      requireStorageAccess()
      val file = resolveExistingEntry(path)
      val activity = reactApplicationContext.currentActivity
        ?: throw IllegalStateException("Dosya açmak için aktif ekran bulunamadı.")

      val uri =
        FileProvider.getUriForFile(
          reactApplicationContext,
          "${reactApplicationContext.packageName}.fileprovider",
          file,
        )
      val mimeType = resolveMimeType(file)

      val intent =
        Intent(Intent.ACTION_VIEW).apply {
          setDataAndType(uri, mimeType)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

      val chooser = Intent.createChooser(intent, "Dosyayı birlikte aç")
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      activity.startActivity(chooser)
      promise.resolve(true)
    } catch (error: ActivityNotFoundException) {
      promise.reject(
        "LOCAL_FS_OPEN_FILE_UNAVAILABLE",
        "Bu dosyayı açabilecek bir uygulama bulunamadı.",
        error,
      )
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_OPEN_FILE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun installPackage(path: String, promise: Promise) {
    try {
      requireStorageAccess()
      val file = resolveExistingEntry(path)
      if (file.extension.lowercase(Locale.ROOT) != "apk") {
        throw IllegalArgumentException("Seçilen dosya APK değil.")
      }
      val activity = reactApplicationContext.currentActivity
        ?: throw IllegalStateException("APK kurmak için aktif ekran bulunamadı.")

      if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
          !reactApplicationContext.packageManager.canRequestPackageInstalls()
      ) {
        val permissionIntent =
          Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
            data = Uri.parse("package:${reactApplicationContext.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
        activity.startActivity(permissionIntent)
        promise.resolve(false)
        return
      }

      val uri =
        FileProvider.getUriForFile(
          reactApplicationContext,
          "${reactApplicationContext.packageName}.fileprovider",
          file,
        )
      val intent =
        Intent(Intent.ACTION_VIEW).apply {
          setDataAndType(uri, "application/vnd.android.package-archive")
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

      activity.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_INSTALL_APK_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun shareFiles(paths: ReadableArray, promise: Promise) {
    try {
      requireStorageAccess()
      val activity = reactApplicationContext.currentActivity
        ?: throw IllegalStateException("Paylaşım için aktif ekran bulunamadı.")
      val files =
        (0 until paths.size())
          .mapNotNull { index -> paths.getString(index) }
          .map { path -> resolveExistingEntry(path) }

      if (files.isEmpty()) {
        throw IllegalArgumentException("Paylaşılacak dosya seçilmedi.")
      }
      if (files.any { it.isDirectory }) {
        throw IllegalArgumentException("Klasör paylaşımı desteklenmiyor. Lütfen dosya seçin.")
      }

      val uris =
        files.map { file ->
          FileProvider.getUriForFile(
            reactApplicationContext,
            "${reactApplicationContext.packageName}.fileprovider",
            file,
          )
        }
      val mimeType =
        if (files.size == 1) resolveMimeType(files.first()) else "*/*"

      val intent =
        if (uris.size == 1) {
          Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uris.first())
            clipData = ClipData.newUri(reactApplicationContext.contentResolver, files.first().name, uris.first())
          }
        } else {
          Intent(Intent.ACTION_SEND_MULTIPLE).apply {
            type = mimeType
            putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(uris))
            clipData = ClipData.newUri(reactApplicationContext.contentResolver, files.first().name, uris.first())
          }
        }.apply {
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

      val chooser = Intent.createChooser(intent, "Dosyaları gönder")
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      activity.startActivity(chooser)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_SHARE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun openVideoPlayer(path: String, promise: Promise) {
    try {
      requireStorageAccess()
      val file = resolveFile(path)
      val activity = reactApplicationContext.currentActivity
        ?: throw IllegalStateException("Video açmak için aktif ekran bulunamadı.")

      val intent =
        Intent(activity, VideoPlayerActivity::class.java).apply {
          putExtra(VideoPlayerActivity.EXTRA_VIDEO_PATH, file.absolutePath)
        }

      activity.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_VIDEO_PLAYER_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun getUsbRoots(promise: Promise) {
    try {
      val roots = Arguments.createArray()
      resolveRemovableStorageDevices().filter { it.second == "usb" }.forEach { root ->
        roots.pushString(root.first)
      }
      promise.resolve(roots)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_USB_ROOTS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun getRemovableStorageDevices(promise: Promise) {
    try {
      val roots = Arguments.createArray()
      resolveRemovableStorageDevices().forEach { root ->
        val map = Arguments.createMap()
        map.putString("path", root.first)
        map.putString("kind", root.second)
        map.putString("label", if (root.second == "usb") "USB" else "SD kart")
        roots.pushMap(map)
      }
      promise.resolve(roots)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_REMOVABLE_ROOTS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun listInstalledApps(includeSystemApps: Boolean, promise: Promise) {
    try {
      val packageManager = reactApplicationContext.packageManager
      val packages = packageManager.getInstalledApplications(0)
      val results = Arguments.createArray()

      packages
        .filter { appInfo ->
          val isSystemApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
          val isUpdatedSystemApp =
            (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0

          includeSystemApps || !isSystemApp || isUpdatedSystemApp
        }
        .sortedBy { packageManager.getApplicationLabel(it).toString().lowercase(Locale.ROOT) }
        .forEach { appInfo ->
          val sourceFile = File(appInfo.sourceDir ?: "")
          val label = packageManager.getApplicationLabel(appInfo).toString()
          val packageInfo = packageManager.getPackageInfo(appInfo.packageName, 0)
          val isSystemApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
          val isUpdatedSystemApp =
            (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
          val map = Arguments.createMap()
          map.putString("packageName", appInfo.packageName)
          map.putString("label", label)
          map.putDouble("sizeBytes", sourceFile.length().toDouble())
          map.putString("installedAt", Instant.ofEpochMilli(packageInfo.firstInstallTime).toString())
          map.putString("sourceDir", appInfo.sourceDir)
          map.putBoolean("isSystemApp", isSystemApp)
          map.putBoolean("canUninstall", !isSystemApp || isUpdatedSystemApp)
          map.putString("iconBase64", drawableToBase64(packageManager.getApplicationIcon(appInfo)))
          results.pushMap(map)
        }

      promise.resolve(results)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_LIST_APPS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun uninstallPackage(packageName: String, promise: Promise) {
    try {
      val activity = reactApplicationContext.currentActivity
        ?: throw IllegalStateException("Uygulama kaldırmak için aktif ekran bulunamadı.")
      val applicationInfo =
        reactApplicationContext.packageManager.getApplicationInfo(packageName, 0)

      if (!canUninstallApplication(applicationInfo)) {
        throw IllegalStateException("Sistem uygulamaları kaldırılamaz.")
      }
      if (uninstallPromise != null) {
        throw IllegalStateException("Başka bir kaldırma işlemi zaten devam ediyor.")
      }

      val intent =
        Intent(Intent.ACTION_DELETE).apply {
          data = Uri.parse("package:$packageName")
        }

      uninstallPromise = promise
      uninstallPackageName = packageName
      activity.startActivityForResult(intent, uninstallRequestCode)
    } catch (error: Exception) {
      uninstallPromise = null
      uninstallPackageName = null
      promise.reject("LOCAL_FS_UNINSTALL_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun exitApplication(promise: Promise) {
    try {
      val activity = reactApplicationContext.currentActivity
        ?: throw IllegalStateException("Uygulamayı kapatmak için aktif ekran bulunamadı.")

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        activity.finishAndRemoveTask()
      } else {
        activity.finish()
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_EXIT_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun startMediaFile(path: String, promise: Promise) {
    try {
      requireStorageAccess()
      val file = resolveFile(path)
      stopCurrentMedia()

      mediaPlayer =
        MediaPlayer().apply {
          setDataSource(file.absolutePath)
          prepare()
          start()
        }
      mediaPath = file.absolutePath
      promise.resolve(mediaStatusMap())
    } catch (error: Exception) {
      stopCurrentMedia()
      promise.reject("LOCAL_FS_MEDIA_START_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun pauseMediaPlayback(promise: Promise) {
    try {
      mediaPlayer?.takeIf { it.isPlaying }?.pause()
      promise.resolve(mediaStatusMap())
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_MEDIA_PAUSE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun resumeMediaPlayback(promise: Promise) {
    try {
      mediaPlayer?.start()
      promise.resolve(mediaStatusMap())
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_MEDIA_RESUME_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun stopMediaPlayback(promise: Promise) {
    try {
      stopCurrentMedia()
      promise.resolve(mediaStatusMap())
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_MEDIA_STOP_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun seekMediaPlayback(positionMs: Double, promise: Promise) {
    try {
      val nextPosition = positionMs.toInt().coerceAtLeast(0)
      mediaPlayer?.seekTo(nextPosition)
      promise.resolve(mediaStatusMap())
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_MEDIA_SEEK_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun getMediaPlaybackStatus(promise: Promise) {
    try {
      promise.resolve(mediaStatusMap())
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_MEDIA_STATUS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun getStorageStats(promise: Promise) {
    try {
      val candidateRoots =
        listOf(Environment.getDataDirectory(), getExternalStorageRoot())
          .map { root -> root.canonicalFile }
          .distinctBy { root -> root.absolutePath }
      val selectedRoot =
        candidateRoots.maxByOrNull { root ->
          try {
            StatFs(root.absolutePath).totalBytes
          } catch (_: Exception) {
            0L
          }
        } ?: getExternalStorageRoot().canonicalFile
      val statFs = StatFs(selectedRoot.absolutePath)
      val totalBytes = statFs.totalBytes
      val availableBytes = statFs.availableBytes
      val usedBytes = (totalBytes - availableBytes).coerceAtLeast(0L)
      val downloadsSizeBytes =
        computeDirectorySize(
          File(getExternalStorageRoot(), "Download"),
          maxDepth = 8,
        ) + computeDirectorySize(
          File(getExternalStorageRoot(), "Downloads"),
          maxDepth = 8,
        )

      promise.resolve(
        Arguments.createMap().apply {
          putDouble("totalBytes", totalBytes.toDouble())
          putDouble("availableBytes", availableBytes.toDouble())
          putDouble("usedBytes", usedBytes.toDouble())
          putDouble("downloadsSizeBytes", downloadsSizeBytes.toDouble())
          putString("rootPath", selectedRoot.absolutePath)
        },
      )
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_STORAGE_STATS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun startFtpServer(includeHidden: Boolean, promise: Promise) {
    try {
      requireStorageAccess()
      stopFtpServerInternal()

      val password = Random().nextInt(9000).plus(1000).toString()
      val serverSocket = ServerSocket(1223)
      ftpServerSocket = serverSocket
      ftpPassword = password
      ftpIncludeHidden = includeHidden
      ftpServerThread =
        Thread {
          while (!serverSocket.isClosed) {
            try {
              val socket = serverSocket.accept()
              Thread { handleFtpClient(socket, password, includeHidden) }.start()
            } catch (_: Exception) {
              break
            }
          }
        }.apply {
          isDaemon = true
          start()
        }

      promise.resolve(
        Arguments.createMap().apply {
          putString("address", "ftp://${resolveLocalIpAddress()}:1223")
          putString("username", "pc")
          putString("password", password)
          putBoolean("isRunning", true)
        },
      )
    } catch (error: Exception) {
      stopFtpServerInternal()
      promise.reject("LOCAL_FS_FTP_START_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun pickLocalFile(promise: Promise) {
    try {
      val activity = reactApplicationContext.currentActivity
        ?: throw IllegalStateException("Dosya seçmek için aktif ekran bulunamadı.")

      if (pickFilePromise != null) {
        throw IllegalStateException("Devam eden bir dosya seçimi var.")
      }

      pickFilePromise = promise
      val intent =
        Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
          addCategory(Intent.CATEGORY_OPENABLE)
          type = "*/*"
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
      activity.startActivityForResult(intent, pickFileRequestCode)
    } catch (error: Exception) {
      pickFilePromise = null
      promise.reject("LOCAL_FS_PICK_START_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun downloadUrlToFile(
    url: String,
    headers: ReadableMap,
    destinationPath: String,
    promise: Promise,
  ) {
    Thread {
      try {
        val destination = File(destinationPath).canonicalFile
        ensureWithinRoot(destination.path)
        destination.parentFile?.let { parent ->
          if (!parent.exists() && !parent.mkdirs()) {
            throw IOException("Hedef klasör oluşturulamadı: ${parent.absolutePath}")
          }
        }

        val connection = URL(url).openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        applyRequestHeaders(connection, headers)
        connection.connectTimeout = 30_000
        connection.readTimeout = 60_000

        val responseCode = connection.responseCode
        if (responseCode !in 200..299) {
          throw IOException("İndirme başarısız: HTTP $responseCode")
        }

        BufferedInputStream(connection.inputStream).use { input ->
          BufferedOutputStream(FileOutputStream(destination)).use { output ->
            input.copyTo(output)
          }
        }
        connection.disconnect()
        promise.resolve(destination.absolutePath)
      } catch (error: Exception) {
        promise.reject("LOCAL_FS_DOWNLOAD_URL_FAILED", error.message, error)
      }
    }.start()
  }

  @ReactMethod
  fun uploadFileToUrl(
    method: String,
    url: String,
    headers: ReadableMap,
    localPath: String,
    bodyPrefix: String?,
    bodySuffix: String?,
    promise: Promise,
  ) {
    Thread {
      try {
        val file = resolveReadableFile(localPath)
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.requestMethod = method.uppercase(Locale.ROOT)
        connection.doOutput = true
        connection.connectTimeout = 30_000
        connection.readTimeout = 60_000
        applyRequestHeaders(connection, headers)

        BufferedOutputStream(connection.outputStream).use { output ->
          bodyPrefix?.takeIf { it.isNotEmpty() }?.let {
            output.write(it.toByteArray(StandardCharsets.UTF_8))
          }
          BufferedInputStream(FileInputStream(file)).use { input ->
            input.copyTo(output)
          }
          bodySuffix?.takeIf { it.isNotEmpty() }?.let {
            output.write(it.toByteArray(StandardCharsets.UTF_8))
          }
          output.flush()
        }

        val responseCode = connection.responseCode
        val responseStream =
          if (responseCode in 200..299) connection.inputStream else connection.errorStream
        val responseBody =
          responseStream?.bufferedReader(StandardCharsets.UTF_8)?.use { it.readText() } ?: ""
        connection.disconnect()

        if (responseCode !in 200..299) {
          throw IOException("Yükleme başarısız: HTTP $responseCode $responseBody")
        }

        promise.resolve(
          Arguments.createMap().apply {
            putInt("statusCode", responseCode)
            putString("body", responseBody)
          },
        )
      } catch (error: Exception) {
        promise.reject("LOCAL_FS_UPLOAD_URL_FAILED", error.message, error)
      }
    }.start()
  }

  @ReactMethod
  fun stopFtpServer(promise: Promise) {
    try {
      stopFtpServerInternal()
      promise.resolve(
        Arguments.createMap().apply {
          putString("address", "")
          putString("username", "pc")
          putString("password", "")
          putBoolean("isRunning", false)
        },
      )
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_FTP_STOP_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun createDirectory(directoryPath: String, promise: Promise) {
    try {
      requireStorageAccess()
      val target = resolveEntryWithinRoot(directoryPath)

      if (!target.exists() && !target.mkdirs()) {
        throw IOException("Klasör oluşturulamadı: ${target.absolutePath}")
      }

      promise.resolve(target.absolutePath)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_CREATE_DIRECTORY_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun renameEntry(sourcePath: String, nextName: String, promise: Promise) {
    try {
      requireStorageAccess()
      val source = resolveExistingEntry(sourcePath)
      val sanitizedName = nextName.trim()
      if (sanitizedName.isBlank()) {
        throw IllegalArgumentException("Yeni ad boş olamaz.")
      }

      val destination = File(source.parentFile, sanitizedName).canonicalFile
      ensureWithinRoot(destination.absolutePath)

      if (destination.exists() && source.canonicalPath != destination.canonicalPath) {
        throw IllegalArgumentException("Aynı adda bir öğe zaten mevcut.")
      }

      val renamed = source.renameTo(destination)
      if (!renamed) {
        throw IOException("Öğe yeniden adlandırılamadı: ${source.absolutePath}")
      }

      promise.resolve(destination.absolutePath)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_RENAME_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun createTextFile(
    directoryPath: String,
    fileName: String,
    content: String,
    promise: Promise,
  ) {
    try {
      requireStorageAccess()
      val directory = resolveDirectory(directoryPath)
      val sanitizedName = fileName.trim()
      if (sanitizedName.isBlank()) {
        throw IllegalArgumentException("Dosya adı boş olamaz.")
      }

      val target = File(directory, sanitizedName).canonicalFile
      ensureWithinRoot(target.absolutePath)

      if (target.exists()) {
        throw IllegalArgumentException("Aynı adda bir dosya zaten mevcut.")
      }

      target.writeText(content, StandardCharsets.UTF_8)
      promise.resolve(target.absolutePath)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_CREATE_TEXT_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun deleteEntry(path: String, promise: Promise) {
    try {
      requireStorageAccess()
      val target = resolveExistingEntry(path)
      deleteRecursively(target)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_DELETE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun copyEntry(
    sourcePath: String,
    destinationDirectoryPath: String,
    conflictStrategy: String,
    promise: Promise,
  ) {
    try {
      requireStorageAccess()
      val source = resolveExistingEntry(sourcePath)
      val destinationDirectory = resolveDirectory(destinationDirectoryPath)
      val destination = resolveDestinationEntry(source, destinationDirectory, conflictStrategy)

      copyEntryInternal(source, destination)
      promise.resolve(destination.absolutePath)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_COPY_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun moveEntry(
    sourcePath: String,
    destinationDirectoryPath: String,
    conflictStrategy: String,
    promise: Promise,
  ) {
    try {
      requireStorageAccess()
      val source = resolveExistingEntry(sourcePath)
      val destinationDirectory = resolveDirectory(destinationDirectoryPath)
      val destination = resolveDestinationEntry(source, destinationDirectory, conflictStrategy)

      if (source.canonicalPath == destination.canonicalPath) {
        promise.resolve(destination.absolutePath)
        return
      }

      val moved = source.renameTo(destination)
      if (!moved) {
        copyEntryInternal(source, destination)
        deleteRecursively(source)
      }

      promise.resolve(destination.absolutePath)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_MOVE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun extractArchive(
    archivePath: String,
    destinationDirectoryPath: String,
    promise: Promise,
  ) {
    try {
      requireStorageAccess()
      val archive = resolveExistingEntry(archivePath)
      val destinationDirectory = resolveDirectory(destinationDirectoryPath)
      val extension = archive.extension.lowercase(Locale.ROOT)

      if (extension != "zip") {
        throw IllegalArgumentException("Şimdilik yalnızca ZIP arşivleri klasöre çıkarılabilir.")
      }

      val baseName = archive.nameWithoutExtension.ifBlank { "arsiv" }
      val extractionRoot = generateRenamedDestination(destinationDirectory, baseName)
      if (!extractionRoot.mkdirs()) {
        throw IOException("Çıkarma klasörü oluşturulamadı: ${extractionRoot.absolutePath}")
      }
      val rootCanonicalPath = extractionRoot.canonicalPath

      ZipInputStream(BufferedInputStream(FileInputStream(archive))).use { zipInput ->
        while (true) {
          val entry = zipInput.nextEntry ?: break
          val target = File(extractionRoot, entry.name).canonicalFile
          if (target.canonicalPath != rootCanonicalPath && !target.canonicalPath.startsWith("$rootCanonicalPath/")) {
            throw IOException("Güvensiz arşiv yolu engellendi: ${entry.name}")
          }

          if (entry.isDirectory) {
            if (!target.exists() && !target.mkdirs()) {
              throw IOException("Klasör oluşturulamadı: ${target.absolutePath}")
            }
          } else {
            target.parentFile?.let { parent ->
              if (!parent.exists() && !parent.mkdirs()) {
                throw IOException("Hedef klasör oluşturulamadı: ${parent.absolutePath}")
              }
            }
            BufferedOutputStream(target.outputStream()).use { output ->
              zipInput.copyTo(output)
            }
          }
          zipInput.closeEntry()
        }
      }

      promise.resolve(extractionRoot.absolutePath)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_EXTRACT_FAILED", error.message, error)
    }
  }

  private fun requireStorageAccess() {
    if (!StoragePermissionModule.hasStorageAccess(reactApplicationContext)) {
      throw IllegalStateException(
        "Depolama erişim izni gerekli. Ayarlar ekranından tüm dosya erişimini etkinleştirin.",
      )
    }
  }

  private fun collectSearchMatches(
    directory: File,
    normalizedQuery: String,
    includeHidden: Boolean,
    results: com.facebook.react.bridge.WritableArray,
  ) {
    val children = directory.listFiles()?.sortedBy { it.name.lowercase(Locale.ROOT) } ?: return

    children.forEach { child ->
      if (!includeHidden && child.name.startsWith(".")) {
        if (child.isDirectory) {
          return@forEach
        }
        return@forEach
      }

      if (child.name.lowercase(Locale.ROOT).contains(normalizedQuery)) {
        results.pushMap(toNodeMap(child))
      }

      if (child.isDirectory) {
        collectSearchMatches(child, normalizedQuery, includeHidden, results)
      }
    }
  }

  private fun applyRequestHeaders(connection: HttpURLConnection, headers: ReadableMap) {
    val iterator = headers.keySetIterator()
    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      val value = headers.getString(key)
      if (value != null) {
        connection.setRequestProperty(key, value)
      }
    }
  }

  private fun copyPickedUriToCache(uri: Uri): com.facebook.react.bridge.WritableMap {
    val resolver = reactApplicationContext.contentResolver
    var displayName = "secili-dosya"
    var sizeBytes = 0L
    val mimeType = resolver.getType(uri) ?: "application/octet-stream"

    resolver.query(uri, null, null, null, null)?.use { cursor ->
      val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
      val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
      if (cursor.moveToFirst()) {
        if (nameIndex >= 0) {
          displayName = cursor.getString(nameIndex) ?: displayName
        }
        if (sizeIndex >= 0) {
          sizeBytes = cursor.getLong(sizeIndex)
        }
      }
    }

    val safeName = displayName.replace(Regex("[\\\\/:*?\"<>|]"), "_")
    val destination = File(reactApplicationContext.cacheDir, "picked-cloud/$safeName")
    destination.parentFile?.let { parent ->
      if (!parent.exists() && !parent.mkdirs()) {
        throw IOException("Geçici klasör oluşturulamadı.")
      }
    }

    resolver.openInputStream(uri)?.use { input ->
      BufferedOutputStream(FileOutputStream(destination)).use { output ->
        input.copyTo(output)
      }
    } ?: throw IOException("Seçilen dosya okunamadı.")

    if (sizeBytes <= 0L) {
      sizeBytes = destination.length()
    }

    return Arguments.createMap().apply {
      putString("path", destination.absolutePath)
      putString("name", displayName)
      putString("mimeType", mimeType)
      putDouble("sizeBytes", sizeBytes.toDouble())
    }
  }

  private fun collectExtensionMatches(
    directory: File,
    extensions: Set<String>,
    includeHidden: Boolean,
    results: com.facebook.react.bridge.WritableArray,
  ) {
    val children = directory.listFiles()?.sortedBy { it.name.lowercase(Locale.ROOT) } ?: return

    children.forEach { child ->
      if (!includeHidden && child.name.startsWith(".")) {
        return@forEach
      }

      if (child.isDirectory) {
        collectExtensionMatches(child, extensions, includeHidden, results)
        return@forEach
      }

      if (extensions.contains(child.extension.lowercase(Locale.ROOT))) {
        results.pushMap(toNodeMap(child))
      }
    }
  }

  private fun socialMediaRoots(appId: String, accountId: String, groupId: String): List<File> {
    val root = getExternalStorageRoot().absolutePath

    val paths =
      when (appId) {
        "instagram" ->
          listOf(
            "$root/Pictures/Instagram",
            "$root/DCIM/Instagram",
            "$root/Download/Instagram",
            "$root/Downloads/Instagram",
            "$root/Android/media/com.instagram.android",
            "$root/Android/data/com.instagram.android",
          )
        "whatsapp" -> whatsappMediaFolders(root, accountId, groupId)
        "telegram" ->
          listOf(
            "$root/Android/media/com.telegram/Media",
            "$root/Android/media/com.telegram/Telegram",
            "$root/Android/media/org.telegram.messenger/Telegram",
            "$root/Android/media/org.telegram.messenger/Media",
            "$root/Telegram",
            "$root/Download/Telegram",
            "$root/Downloads/Telegram",
            "$root/Android/data/org.telegram.messenger",
          )
        else -> emptyList()
      }

    return paths
      .map { path -> File(path) }
      .distinctBy { file -> file.absolutePath.lowercase(Locale.ROOT) }
  }

  private fun whatsappMediaFolders(root: String, accountId: String, groupId: String): List<String> {
    val isBusiness = accountId == "business"
    val mediaRoots =
      if (isBusiness) {
        listOf(
          "$root/Android/media/com.whatsapp.w4b/WhatsApp Business/Media",
          "$root/Android/media/com.whatsapp.w4b/Media",
          "$root/WhatsApp Business/Media",
        )
      } else {
        listOf(
          "$root/Android/media/com.whatsapp/WhatsApp/Media",
          "$root/Android/media/com.whatsapp/Media",
          "$root/WhatsApp/Media",
        )
      }

    val folderNames =
      when (groupId) {
        "images" ->
          if (isBusiness) {
            listOf("WhatsApp Business Images", "WhatsApp Images")
          } else {
            listOf("WhatsApp Images")
          }
        "video" ->
          if (isBusiness) {
            listOf("WhatsApp Business Video", "WhatsApp Video")
          } else {
            listOf("WhatsApp Video")
          }
        "documents" ->
          if (isBusiness) {
            listOf("WhatsApp Business Documents", "WhatsApp Documents")
          } else {
            listOf("WhatsApp Documents")
          }
        "voice" ->
          if (isBusiness) {
            listOf("WhatsApp Business Voice Notes", "WhatsApp Voice Notes")
          } else {
            listOf("WhatsApp Voice Notes")
          }
        "audio", "music" ->
          if (isBusiness) {
            listOf("WhatsApp Business Audio", "WhatsApp Audio")
          } else {
            listOf("WhatsApp Audio")
          }
        else -> emptyList()
      }

    if (folderNames.isEmpty()) {
      return mediaRoots
    }

    return mediaRoots.flatMap { mediaRoot ->
      folderNames.map { folderName -> "$mediaRoot/$folderName" } + mediaRoot
    }
  }

  private fun collectSocialMediaMatches(
    directory: File,
    appId: String,
    groupId: String,
    includeHidden: Boolean,
    seen: MutableSet<String>,
    matches: MutableList<File>,
    depth: Int = 0,
  ) {
    if (depth > 14 || (!includeHidden && directory.name.startsWith("."))) {
      return
    }

    directory.listFiles()?.forEach { child ->
      if (!includeHidden && child.name.startsWith(".")) {
        return@forEach
      }

      if (child.isDirectory) {
        collectSocialMediaMatches(
          child,
          appId,
          groupId,
          includeHidden,
          seen,
          matches,
          depth + 1,
        )
        return@forEach
      }

      if (!child.isFile || !matchesSocialGroup(child, appId, groupId)) {
        return@forEach
      }

      val canonicalPath =
        try {
          child.canonicalPath
        } catch (_: IOException) {
          return@forEach
        }

      if (isPathInsideAllowedRoot(child.path) && seen.add(canonicalPath)) {
        matches.add(child)
      }
    }
  }

  private fun matchesSocialGroup(file: File, appId: String, groupId: String): Boolean {
    val extension = file.extension.lowercase(Locale.ROOT)
    val normalizedPath = file.path.replace('\\', '/').lowercase(Locale.ROOT)
    val allowedExtensions =
      when (groupId) {
        "images" -> imageExtensions
        "video" -> videoExtensions
        "documents" -> documentExtensions
        "voice" -> audioExtensions
        "audio", "music" -> audioExtensions
        "files" -> documentExtensions + imageExtensions + videoExtensions + audioExtensions + archiveExtensions + setOf("apk")
        else -> emptySet()
      }

    if (!allowedExtensions.contains(extension)) {
      return false
    }

    if (appId == "whatsapp") {
      return when (groupId) {
        "images" -> normalizedPath.contains("image")
        "video" -> normalizedPath.contains("video")
        "documents" -> normalizedPath.contains("document")
        "voice" -> normalizedPath.contains("voice")
        "audio", "music" -> normalizedPath.contains("audio") && !normalizedPath.contains("voice")
        else -> true
      }
    }

    if (appId == "telegram") {
      return when (groupId) {
        "documents" ->
          normalizedPath.contains("/download/telegram/") ||
            normalizedPath.contains("/downloads/telegram/") ||
            normalizedPath.contains("/files/") ||
            normalizedPath.contains("/documents/")
        "voice" ->
          normalizedPath.contains("voice") ||
            normalizedPath.contains("record") ||
            (normalizedPath.contains("/audio/") && extension == "opus")
        "music" ->
          normalizedPath.contains("music") ||
            (normalizedPath.contains("audio") && !normalizedPath.contains("voice"))
        else -> true
      }
    }

    return true
  }

  private val documentExtensions = setOf(
    "pdf", "doc", "docx", "xls", "xlsx", "ods", "txt", "log", "md", "csv",
    "rtf", "odt", "odf", "ppt", "pptx",
  )
  private val imageExtensions = setOf("jpg", "jpeg", "png", "webp", "gif", "bmp", "heic")
  private val videoExtensions = setOf("mp4", "mpeg", "mpg", "mkv", "webm", "mov", "avi", "3gp", "m4v")
  private val audioExtensions = setOf("mp3", "wav", "m4a", "aac", "ogg", "flac", "opus", "amr")
  private val archiveExtensions = setOf("zip", "rar", "7z", "tar", "gz")

  private fun queryMediaStoreFiles(
    extensions: Set<String>,
    includeHidden: Boolean,
    limit: Int,
    sinceEpochMs: Long = 0L,
    mimePrefixes: Set<String> = emptySet(),
    excludedExtensions: Set<String> = emptySet(),
  ): com.facebook.react.bridge.WritableArray {
    val results = Arguments.createArray()
    val uri = MediaStore.Files.getContentUri("external")
    val projection =
      arrayOf(
        MediaStore.Files.FileColumns.DATA,
        MediaStore.Files.FileColumns.DATE_MODIFIED,
        MediaStore.Files.FileColumns.MIME_TYPE,
      )
    val selection =
      if (sinceEpochMs > 0L) {
        "${MediaStore.Files.FileColumns.DATE_MODIFIED} >= ?"
      } else {
        null
      }
    val selectionArgs =
      if (sinceEpochMs > 0L) {
        arrayOf((sinceEpochMs / 1000L).toString())
      } else {
        null
      }
    val sortOrder = "${MediaStore.Files.FileColumns.DATE_MODIFIED} DESC"
    val seen = mutableSetOf<String>()

    reactApplicationContext.contentResolver.query(
      uri,
      projection,
      selection,
      selectionArgs,
      sortOrder,
    )?.use { cursor ->
      val pathIndex = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATA)
      val mimeTypeIndex = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
      while (cursor.moveToNext()) {
        val path = cursor.getString(pathIndex) ?: continue
        val mimeType = cursor.getString(mimeTypeIndex)?.lowercase(Locale.ROOT) ?: ""
        val file = File(path)
        if (!file.exists() || !file.isFile) {
          continue
        }
        if (!includeHidden && file.name.startsWith(".")) {
          continue
        }
        val normalizedExtension = file.extension.lowercase(Locale.ROOT)
        if (excludedExtensions.contains(normalizedExtension)) {
          continue
        }
        val matchesExtension =
          extensions.isEmpty() || extensions.contains(normalizedExtension)
        val matchesMimeType =
          mimePrefixes.isNotEmpty() &&
            mimePrefixes.any { prefix -> mimeType.startsWith(prefix) }
        if (extensions.isNotEmpty() && !matchesExtension && !matchesMimeType) {
          continue
        }
        if (!isPathInsideAllowedRoot(file.path) || !seen.add(file.canonicalPath)) {
          continue
        }

        results.pushMap(toNodeMap(file))
        if (limit > 0 && results.size() >= limit) {
          break
        }
      }
    }

    return results
  }

  private fun knownImageFolders(): List<String> {
    val root = getExternalStorageRoot().absolutePath
    return listOf(
      "$root/DCIM/Camera",
      "$root/DCIM",
      "$root/Pictures/Screenshots",
      "$root/DCIM/Screenshots",
      "$root/Screenshots",
      "$root/Pictures",
      "$root/Download",
      "$root/Downloads",
      "$root/WhatsApp/Media/WhatsApp Images",
      "$root/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images",
      "$root/Telegram/Telegram Images",
      "$root/Pictures/Instagram",
    )
  }

  private fun knownVideoFolders(): List<String> {
    val root = getExternalStorageRoot().absolutePath
    return listOf(
      "$root/DCIM/Camera",
      "$root/Movies",
      "$root/Download",
      "$root/Downloads",
      "$root/WhatsApp/Media/WhatsApp Video",
      "$root/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video",
      "$root/Telegram/Telegram Video",
      "$root/Pictures/Instagram",
    )
  }

  private fun knownAudioFolders(): List<String> {
    val root = getExternalStorageRoot().absolutePath
    return listOf(
      "$root/Music",
      "$root/Recordings",
      "$root/Download",
      "$root/WhatsApp/Media/WhatsApp Audio",
      "$root/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio",
      "$root/Telegram/Telegram Audio",
    )
  }

  private fun extensionLabel(extension: String): String =
    when (extension) {
      "jpg", "jpeg" -> "JPEG"
      "png" -> "PNG"
      "doc", "docx" -> "Word"
      "xls", "xlsx" -> "Excel"
      "ppt", "pptx" -> "PowerPoint"
      "mp3", "wav", "m4a", "aac", "ogg", "flac", "opus", "amr" -> extension.uppercase(Locale.ROOT)
      else -> extension.uppercase(Locale.ROOT)
    }

  private fun canUninstallApplication(applicationInfo: ApplicationInfo): Boolean {
    val isSystemApp = (applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
    val isUpdatedSystemApp =
      (applicationInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0

    return !isSystemApp || isUpdatedSystemApp
  }

  private fun isPackageInstalled(packageName: String): Boolean =
    try {
      reactApplicationContext.packageManager.getPackageInfo(packageName, 0)
      true
    } catch (_: Exception) {
      false
    }

  private fun resolveDirectory(path: String): File {
    val target = resolveEntryWithinRoot(path)

    if (!target.exists() || !target.isDirectory) {
      throw IllegalArgumentException("Kaynak bulunamadı: $path")
    }

    return target
  }

  private fun resolveFile(path: String): File {
    val target = resolveEntryWithinRoot(path)

    if (!target.exists() || !target.isFile) {
      throw IllegalArgumentException("Dosya bulunamadı: $path")
    }

    return target
  }

  private fun resolveReadableFile(path: String): File {
    val target = File(path).canonicalFile
    val cacheRoot = reactApplicationContext.cacheDir.canonicalFile
    val isCacheFile =
      target.path == cacheRoot.path || target.path.startsWith("${cacheRoot.path}/")

    if (!isCacheFile) {
      ensureWithinRoot(target.path)
    }

    if (!target.exists() || !target.isFile || !target.canRead()) {
      throw IllegalArgumentException("Dosya okunamadı: $path")
    }

    return target
  }

  private fun resolveExistingEntry(path: String): File {
    val target = resolveEntryWithinRoot(path)

    if (!target.exists()) {
      throw IllegalArgumentException("Kaynak bulunamadı: $path")
    }

    return target
  }

  private fun resolveEntryWithinRoot(path: String): File {
    val target = File(path).canonicalFile
    ensureWithinRoot(target.path)
    return target
  }

  private fun ensureWithinRoot(path: String) {
    if (!isPathInsideAllowedRoot(path)) {
      throw IllegalArgumentException("Bu kaynak uygulamanın erişim alanı dışında: $path")
    }
  }

  private fun resolveDestinationEntry(
    source: File,
    destinationDirectory: File,
    conflictStrategy: String,
  ): File {
    val candidate = File(destinationDirectory, source.name).canonicalFile

    if (!isPathInsideAllowedRoot(candidate.path)) {
      throw IllegalArgumentException("Hedef klasör uygulamanın erişim alanı dışında.")
    }

    if (!candidate.exists()) {
      return candidate
    }

    return when (conflictStrategy) {
      "overwrite" -> {
        deleteRecursively(candidate)
        candidate
      }
      "skip" -> candidate
      else -> generateRenamedDestination(destinationDirectory, source.name)
    }
  }

  private fun generateRenamedDestination(directory: File, originalName: String): File {
    val dotIndex = originalName.lastIndexOf('.')
    val hasExtension = dotIndex > 0
    val baseName = if (hasExtension) originalName.substring(0, dotIndex) else originalName
    val extension = if (hasExtension) originalName.substring(dotIndex) else ""

    var index = 1
    while (true) {
      val candidateName = "$baseName ($index)$extension"
      val candidate = File(directory, candidateName)
      if (!candidate.exists()) {
        return candidate
      }
      index += 1
    }
  }

  private fun copyEntryInternal(source: File, destination: File) {
    if (source.isDirectory) {
      if (!destination.exists() && !destination.mkdirs()) {
        throw IOException("Klasör oluşturulamadı: ${destination.absolutePath}")
      }

      source.listFiles()?.forEach { child ->
        copyEntryInternal(child, File(destination, child.name))
      }

      return
    }

    destination.parentFile?.let { parent ->
      if (!parent.exists() && !parent.mkdirs()) {
        throw IOException("Hedef klasör oluşturulamadı: ${parent.absolutePath}")
      }
    }

    source.copyTo(destination, overwrite = true)
  }

  private fun deleteRecursively(target: File) {
    if (!target.exists()) {
      return
    }

    if (target.isDirectory) {
      target.listFiles()?.forEach { child ->
        deleteRecursively(child)
      }
    }

    if (!target.delete()) {
      throw IOException("Kaynak silinemedi: ${target.absolutePath}")
    }
  }

  private fun computeDirectorySize(directory: File, depth: Int = 0, maxDepth: Int = 6): Long {
    if (!directory.exists() || !directory.canRead() || depth > maxDepth) {
      return 0L
    }

    if (directory.isFile) {
      return directory.length()
    }

    return directory.listFiles()?.sumOf { child ->
      computeDirectorySize(child, depth + 1, maxDepth)
    } ?: 0L
  }

  private fun stopCurrentMedia() {
    mediaPlayer?.run {
      if (isPlaying) {
        stop()
      }
      release()
    }
    mediaPlayer = null
    mediaPath = null
  }

  private fun stopFtpServerInternal() {
    try {
      ftpServerSocket?.close()
    } catch (_: Exception) {
    }
    ftpServerSocket = null
    ftpServerThread = null
    ftpPassword = null
  }

  private fun handleFtpClient(socket: Socket, password: String, includeHidden: Boolean) {
    socket.use { clientSocket ->
      val reader =
        BufferedReader(InputStreamReader(clientSocket.getInputStream(), StandardCharsets.UTF_8))
      val writer = PrintWriter(clientSocket.getOutputStream(), true)
      var isAuthenticated = false
      var currentDirectory = getExternalStorageRoot().canonicalFile
      var passiveSocket: ServerSocket? = null
      var activeDataAddress: InetSocketAddress? = null

      fun writeLine(value: String) {
        writer.print("$value\r\n")
        writer.flush()
      }

      fun openPassiveSocket(announce: Boolean = true): ServerSocket {
        passiveSocket?.close()
        passiveSocket = ServerSocket(0)
        activeDataAddress = null
        val addressParts = resolveLocalIpAddress().split(".")
        val port = passiveSocket!!.localPort
        if (announce) {
          writeLine(
            "227 Entering Passive Mode (${addressParts.joinToString(",")},${port / 256},${port % 256}).",
          )
        }
        return passiveSocket!!
      }

      fun openDataSocket(): Socket {
        val activeAddress = activeDataAddress
        if (activeAddress != null) {
          val dataSocket = Socket()
          dataSocket.connect(activeAddress, 5000)
          activeDataAddress = null
          return dataSocket
        }

        return (passiveSocket ?: openPassiveSocket()).accept()
      }

      fun resolveFtpPath(argument: String?): File {
        val root = getExternalStorageRoot().canonicalFile
        val raw = argument?.trim().orEmpty()
        val target =
          if (raw.isBlank() || raw == ".") {
            currentDirectory
          } else if (raw.startsWith("/")) {
            File(root, raw.removePrefix("/"))
          } else {
            File(currentDirectory, raw)
          }.canonicalFile

        if (target.path != root.path && !target.path.startsWith("${root.path}/")) {
          throw IllegalArgumentException("FTP kökü dışına çıkılamaz.")
        }

        return target
      }

      fun relativePath(file: File): String {
        val root = getExternalStorageRoot().canonicalFile
        val relative = file.canonicalPath.removePrefix(root.canonicalPath).trim('/')
        return if (relative.isBlank()) "/" else "/$relative"
      }

      writeLine("220 Dosya Yoneticisi FTP hazir")

      while (true) {
        val line = reader.readLine() ?: break
        val command = line.substringBefore(" ").uppercase(Locale.ROOT)
        val argument = line.substringAfter(" ", "").ifBlank { null }

        try {
          when (command) {
            "USER" -> {
              if (argument == "pc") writeLine("331 Sifre gerekli") else writeLine("530 Kullanici hatali")
            }
            "PASS" -> {
              isAuthenticated = argument == password
              writeLine(if (isAuthenticated) "230 Giris basarili" else "530 Sifre hatali")
            }
            "SYST" -> writeLine("215 UNIX Type: L8")
            "FEAT" -> {
              writeLine("211-Features")
              writeLine(" UTF8")
              writeLine(" PASV")
              writeLine(" EPSV")
              writeLine(" SIZE")
              writeLine(" MDTM")
              writeLine("211 End")
            }
            "OPTS" -> writeLine("200 UTF8 aktif")
            "NOOP" -> writeLine("200 Tamam")
            "TYPE" -> writeLine("200 Tur ayarlandi")
            "PWD" -> writeLine("257 \"${relativePath(currentDirectory)}\"")
            "CWD" -> {
              val nextDirectory = resolveFtpPath(argument)
              if (nextDirectory.isDirectory && nextDirectory.canRead()) {
                currentDirectory = nextDirectory
                writeLine("250 Klasor degisti")
              } else {
                writeLine("550 Klasor acilamadi")
              }
            }
            "CDUP" -> {
              val root = getExternalStorageRoot().canonicalFile
              val parent = currentDirectory.parentFile?.canonicalFile ?: root
              currentDirectory =
                if (parent.path.startsWith(root.path)) parent else root
              writeLine("250 Ust klasor")
            }
            "PASV" -> openPassiveSocket()
            "EPSV" -> {
              val dataServer = openPassiveSocket(false)
              writeLine("229 Entering Extended Passive Mode (|||${dataServer.localPort}|)")
            }
            "PORT" -> {
              val parts = argument?.split(",") ?: emptyList()
              if (parts.size == 6) {
                val host = parts.take(4).joinToString(".")
                val port = parts[4].toInt() * 256 + parts[5].toInt()
                passiveSocket?.close()
                passiveSocket = null
                activeDataAddress = InetSocketAddress(host, port)
                writeLine("200 Aktif veri baglantisi ayarlandi")
              } else {
                writeLine("501 PORT komutu hatali")
              }
            }
            "SIZE" -> {
              val file = resolveFtpPath(argument)
              if (file.isFile && file.canRead()) writeLine("213 ${file.length()}") else writeLine("550 Boyut okunamadi")
            }
            "MDTM" -> {
              val file = resolveFtpPath(argument)
              if (file.exists()) {
                val stamp = SimpleDateFormat("yyyyMMddHHmmss", Locale.US).format(file.lastModified())
                writeLine("213 $stamp")
              } else {
                writeLine("550 Tarih okunamadi")
              }
            }
            "LIST", "NLST" -> {
              if (!isAuthenticated) {
                writeLine("530 Once giris yapin")
              } else {
                writeLine("150 Liste hazirlaniyor")
                openDataSocket().use { dataSocket ->
                  val dataWriter = PrintWriter(dataSocket.getOutputStream(), true)
                  currentDirectory
                    .listFiles()
                    ?.filter { includeHidden || !it.name.startsWith(".") }
                    ?.sortedWith(compareBy<File>({ !it.isDirectory }, { it.name.lowercase(Locale.ROOT) }))
                    ?.forEach { file ->
                      if (command == "NLST") {
                        dataWriter.print("${file.name}\r\n")
                      } else {
                        dataWriter.print("${formatFtpListLine(file)}\r\n")
                      }
                    }
                  dataWriter.flush()
                }
                passiveSocket?.close()
                passiveSocket = null
                writeLine("226 Liste tamamlandi")
              }
            }
            "RETR" -> {
              if (!isAuthenticated) {
                writeLine("530 Once giris yapin")
              } else {
                val file = resolveFtpPath(argument)
                if (!file.isFile || !file.canRead()) {
                  writeLine("550 Dosya okunamadi")
                } else {
                  writeLine("150 Dosya aktariliyor")
                  openDataSocket().use { dataSocket ->
                    BufferedInputStream(FileInputStream(file)).use { input ->
                      BufferedOutputStream(dataSocket.getOutputStream()).use { output ->
                        input.copyTo(output)
                        output.flush()
                      }
                    }
                  }
                  passiveSocket?.close()
                  passiveSocket = null
                  writeLine("226 Aktarim tamamlandi")
                }
              }
            }
            "QUIT" -> {
              writeLine("221 Gorusmek uzere")
              break
            }
            else -> writeLine("502 Komut desteklenmiyor")
          }
        } catch (_: Exception) {
          writeLine("550 Islem tamamlanamadi")
        }
      }

      passiveSocket?.close()
    }
  }

  private fun formatFtpListLine(file: File): String {
    val permissions = if (file.isDirectory) "drwxr-xr-x" else "-rw-r--r--"
    val size = if (file.isDirectory) 0 else file.length()
    val date = SimpleDateFormat("MMM dd HH:mm", Locale.US).format(file.lastModified())
    return "$permissions 1 owner group $size $date ${file.name}"
  }

  private fun resolveLocalIpAddress(): String {
    val interfaces = NetworkInterface.getNetworkInterfaces()
    while (interfaces.hasMoreElements()) {
      val networkInterface = interfaces.nextElement()
      if (!networkInterface.isUp || networkInterface.isLoopback) {
        continue
      }
      val addresses = networkInterface.inetAddresses
      while (addresses.hasMoreElements()) {
        val address = addresses.nextElement()
        if (address is Inet4Address && !address.isLoopbackAddress) {
          return address.hostAddress ?: "127.0.0.1"
        }
      }
    }
    return "127.0.0.1"
  }

  private fun isPathInsideAllowedRoot(path: String): Boolean {
    val canonicalPath = File(path).canonicalPath
    val allowedRoots =
      listOf(getExternalStorageRoot().canonicalPath) +
        resolveRemovableStorageDevices().map { device -> File(device.first).canonicalPath } +
        systemRootPaths()

    return allowedRoots.any { rootPath ->
      canonicalPath == rootPath || canonicalPath.startsWith("$rootPath/")
    }
  }

  private fun systemRootPaths() =
    listOf(
      "/",
      "/config",
      "/data",
      "/dev",
      "/etc",
      "/proc",
      "/storage",
      "/system",
      "/vendor",
    )

  private fun mediaStatusMap() =
    Arguments.createMap().apply {
      val player = mediaPlayer
      putBoolean("isPlaying", player?.isPlaying == true)
      putDouble("durationMs", (player?.duration ?: 0).toDouble())
      putDouble("positionMs", (player?.currentPosition ?: 0).toDouble())
      if (mediaPath != null) {
        putString("path", mediaPath)
      } else {
        putNull("path")
      }
    }

  private fun getExternalStorageRoot(): File {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      Environment.getExternalStorageDirectory()
    } else {
      @Suppress("DEPRECATION")
      Environment.getExternalStorageDirectory()
    }
  }

  private fun resolveRemovableStorageDevices(): List<Pair<String, String>> {
    val packageName = reactApplicationContext.packageName
    val externalDirs = reactApplicationContext.getExternalFilesDirs(null)
    val rootPath = getExternalStorageRoot().canonicalPath
    val discovered = linkedMapOf<String, String>()

    externalDirs
      .filterNotNull()
      .forEach { directory ->
        val canonicalPath = directory.canonicalPath
        if (canonicalPath.startsWith(rootPath)) {
          return@forEach
        }

        val androidMarker = "/Android/"
        val rootCandidate =
          if (canonicalPath.contains(androidMarker)) {
            canonicalPath.substringBefore(androidMarker)
          } else {
            canonicalPath.substringBefore("/$packageName", canonicalPath)
          }

        val candidateFile = File(rootCandidate)
        if (candidateFile.exists() && candidateFile.canRead()) {
          val normalizedPath = candidateFile.canonicalPath.lowercase(Locale.ROOT)
          val kind =
            if (normalizedPath.contains("usb") || normalizedPath.contains("otg")) "usb" else "sd-card"
          discovered[candidateFile.canonicalPath] = kind
        }
      }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val storageManager =
        reactApplicationContext.getSystemService(Context.STORAGE_SERVICE) as? StorageManager

      storageManager?.storageVolumes?.forEach { volume ->
        if (!volume.isRemovable) {
          return@forEach
        }

        val directory = volume.directory ?: return@forEach
        if (directory.exists() && directory.canRead()) {
          val description = volume.getDescription(reactApplicationContext).lowercase(Locale.ROOT)
          val normalizedPath = directory.canonicalPath.lowercase(Locale.ROOT)
          val kind =
            if (
              description.contains("usb") ||
                description.contains("otg") ||
                normalizedPath.contains("usb") ||
                normalizedPath.contains("otg")
            ) {
              "usb"
            } else {
              "sd-card"
            }
          discovered[directory.canonicalPath] = kind
        }
      }
    }

    return discovered.map { entry -> entry.key to entry.value }
  }

  private fun resolveMimeType(file: File): String {
    if (file.isDirectory) {
      return "resource/folder"
    }

    val extension = file.extension.lowercase(Locale.ROOT)
    if (extension.isBlank()) {
      return "application/octet-stream"
    }

    return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
      ?: if (extension == "apk") "application/vnd.android.package-archive" else null
      ?: "application/octet-stream"
  }

  private fun drawableToBase64(drawable: Drawable): String {
    val bitmap =
      if (drawable is BitmapDrawable && drawable.bitmap != null) {
        drawable.bitmap
      } else {
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 96
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 96
        Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { bitmap ->
          val canvas = Canvas(bitmap)
          drawable.setBounds(0, 0, canvas.width, canvas.height)
          drawable.draw(canvas)
        }
      }

    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
    return Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
  }

  private fun toNodeMap(file: File) =
    Arguments.createMap().apply {
      val extension = file.extension.lowercase(Locale.ROOT)
      val isDirectory = file.isDirectory

      putString("id", file.absolutePath)
      putString("name", file.name)
      putString("path", file.absolutePath)
      putString("kind", if (isDirectory) "directory" else "file")
      putString("providerId", "local")
      putString("modifiedAt", Instant.ofEpochMilli(file.lastModified()).toString())

      if (isDirectory) {
        putInt("childCount", file.listFiles()?.size ?: 0)
      } else {
        putDouble("sizeBytes", file.length().toDouble())
        if (extension.isNotEmpty()) {
          putString("extension", extension)
          putString("mimeType", resolveMimeType(file))
        } else {
          putNull("extension")
          putString("mimeType", "application/octet-stream")
        }
      }

      putMap(
        "permissions",
        Arguments.createMap().apply {
          putBoolean("canRead", file.canRead())
          putBoolean("canWrite", file.canWrite())
          putBoolean("canDelete", file.canWrite())
          putBoolean("canShare", file.canRead())
        },
      )
    }
}
