//
//  CallKitManager.m
//  SugarDating
//
//  React Native bridge for CallKitManager
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(CallKitManager, RCTEventEmitter)

RCT_EXTERN_METHOD(displayIncomingCall:(NSString *)callerId
                  callerName:(NSString *)callerName
                  hasVideo:(BOOL)hasVideo
                  callback:(RCTResponseSenderBlock)callback)

RCT_EXTERN_METHOD(endCall:(RCTResponseSenderBlock)callback)

RCT_EXTERN_METHOD(reportCallEnded:(NSString *)reason
                  callback:(RCTResponseSenderBlock)callback)

@end
