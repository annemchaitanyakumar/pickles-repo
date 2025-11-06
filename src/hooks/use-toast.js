import * as React from "react";
import PropTypes from "prop-types";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

/**
 * @typedef {Object} ToastProps
 * @property {string} [variant] - The variant of the toast
 * @property {string} [duration] - How long the toast should stay visible
 */

/**
 * @typedef {Object} ToasterToast
 * @property {string} id - Unique identifier for the toast
 * @property {React.ReactNode} [title] - Title of the toast
 * @property {React.ReactNode} [description] - Description of the toast
 * @property {React.ReactElement} [action] - Action element for the toast
 * @property {ToastProps} props - Additional toast properties
 */

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

// Action creators
const addToast = (toast) => ({
  type: actionTypes.ADD_TOAST,
  toast,
});

const updateToast = (toast) => ({
  type: actionTypes.UPDATE_TOAST,
  toast,
});

const dismissToast = (toastId) => ({
  type: actionTypes.DISMISS_TOAST,
  toastId,
});

const removeToast = (toastId) => ({
  type: actionTypes.REMOVE_TOAST,
  toastId,
});

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId || action.toastId === "all"
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === "all") {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
};

const listeners = new Set();

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

export function toast({ ...props }) {
  const id = Math.random().toString(36).substring(2, 9);

  const update = (props) =>
    dispatch(
      updateToast({
        ...props,
        id,
      })
    );

  const dismiss = () => dispatch(dismissToast(id));

  dispatch(
    addToast({
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    })
  );

  return {
    id,
    dismiss,
    update,
  };
}

export function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.add(setState);
    return () => listeners.delete(setState);
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch(dismissToast(toastId)),
  };
}

// PropTypes
toast.propTypes = {
  title: PropTypes.node,
  description: PropTypes.node,
  action: PropTypes.element,
  variant: PropTypes.string,
  duration: PropTypes.number,
};
