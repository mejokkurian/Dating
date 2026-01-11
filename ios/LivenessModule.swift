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
                  switch result {
                  case .success:
                      resolver("Success")
                  case .failure(let error):
                      rejecter("LIVENESS_FAILED", error.localizedDescription, error)
                  default:
                       // Treat others as success for now, or handle specifically
                      resolver("Success")
                  }
                  // Dimiss handled by isPresented binding usually, but if we presented a VM, we dismiss it
                  rootViewController.dismiss(animated: true)
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
