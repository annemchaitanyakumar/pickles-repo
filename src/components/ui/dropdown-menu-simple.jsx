import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from "@/lib/utils";

const DropdownContext = createContext({
  isOpen: false,
  setIsOpen: () => {},
});

export const DropdownMenu = ({ trigger, children, className, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block" ref={dropdownRef}>
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
        {isOpen && (
          <div
            className={cn(
              "absolute mt-2 min-w-[8rem] rounded-lg shadow-lg",
              "bg-white border border-gray-200",
              "dark:bg-gray-800 dark:border-gray-700",
              align === 'left' ? 'left-0' : 'right-0',
              className
            )}
            style={{
              zIndex: 1000,
              transformOrigin: 'top'
            }}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
};

export const DropdownMenuContent = ({ children, className }) => (
  <div className={cn(
    "py-2 px-1",
    className
  )}>
    {children}
  </div>
);

export const DropdownMenuItem = ({ children, className, onClick }) => {
  const { setIsOpen } = useContext(DropdownContext);
  
  return (
    <button
      onClick={(e) => {
        onClick?.(e);
        setIsOpen(false); // Close dropdown after click
      }}
      className={cn(
        "w-full text-left px-4 py-2 text-sm",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700",
        "text-gray-700 dark:text-gray-200",
        "transition-colors duration-150 ease-in-out",
        "rounded-md",
        className
      )}
    >
      {children}
    </button>
  );
};

export const DropdownMenuLabel = ({ children, className }) => (
  <div className={cn(
    "px-4 py-2 text-sm font-semibold",
    "text-gray-700 dark:text-gray-300",
    className
  )}>
    {children}
  </div>
);

export const DropdownMenuSeparator = ({ className }) => (
  <div className={cn(
    "h-px my-1 mx-2",
    "bg-gray-200 dark:bg-gray-700",
    className
  )} />
);

export const DropdownMenuGroup = ({ children, className }) => (
  <div className={cn("py-1", className)}>
    {children}
  </div>
);