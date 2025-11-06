import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export const OrderFor = ({ value, onChange }) => (
  <div className="mb-6 border p-4 rounded-lg bg-white shadow-sm">
    <h3 className="text-lg font-semibold mb-4 text-gray-800">Who's this order for?</h3>
    <RadioGroup 
      value={value} 
      onValueChange={onChange} 
      className="flex flex-col sm:flex-row gap-6"
      defaultValue={value}
    >
      <div className="flex items-center space-x-3 relative pl-7">
        <RadioGroupItem value="myself" id="myself" className="absolute left-0 cursor-pointer" />
        <Label htmlFor="myself" className="text-base font-medium select-none cursor-default">
          Myself
        </Label>
      </div>
      <div className="flex items-center space-x-3 relative pl-7">
        <RadioGroupItem value="others" id="others" className="absolute left-0 cursor-pointer" />
        <Label htmlFor="others" className="text-base font-medium select-none cursor-default">
          Someone else
        </Label>
      </div>
    </RadioGroup>
  </div>
);