import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ForgotPasswordForm.css';

const OTPInput = forwardRef(({ 
  length = 6, 
  onComplete, 
  disabled = false,
  autoFocus = true,
  error = ''
}, ref) => {
  const [code, setCode] = useState(Array(length).fill(''));
  const codeInputRefs = useRef([]);

  // Auto focus first input when component mounts
  useEffect(() => {
    if (autoFocus && codeInputRefs.current[0]) {
      setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [autoFocus]);

  // Handle code input change
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only numbers
    
    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last character
    setCode(newCode);
    
    // Auto focus next input
    if (value && index < length - 1 && codeInputRefs.current[index + 1]) {
      codeInputRefs.current[index + 1].focus();
    }
    
    // Call onComplete when all digits are filled
    const codeString = newCode.join('');
    if (codeString.length === length && onComplete) {
      onComplete(codeString);
    }
  };

  // Handle backspace in code input
  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1].focus();
    }
  };

  // Reset code
  const reset = () => {
    setCode(Array(length).fill(''));
    if (codeInputRefs.current[0]) {
      codeInputRefs.current[0].focus();
    }
  };

  // Expose reset method via ref
  useImperativeHandle(ref, () => ({
    reset,
    getValue: () => code.join('')
  }));

  return (
    <div className="form-group">
      <label>Mã xác thực *</label>
      <div className="code-inputs">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (codeInputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength="1"
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onKeyDown={(e) => handleCodeKeyDown(index, e)}
            className="code-input"
            disabled={disabled}
            autoComplete="off"
          />
        ))}
      </div>
      {error && <div className="error-message" style={{ marginTop: '10px' }}>{error}</div>}
    </div>
  );
});

OTPInput.displayName = 'OTPInput';

export default OTPInput;
