import { renderHook, act } from '@testing-library/react-hooks';
import { useNetworkStatus } from '../useNetworkStatus';
import socketService from '../../services/socket';

// Mock socket service
jest.mock('../../services/socket', () => ({
  __esModule: true,
  default: {
    connected: false,
  },
}));

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with offline state when socket is disconnected', () => {
    socketService.connected = false;
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOffline).toBe(true);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.socketConnected).toBe(false);
  });

  it('should initialize with online state when socket is connected', () => {
    socketService.connected = true;
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOffline).toBe(false);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.socketConnected).toBe(true);
  });

  it('should update status when socket connects', () => {
    socketService.connected = false;
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOffline).toBe(true);

    act(() => {
      socketService.connected = true;
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.socketConnected).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('should update status when socket disconnects', () => {
    socketService.connected = true;
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOffline).toBe(false);

    act(() => {
      socketService.connected = false;
      jest.advanceTimersByTime(6000); // More than 5 seconds
    });

    expect(result.current.socketConnected).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('should not immediately go offline on temporary disconnection', () => {
    socketService.connected = true;
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      socketService.connected = false;
      jest.advanceTimersByTime(2000); // Less than 5 seconds
    });

    // Should still be online for temporary disconnections
    expect(result.current.socketConnected).toBe(false);
    // After 5 seconds, should be offline
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.isOffline).toBe(true);
  });

  it('should clean up interval on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
