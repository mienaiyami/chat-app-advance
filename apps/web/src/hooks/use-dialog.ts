import { useState } from "react";

type UseDialogReturn<T> = {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    triggerProps: {
        onClick: () => void;
        ref?: React.RefObject<T>;
    };
};

export function useDialog<T extends HTMLElement>(): UseDialogReturn<T> {
    const [isOpen, setIsOpen] = useState(false);

    return {
        isOpen,
        setIsOpen,
        triggerProps: {
            onClick: () => setIsOpen(true),
        },
    };
}
