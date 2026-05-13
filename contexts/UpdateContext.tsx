import React, { createContext, useContext, useState } from "react";

interface UpdateContextValue {
  hasUpdate: boolean;
  setHasUpdate: (v: boolean) => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
}

const UpdateContext = createContext<UpdateContextValue>({
  hasUpdate: false,
  setHasUpdate: () => {},
  showModal: false,
  setShowModal: () => {},
});

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSetHasUpdate = (v: boolean) => {
    setHasUpdate(v);
    if (v) setShowModal(true);
  };

  return (
    <UpdateContext.Provider value={{ hasUpdate, setHasUpdate: handleSetHasUpdate, showModal, setShowModal }}>
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdateStatus() {
  return useContext(UpdateContext);
}
