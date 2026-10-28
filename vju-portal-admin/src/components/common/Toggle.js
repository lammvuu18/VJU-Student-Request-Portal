import React from 'react';
import './Toggle.css';

function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-wrapper">
      {label && <span className="toggle-label">{label}</span>}
      <div className={`toggle ${checked ? 'toggle--on' : ''}`} onClick={() => onChange(!checked)}>
        <div className="toggle-thumb" />
      </div>
      {checked && <span className="toggle-status">Hoạt động</span>}
    </label>
  );
}

export default Toggle;
