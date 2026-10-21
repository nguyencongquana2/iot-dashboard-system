import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './PageSizeSelector.css';

export const PageSizeSelector = ({
  value = 10,
  onChange,
  options = [10, 15, 20, 30, 40, 50],
  label = 'Số dòng mỗi trang'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);

  // Auto calculate if dropdown should open upward or downward based on viewport space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const approxHeight = options.length * 40 + 20;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < approxHeight && rect.top > approxHeight) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen, options.length]);

  // Click outside and ESC key listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    if (onChange && option !== value) {
      onChange(option);
    }
    setIsOpen(false);
  };

  return (
    <div className="page-size-selector-wrap" ref={containerRef}>
      {label && <span className="page-size-label-text">{label}</span>}
      <div className="page-size-dropdown-box">
        <button
          type="button"
          className={`page-size-trigger-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title="Chọn số dòng mỗi trang"
        >
          <span className="page-size-trigger-val">{value}</span>
          <ChevronDown
            size={15}
            className={`page-size-chevron ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <ul
            className={`page-size-menu-popup ${openUpward ? 'open-up' : 'open-down'}`}
            role="listbox"
          >
            {options.map((option) => {
              const isSelected = Number(option) === Number(value);
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={isSelected}
                  className={`page-size-option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {isSelected && (
                    <Check size={16} strokeWidth={2.8} className="option-check-icon" />
                  )}
                  <span className="option-number">{option}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
