import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSOS } from './sos/useSOS';
import SOSIdleView from './sos/SOSIdleView';
import SOSActiveView from './sos/SOSActiveView';

const SOSScreen = () => {
  const { user } = useAuth();
  const sos = useSOS(user);

  const locationLine = sos.location
    ? `${sos.location.latitude.toFixed(4)}, ${sos.location.longitude.toFixed(4)}` +
      (sos.locationSource === 'last_known' ? ' (last known)' : '')
    : (sos.isActive ? 'Location unavailable — security will call you' : 'Detecting...');

  if (sos.isActive) {
    return (
      <SOSActiveView
        user={user}
        backendStatus={sos.backendStatus}
        locationLine={locationLine}
        onRetry={sos.retry}
        onCancel={sos.cancel}
      />
    );
  }

  return (
    <SOSIdleView
      user={user}
      holdProgress={sos.holdProgress}
      gpsSignal={sos.gpsSignal}
      locationLine={locationLine}
      onPressIn={sos.startHold}
      onPressOut={sos.endHold}
      onLongPress={sos.fireOnce}
    />
  );
};

export default SOSScreen;
