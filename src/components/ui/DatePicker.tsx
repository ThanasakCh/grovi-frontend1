import { forwardRef } from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale/th';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarIcon } from 'lucide-react';
import './DatePicker.css';

// Register Thai locale
registerLocale('th', th);

export interface DatePickerProps {
  value?: string | Date | null;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, placeholder = "เลือกวันที่", minDate, maxDate, disabled, className }, ref) => {
    
    // Parse incoming value string to Date
    const selectedDate = value ? new Date(value) : null;

    // Handle internal change and emit standard YYYY-MM-DD string
    const handleDateChange = (date: Date | null) => {
      if (date) {
        // Adjust timezone offset to preserve local date string
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        onChange(localDate.toISOString().split('T')[0]);
      } else {
        onChange('');
      }
    };

    const CustomInput = forwardRef<HTMLButtonElement, any>(({ value, onClick }, customRef) => (
      <button
        type="button"
        className={`w-full flex items-center justify-between px-3 min-h-[44px] bg-white border border-gray-300 rounded-lg text-sm transition-all hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${className || ''}`}
        onClick={onClick}
        ref={customRef || ref}
        disabled={disabled}
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-gray-500" />
      </button>
    ));

    return (
      <ReactDatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        locale="th"
        dateFormat="dd MMM yyyy"
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        customInput={<CustomInput />}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        calendarClassName="custom-datepicker"
        wrapperClassName="w-full"
      />
    );
  }
);

DatePicker.displayName = "DatePicker";

export default DatePicker;
