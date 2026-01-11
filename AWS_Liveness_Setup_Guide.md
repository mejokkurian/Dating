# AWS Face Liveness Integration Guide

This guide documents the complete process for integrating AWS Rekognition Face Liveness into the React Native mobile app (`SugarDating`).

---

## 1. AWS Console Configuration

### 1.1. Create Cognito Identity Pool
1.  Go to **Amazon Cognito** Console.
2.  Click **Identity Pools**.
3.  Click **Create identity pool**.
    - **Step 1: Identity pool properties**:
        - **Name**: e.g., `datingAppLiveness`.
        - **Unauthenticated identity access**: **Enable** (Check "Enable access to unauthenticated identities").
    - **Step 2: Permissions**:
        - Create a new IAM role for **Unauthenticated** users (e.g., `StartLivenessGuestRole`).
        - Create a new IAM role for **Authenticated** users.
    - **Review and Create**.
4.  Note down the **Identity Pool ID** (e.g., `us-east-1:xxxx-xxxx...`).

### 1.2. Configure IAM Permissions (The "Error 1" Fix)
By default, the guest role cannot start liveness sessions. You must add permission manually.

1.  Go to **IAM Console**.
2.  Find the **Role** you created for Unauthenticated users (e.g., `Unauth_Role` or `GuestRole`).
3.  Click **Add permissions** -> **Create inline policy**.
4.  Select **JSON** and paste:
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "rekognition:StartFaceLivenessSession",
                "Resource": "*"
            }
        ]
    }
    ```
5.  Name it `LivenessAccess` and **Create**.

### 1.3. Create Backend IAM User
Your Node.js backend needs a user with permissions to talk to Rekognition.

1.  Go to **IAM Console** -> **Users** -> **Create user**.
2.  Name: `dating-app-backend`.
3.  Attach policies directly: `AmazonRekognitionFullAccess` (or scope it down to just `CreateFaceLivenessSession`, `GetFaceLivenessSessionResults`, `CompareFaces`).
4.  Create **Access Keys** for this user.
5.  Save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

---

## 2. Project Configuration

### 2.1. Backend (`.env`)
Update your backend `.env` file with the keys from Step 1.3:
```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...
AWS_REGION=us-east-1
```

### 2.2. Native Configuration File (`amplifyconfiguration.json`)
You need a file named `amplifyconfiguration.json` containing your **Identity Pool ID** from Step 1.1.

**Template:**
```json
{
    "UserAgent": "aws-amplify-cli/2.0",
    "Version": "1.0",
    "auth": {
        "plugins": {
            "awsCognitoAuthPlugin": {
                "CredentialsProvider": {
                    "CognitoIdentity": {
                        "Default": {
                            "PoolId": "us-east-1:YOUR-IDENTITY-POOL-ID-HERE",
                            "Region": "us-east-1"
                        }
                    }
                }
            }
        }
    }
}
```
**Place this file in TWO locations:**
1.  **Android**: `android/app/src/main/res/raw/amplifyconfiguration.json`
2.  **iOS**: `ios/SugarDating/amplifyconfiguration.json` (Must be added to Xcode).

---

## 3. iOS Integration (Complex)

### 3.1. Install Dependencies
1.  **Podfile**:
    - Remove old `AWSFaceLiveness` pods if present.
    - Run `pod install` in `ios/` directory to clean up.
2.  **Xcode Packages (SPM)**:
    - Open `ios/SugarDating.xcworkspace` in Xcode.
    - File -> Add Package Dependencies.
    - URL: `https://github.com/aws-amplify/amplify-ui-swift-liveness`
    - Select Product: **FaceLiveness**.
    - **Critical**: Go to Targets -> SugarDating -> General -> **Frameworks & Libraries** -> Click `+` -> Add `FaceLiveness`.

### 3.2. Native Files
Ensure `LivenessModule.swift` and `LivenessModule.m` are in your project.
- **Critical**: In Xcode, select these files -> Right Sidebar -> **Target Membership** -> Check `SugarDating`.

### 3.3. Update `AppDelegate.swift`
Initialize Amplify at app launch:
```swift
import Amplify
import AWSCognitoAuthPlugin

// inside didFinishLaunchingWithOptions...
do {
  try Amplify.add(plugin: AWSCognitoAuthPlugin())
  try Amplify.configure()
} catch {
  print("Failed to initialize Amplify: \(error)")
}
```

---

## 4. Android Integration

### 4.1. Dependencies
**`android/app/build.gradle`**:
```gradle
dependencies {
    implementation 'com.amplifyframework.ui:liveness:1.3.0'
    implementation 'com.amplifyframework:aws-auth-cognito:2.14.9'
    implementation "androidx.activity:activity-compose:1.7.0"
}
```

### 4.2. Update `MainApplication.kt`
Initialize Amplify:
```kotlin
// inside onCreate...
try {
    Amplify.addPlugin(AWSCognitoAuthPlugin())
    Amplify.configure(applicationContext)
} catch (error: AmplifyException) {
    Log.e("Amplify", "Could not initialize Amplify", error)
}
```

---

## 5. Troubleshooting

| Error | Cause | Fix |
| :--- | :--- | :--- |
| **"LivenessModule is not linked"** | Native files not compiled. | **iOS**: Check "Target Membership" box in Xcode for `LivenessModule.swift/.m`. <br>**Android**: Ensure `LivenessPackage()` is added in `MainApplication.kt`. |
| **"Call must be made on main thread"** | Crash in iOS UI dismissal. | Wrap `rootViewController.dismiss` in `DispatchQueue.main.async` in `LivenessModule.swift`. |
| **"FaceLivenessDetectionError error 1"** | AWS Access Denied. | Add `rekognition:StartFaceLivenessSession` policy to the **Google/Guest Role** in IAM Console. |
| **"Missing package product 'FaceLiveness'"** | SPM Package stuck. | Xcode -> File -> Packages -> **Reset Package Caches**. Then Clean Build Folder. |
