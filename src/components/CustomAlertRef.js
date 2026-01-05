import React, { useState, forwardRef, useImperativeHandle } from 'react';
import CustomAlert from './CustomAlert';

const CustomAlertRef = forwardRef((props, ref) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    buttons: [],
    onClose: null,
    onConfirm: null,
  });

  useImperativeHandle(ref, () => ({
    show: (config) => {
      setAlertConfig({
        visible: true,
        title: config.title || '',
        message: config.message || '',
        type: config.type || 'default',
        buttons: config.buttons || [],
        onClose: () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          config.onClose?.();
        },
        onConfirm: config.onConfirm || null,
      });
    },
    hide: () => {
      setAlertConfig(prev => ({ ...prev, visible: false }));
    },
  }));

  return (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      type={alertConfig.type}
      buttons={alertConfig.buttons}
      onClose={alertConfig.onClose}
      onConfirm={alertConfig.onConfirm}
    />
  );
});

CustomAlertRef.displayName = 'CustomAlertRef';

export default CustomAlertRef;
