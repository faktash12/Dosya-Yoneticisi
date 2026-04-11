package com.filemanagerpro

import android.app.Activity
import android.content.pm.ActivityInfo
import android.graphics.Color
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.MediaController
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.VideoView
import java.io.File

class VideoPlayerActivity : Activity() {
  private lateinit var videoView: VideoView
  private lateinit var loadingView: ProgressBar
  private lateinit var errorView: TextView
  private lateinit var fullscreenButton: TextView
  private lateinit var rotateButton: TextView
  private var isFullscreen = false

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

    videoView =
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
          loadingView.visibility = View.GONE
          errorView.visibility = View.GONE
          isFullscreen = player.videoWidth > 0 && player.videoWidth >= player.videoHeight
          applyOrientation()
          player.isLooping = false
          start()
        }
        setOnInfoListener { _, what, _ ->
          // MEDIA_INFO_VIDEO_RENDERING_START
          if (what == 3) {
            loadingView.visibility = View.GONE
          }
          false
        }
        setOnErrorListener { _, _, _ ->
          loadingView.visibility = View.GONE
          errorView.visibility = View.VISIBLE
          true
        }
      }

    loadingView =
      ProgressBar(this).apply {
        isIndeterminate = true
        layoutParams =
          FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER,
          )
      }

    errorView =
      TextView(this).apply {
        text = "Video acilamadi."
        setTextColor(Color.WHITE)
        visibility = View.GONE
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        layoutParams =
          FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER,
          )
      }

    val controlsContainer =
      LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.END
        setPadding(dp(12), dp(16), dp(12), dp(12))
        layoutParams =
          FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP or Gravity.END,
          )
      }

    val closeButton =
      createOverlayButton("X").apply {
        setOnClickListener {
          finish()
        }
      }

    rotateButton =
      createOverlayButton("↻").apply {
        setOnClickListener {
          isFullscreen = requestedOrientation == ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
          applyOrientation()
        }
      }

    fullscreenButton =
      createOverlayButton("⤢").apply {
        setOnClickListener {
          isFullscreen = !isFullscreen
          applyOrientation()
        }
      }

    controlsContainer.addView(closeButton)
    controlsContainer.addView(rotateButton)
    controlsContainer.addView(fullscreenButton)

    setContentView(
      FrameLayout(this).apply {
        setBackgroundColor(Color.BLACK)
        addView(videoView)
        addView(loadingView)
        addView(errorView)
        addView(controlsContainer)
      },
    )
  }

  override fun onBackPressed() {
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    super.onBackPressed()
  }

  override fun onDestroy() {
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    super.onDestroy()
  }

  private fun applyOrientation() {
    requestedOrientation =
      if (isFullscreen) {
        ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
      } else {
        ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
      }

    fullscreenButton.text = if (isFullscreen) "⇲" else "⤢"
    rotateButton.text = if (isFullscreen) "↺" else "↻"
  }

  private fun createOverlayButton(label: String): TextView =
    TextView(this).apply {
      text = label
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
      setPadding(dp(12), dp(8), dp(12), dp(8))
      setBackgroundColor(Color.parseColor("#660F172A"))
      layoutParams =
        LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.WRAP_CONTENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply {
          marginStart = dp(8)
        }
    }

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      value.toFloat(),
      resources.displayMetrics,
    ).toInt()

  companion object {
    const val EXTRA_VIDEO_PATH = "com.filemanagerpro.EXTRA_VIDEO_PATH"
  }
}
