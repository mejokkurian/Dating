import Foundation
import React
import SwiftUI
import Amplify
import AWSCognitoAuthPlugin
import FaceLiveness

@objc(LivenessModule)
class LivenessModule: NSObject {

  @objc(startLiveness:resolver:rejecter:)
  func startLiveness(_ sessionId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.main.async {
          guard let keyWindow = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) ?? UIApplication.shared.windows.first,
                let rootViewController = keyWindow.rootViewController else {
              rejecter("NO_ROOT_VIEW", "Could not find root view controller", nil)
              return
          }

          let livenessView = FaceLivenessDetectorView(
              sessionID: sessionId,
              region: "us-east-1",
              isPresented: .constant(true),
              onCompletion: { result in
                  DispatchQueue.main.async {
                      switch result {
                      case .success:
                          resolver("Success")
                      case .failure(let error):
                          print("❌ Liveness Failure: \(error)")
                          let nsError = error as NSError
                          rejecter("LIVENESS_FAILED", error.localizedDescription, nsError)
                      default:
                          resolver("Success")
                      }
                      rootViewController.dismiss(animated: true)
                  }
              }
          )
          
          let hostingController = UIHostingController(rootView: livenessView)
          hostingController.modalPresentationStyle = .fullScreen
          rootViewController.present(hostingController, animated: true)
      }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
