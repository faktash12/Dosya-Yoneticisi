package com.filemanagerpro

import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Locale

class LocalFileSystemModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

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
    val root = getExternalStorageRoot().canonicalFile
    if (!path.startsWith(root.path)) {
      throw IllegalArgumentException("Bu kaynak uygulamanın erişim alanı dışında: $path")
    }
  }

  private fun resolveDestinationEntry(
    source: File,
    destinationDirectory: File,
    conflictStrategy: String,
  ): File {
    val candidate = File(destinationDirectory, source.name).canonicalFile

    if (!candidate.path.startsWith(getExternalStorageRoot().canonicalPath)) {
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

  private fun getExternalStorageRoot(): File {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      Environment.getExternalStorageDirectory()
    } else {
      @Suppress("DEPRECATION")
      Environment.getExternalStorageDirectory()
    }
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
      ?: "application/octet-stream"
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
