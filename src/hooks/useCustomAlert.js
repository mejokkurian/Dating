import { useState } from 'react';

export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: null,
    buttons: null,
  });

  const showAlert = (title, message, type = 'error', onConfirm = null, buttons = null) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const handleConfirm = () => {
    const onConfirm = alertConfig.onConfirm;
    hideAlert();
    if (onConfirm) {
      onConfirm();
    }
  };

  return {
    alertConfig,
    showAlert,
    hideAlert,
    handleConfirm,
  };
};

