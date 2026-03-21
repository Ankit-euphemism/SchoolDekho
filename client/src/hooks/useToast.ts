import toast from 'react-hot-toast';

export const useToast = () => {
  const showSuccess = (message: string, options = {}) => {
    toast.success(message, {
      duration: 4000,
      ...options,
    });
  };

  const showError = (message: string, options = {}) => {
    toast.error(message, {
      duration: 5000,
      ...options,
    });
  };

  const showLoading = (message: string, options = {}) => {
    return toast.loading(message, {
      ...options,
    });
  };

  const dismissToast = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  return {
    showSuccess,
    showError,
    showLoading,
    dismissToast,
  };
};
