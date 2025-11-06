import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Package2, Box } from 'lucide-react';

export function PackagingSelect({ value, onChange, quantity, containerCharges }) {
  if (!containerCharges) {
    return null; // Don't render if container charges not provided
  }
  const containerFee = containerCharges * quantity;

  return (
    <div className="flex-shrink-0">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[120px] px-2">
          <SelectValue placeholder="Select Packing">
            {value === 'container' && (
              <div className="flex items-center gap-2">
                <Package2 className="h-4 w-4" />
                <span className="text-xs">Container</span>
              </div>
            )}
            {value === 'general' && (
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                <span className="text-xs">General</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="container">
            <div className="flex items-center gap-2">
              <Package2 className="h-4 w-4 sm:inline" />
              <span>Container (+₹{containerFee})</span>
            </div>
          </SelectItem>
          <SelectItem value="general">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 sm:inline" />
              <span>General Packing</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}