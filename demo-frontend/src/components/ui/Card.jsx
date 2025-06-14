import React from 'react';

/**
 * Card component for consistent styling across the application
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Card content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.noShadow - Disable shadow if true
 * @param {boolean} props.noPadding - Disable padding if true
 * @param {string} props.variant - Card variant (default, highlight)
 * @param {Function} props.onClick - Click handler
 */
const Card = ({
  children,
  className = '',
  noShadow = false,
  noPadding = false,
  variant = 'default',
  onClick,
  ...props
}) => {
  const baseStyles = "bg-white rounded-lg border border-[#f3e7e8]";
  const shadowStyles = noShadow ? '' : 'shadow-sm';
  const paddingStyles = noPadding ? '' : 'p-6';
  const variantStyles = {
    default: '',
    highlight: 'bg-[#fcf8f8]',
  };

  return (
    <div 
      className={`${baseStyles} ${shadowStyles} ${paddingStyles} ${variantStyles[variant] || variantStyles.default} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card; 