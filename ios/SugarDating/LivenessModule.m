#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LivenessModule, NSObject)

RCT_EXTERN_METHOD(startLiveness:(NSString *)sessionId
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)

@end
