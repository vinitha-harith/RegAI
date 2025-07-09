'use client';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: ReactNode;
}

export const Accordion = ({ title, children }: PropsWithChildren<AccordionProps>) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full p-6 text-left"
      >
        <div className="flex items-center">
            {title}
        </div>
        <ChevronDown
          className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="p-6 border-t border-gray-200">
            {children}
        </div>
      )}
    </div>
  );
};