import { useState, useRef, useEffect } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    // Auto-advance to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Fire onComplete when all digits are filled
    const code = newValues.join('');
    if (code.length === length && newValues.every(v => v !== '')) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (values[index] === '' && index > 0) {
        // Move to previous input on backspace when current is empty
        inputRefs.current[index - 1]?.focus();
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
      } else {
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length === 0) {
      return;
    }

    const newValues = [...values];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setValues(newValues);

    // Focus the next empty input or the last one
    const nextEmpty = newValues.findIndex(v => v === '');
    const focusIndex = nextEmpty === -1 ? length - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();

    // Fire onComplete if all filled
    if (newValues.every(v => v !== '')) {
      onComplete(newValues.join(''));
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {values.map((value, index) => (
        <input
          key={index}
          ref={el => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          disabled={disabled}
          className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-finixar-brand-blue focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        />
      ))}
    </div>
  );
}
