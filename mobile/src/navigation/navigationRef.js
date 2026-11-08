import { createNavigationContainerRef } from '@react-navigation/native';

// Lets non-screen code (push notification taps) navigate.
export const navigationRef = createNavigationContainerRef();

export const navigateWhenReady = (name, params) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
    return true;
  }
  return false;
};
