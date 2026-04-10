package com.filemanagerpro

import android.content.Context
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.storage.StorageManager
import android.util.Base64
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.IOException
import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Locale

class LocalFileSystemModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private var mediaPlayer: MediaPlayer? = null
  private var mediaPath: String? = null

  override fun getName(): String = "LocalFileSystemModule"

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
        directory
          .listFiles()
          ?.sortedWith(
            compareBy<File>({ !it.isDirectory }, { it.name.lowercase(Locale.ROOT) })
          )
          ?: emptyList()

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
          includeSystemApps ||
            (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0
        }
        .sortedBy { packageManager.getApplicationLabel(it).toString().lowercase(Locale.ROOT) }
        .forEach { appInfo ->
          val sourceFile = File(appInfo.sourceDir ?: "")
          val label = packageManager.getApplicationLabel(appInfo).toString()
          val map = Arguments.createMap()
          map.putString("packageName", appInfo.packageName)
          map.putString("label", label)
          map.putDouble("sizeBytes", sourceFile.length().toDouble())
          map.putString("sourceDir", appInfo.sourceDir)
          map.putBoolean(
            "isSystemApp",
            (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0,
          )
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

      val intent =
        Intent(Intent.ACTION_DELETE).apply {
          data = Uri.parse("package:$packageName")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

      activity.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_UNINSTALL_FAILED", error.message, error)
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
  fun getMediaPlaybackStatus(promise: Promise) {
    try {
      promise.resolve(mediaStatusMap())
    } catch (error: Exception) {
      promise.reject("LOCAL_FS_MEDIA_STATUS_FAILED", error.message, error)
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

  private fun isPathInsideAllowedRoot(path: String): Boolean {
    val canonicalPath = File(path).canonicalPath
    val allowedRoots =
      listOf(getExternalStorageRoot().canonicalPath) +
        resolveRemovableStorageDevices().map { device -> File(device.first).canonicalPath }

    return allowedRoots.any { rootPath ->
      canonicalPath == rootPath || canonicalPath.startsWith("$rootPath/")
    }
  }

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
