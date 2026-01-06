import {
    
  StyleSheet,
  Platform,
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  messageList: {
    paddingVertical: 16,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    minWidth: 100,
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  highlightedMessage: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)', // Gold with opacity
    borderColor: '#FFD700',
    borderWidth: 1,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#000000',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#000000',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.6)',
  },
  theirTimeText: {
    color: '#999999',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#FFF',
  },
  cameraButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    flexShrink: 0,
  },
  stickerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    flexShrink: 0,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    minHeight: 50,
    maxHeight: 120,
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    maxHeight: 120,
    paddingRight: 8,
  },
  stickerButtonInside: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  micButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingFullContainer: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingLeftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  slideToCancel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
  },
  recordingTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timestampInBubble: {
    fontSize: 9,
    color: '#888888',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingInputContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  pendingInputText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
  hintToast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 1000,
  },
  hintText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  holdHintContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdHintText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  holdHintPermanent: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  holdHintPermanentText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  // Action Sheet Styles (WhatsApp Style)
  actionSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  whatsappActionContainer: {
    width: '100%',
    maxWidth: 400,
    zIndex: 1001,
  },
  // Emoji Reactions Bar
  emojiBar: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  emojiButton: {
    padding: 6,
  },
  emojiText: {
    fontSize: 24,
  },
  emojiPlusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Message Preview
  messagePreview: {
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    minHeight: 60,
  },
  messagePreviewMine: {
    backgroundColor: '#000',
  },
  messagePreviewTheirs: {
    backgroundColor: '#E5E5EA',
  },
  previewAudioContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  previewTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  // Action Menu
  whatsappActionMenu: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  whatsappActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  whatsappActionText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '400',
  },
  // Pinned Message Styles
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    justifyContent: 'space-between',
  },
  pinnedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  pinnedIcon: {
    transform: [{ rotate: '45deg' }],
  },
  pinnedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  pinnedText: {
    fontSize: 12,
    color: '#666',
  },
  unpinButton: {
    padding: 5,
  },
  // Pinned Message Banner (Top of Chat)
  pinnedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5B4',
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pinnedMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  pinnedMessageIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  pinnedMessageIconInner: {
    transform: [{ rotate: '-45deg' }],
  },
  pinnedMessageText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#8B6914',
    lineHeight: 16,
  },
  pinnedMessageUnpinButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.1)', // Light gold background
    borderRadius: 4,
  },
  pinnedIndicatorMine: {
    alignSelf: 'flex-end', // Align to right for my messages
  },
  pinnedIndicatorTheirs: {
    alignSelf: 'flex-start', // Align to left for their messages
  },
  pinnedLabel: {
    fontSize: 11,
    color: '#B8860B', // Dark gold color
    fontWeight: '600',
  },
  pinnedBubble: {
    borderWidth: 2,
    borderColor: '#FFD700', // Gold border for pinned messages
  },
  starIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 1,
  },
  // Reply Styles
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 10,
  },
  replyBar: {
    width: 4,
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#666',
  },
  // Reply Context in Message Bubble (WhatsApp Style)
  replyContext: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 6,
    paddingLeft: 8,
    marginBottom: 6,
    gap: 8,
  },
  replyContextMine: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  replyContextTheirs: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  replyBorder: {
    width: 2,
    borderRadius: 1,
  },
  replyContentWrapper: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  replySenderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyMessageText: {
    fontSize: 12,
    lineHeight: 16,
  },
  replyAudioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Image Message Styles
  imageMessageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  viewOnceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 1,
    minWidth: 100,
  },
  viewOnceIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewOnceTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  viewOnceIconSmallTheirs: {
    borderColor: '#666',
  },
  viewOnceTextSmallTheirs: {
    color: '#666',
  },
  viewOnceLabelSmall: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Call Button Styles
  callButtons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default styles;
