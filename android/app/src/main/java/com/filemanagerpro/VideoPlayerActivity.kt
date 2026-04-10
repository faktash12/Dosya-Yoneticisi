package com.filemanagerpro

import android.app.Activity
import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import android.widget.MediaController
import android.widget.VideoView
import java.io.File

class VideoPlayerActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    window.decorView.systemUiVisibility =
      View.SYSTEM_UI_FLAG_FULLSCREEN or
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY

    val videoPath = intent.getStringExtra(EXTRA_VIDEO_PATH)
    if (videoPath.isNullOrBlank() || !File(videoPath).exists()) {
      finish()
      return
    }

    val videoView =
      VideoView(this).apply {
        layoutParams =
          FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
          )
        setVideoPath(videoPath)
        setMediaController(
          MediaController(this@VideoPlayerActivity).also { controller ->
            controller.setAnchorView(this)
          },
        )
        setOnPreparedListener { player ->
          player.isLooping = false
          start()
        }
      }

    setContentView(
      FrameLayout(this).apply {
        setBackgroundColor(android.graphics.Color.BLACK)
        addView(videoView)
      },
    )
  }

  companion object {
    const val EXTRA_VIDEO_PATH = "com.filemanagerpro.EXTRA_VIDEO_PATH"
  }
}
