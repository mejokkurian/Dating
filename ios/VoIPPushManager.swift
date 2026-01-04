//
//  VoIPPushManager.swift
//  SugarDating
//
//  Manages VoIP push notifications
//

import Foundation
import PushKit
import CallKit

@objc(VoIPPushManager)
class VoIPPushManager: RCTEventEmitter {
  
  private var voipRegistry: PKPushRegistry?
  private var callKitManager: CallKitManager?
  
  override init() {
    super.init()
    setupVoIPPush()
  }
  
  private func setupVoIPPush() {
    voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
    voipRegistry?.delegate = self
    voipRegistry?.desiredPushTypes = [.voIP]
  }
  
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func supportedEvents() -> [String]! {
    return ["VoIPPushReceived", "VoIPTokenReceived"]
  }
  
  @objc
  func getVoIPToken(_ callback: @escaping RCTResponseSenderBlock) {
    if let token = voipRegistry?.pushToken(for: .voIP) {
      let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
      callback([["token": tokenString]])
    } else {
      callback([["error": "No VoIP token available"]])
    }
  }
}

// MARK: - PKPushRegistryDelegate

extension VoIPPushManager: PKPushRegistryDelegate {
  
  func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    guard type == .voIP else { return }
    
    let token = pushCredentials.token.map { String(format: "%02.2hhx", $0) }.joined()
    print("📱 VoIP Push Token: \(token)")
    
    // Send token to React Native
    sendEvent(withName: "VoIPTokenReceived", body: ["token": token])
  }
  
  func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    guard type == .voIP else {
      completion()
      return
    }
    
    print("📱 VoIP Push Received: \(payload.dictionaryPayload)")
    
    // Extract call information from payload
    guard let aps = payload.dictionaryPayload["aps"] as? [String: Any],
          let callData = aps["call"] as? [String: Any],
          let callerId = callData["callerId"] as? String,
          let callerName = callData["callerName"] as? String else {
      completion()
      return
    }
    
    let hasVideo = (callData["callType"] as? String) == "video"
    
    // Display CallKit UI
    if callKitManager == nil {
      callKitManager = CallKitManager()
    }
    
    callKitManager?.displayIncomingCall(callerId, callerName: callerName, hasVideo: hasVideo) { result in
      if let error = result.first as? [String: Any], error["error"] != nil {
        print("❌ Failed to display CallKit UI: \(error)")
      } else {
        print("✅ CallKit UI displayed")
      }
      completion()
    }
    
    // Also notify React Native
    sendEvent(withName: "VoIPPushReceived", body: [
      "callerId": callerId,
      "callerName": callerName,
      "callType": hasVideo ? "video" : "audio"
    ])
  }
  
  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    print("⚠️ VoIP Push Token Invalidated")
  }
}
