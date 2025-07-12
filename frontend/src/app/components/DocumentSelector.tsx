'use client';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

interface DocumentSelectorProps {
  documents: string[];
  selectedDocument: string;
  onSelectDocument: (doc: string) => void;
  isLoading: boolean;
}

export const DocumentSelector = ({ documents, selectedDocument, onSelectDocument, isLoading }: DocumentSelectorProps) => (
  // Use max-w-full to ensure it behaves well on small screens, and a specific max-width for larger screens.
  <div className="w-full max-w-md">
    <Select.Root value={selectedDocument} onValueChange={onSelectDocument} disabled={isLoading}>
      <Select.Trigger 
        className="inline-flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 w-full"
        aria-label="Select Document"
      >
        <span className="w-256 truncate"> {/* Add truncate to prevent ugly text wrapping */}
            <Select.Value placeholder="Select a document to analyze..." />
        </span>
        <Select.Icon className="ml-2">
          <ChevronDown className="h-4 w-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content 
          position="popper" 
          sideOffset={5} 
          className="w-[--radix-select-trigger-width] bg-white rounded-md shadow-lg border z-50"
        >
          <Select.Viewport className="p-1">
            {documents.map(doc => (
              <Select.Item 
                key={doc} 
                value={doc} 
                className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-md relative hover:bg-red-50 cursor-pointer select-none outline-none data-[highlighted]:bg-red-100 data-[state=checked]:font-semibold"
              >
                <Select.ItemText>{doc}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-2 inline-flex items-center">
                  <Check className="h-4 w-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>
);