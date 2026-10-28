import React from 'react';
import './Button.css';

function Button({ children, variant = 'primary', size = 'md', onClick, type = 'button', disabled = false, className = '' }) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
