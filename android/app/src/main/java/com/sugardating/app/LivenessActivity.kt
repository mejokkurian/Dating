package com.sugardating.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.amplifyframework.ui.liveness.ui.FaceLivenessDetector
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface

class LivenessActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sessionId = intent.getStringExtra("SESSION_ID")

        if (sessionId == null) {
            finish()
            return
        }

        setContent {
            MaterialTheme {
                Surface {
                    FaceLivenessDetector(
                        sessionId = sessionId,
                        region = "us-east-1",
                        onComplete = {
                            // On Success, we just finish. The Module (wrapper) needs to know this.
                            // Currently, we just finish. We might need to setResult if we want to pass data back.
                            // But usually, the backend verification is independent.
                            // Ideally we set result OK.
                            setResult(RESULT_OK)
                            finish()
                        },
                        onError = { error ->
                            // On Error
                             setResult(RESULT_CANCELED)
                            finish()
                        }
                    )
                }
            }
        }
    }
}
