package com.sugardating.app

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseJavaModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LivenessModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var livenessPromise: Promise? = null
    private val LIVENESS_REQUEST_CODE = 9001

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String {
        return "LivenessModule"
    }

    @ReactMethod
    fun startLiveness(sessionId: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("ACTIVITY_NOT_FOUND", "Current activity unavailable")
            return
        }

        livenessPromise = promise
        try {
            val intent = Intent(activity, LivenessActivity::class.java)
            intent.putExtra("SESSION_ID", sessionId)
            activity.startActivityForResult(intent, LIVENESS_REQUEST_CODE)
        } catch (e: Exception) {
            livenessPromise = null
            promise.reject("START_FAILED", e)
        }
    }

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == LIVENESS_REQUEST_CODE) {
            if (livenessPromise != null) {
                if (resultCode == Activity.RESULT_OK) {
                    livenessPromise?.resolve("Success")
                } else {
                    livenessPromise?.reject("LIVENESS_FAILED", "User cancelled or verification failed")
                }
                livenessPromise = null
            }
        }
    }

    override fun onNewIntent(intent: Intent?) {
        // Not used
    }
}
