import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  animated = false,
  animationProps = {},
  type = 'button',
  ...props
}, ref) => {
  const getBaseClasses = () => {
    const base = [
      'inline-flex items-center justify-center font-medium transition-colors duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed'
    ];
    
    // Don't add default rounded-lg for tab variants
    if (!variant.startsWith('tab')) {
      base.push('rounded-lg');
    }
    
    return base.join(' ');
  };

  const variantClasses = {
    primary: [
      'bg-[#994d51] text-white',
      'hover:bg-[#1b0e0e]',
      'focus-visible:ring-[#994d51]',
      'disabled:bg-gray-300 disabled:text-gray-500'
    ].join(' '),
    
    secondary: [
      'bg-[#f3e7e8] text-[#994d51]',
      'hover:bg-[#994d51] hover:text-white',
      'focus-visible:ring-[#994d51]',
      'disabled:bg-gray-100 disabled:text-gray-400'
    ].join(' '),
    
    ghost: [
      'bg-transparent text-[#1b0e0e]',
      'hover:text-[#994d51]',
      'focus-visible:ring-[#994d51]',
      'disabled:text-gray-400'
    ].join(' '),
    
    outline: [
      'bg-transparent border border-[#f3e7e8] text-[#994d51]',
      'hover:bg-[#fcf8f8]',
      'focus-visible:ring-[#994d51]',
      'disabled:border-gray-200 disabled:text-gray-400'
    ].join(' '),
    
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700',
      'focus-visible:ring-red-500',
      'disabled:bg-gray-300 disabled:text-gray-500'
    ].join(' '),
    
    cancel: [
      'bg-gray-100 text-gray-700',
      'hover:bg-gray-200',
      'focus-visible:ring-gray-400',
      'disabled:bg-gray-100 disabled:text-gray-400'
    ].join(' '),
    
    tab: [
      'flex-1 transition-colors duration-200',
      'focus-visible:ring-2 focus-visible:ring-[#994d51] focus-visible:ring-inset',
      'rounded-none', // Override default rounded-lg for tabs
      // Dynamic classes will be handled by parent for active state
    ].join(' '),
    
    'tab-left': [
      'flex-1 transition-colors duration-200',
      'focus-visible:ring-2 focus-visible:ring-[#994d51] focus-visible:ring-inset',
      'rounded-tl-lg', // Only top-left rounded
    ].join(' '),
    
    'tab-right': [
      'flex-1 transition-colors duration-200',
      'focus-visible:ring-2 focus-visible:ring-[#994d51] focus-visible:ring-inset',
      'rounded-tr-lg', // Only top-right rounded
    ].join(' '),
    
    'tab-inner': [
      'flex-1 transition-colors duration-200',
      'focus-visible:ring-2 focus-visible:ring-[#994d51] focus-visible:ring-inset',
      'rounded-none', // No border radius for inner tabs
    ].join(' '),
    
    icon: [
      'text-[#994d51] hover:text-[#1b0e0e]',
      'transition-colors duration-200',
      'focus-visible:ring-2 focus-visible:ring-[#994d51] focus-visible:ring-offset-2',
      'p-2 rounded'
    ].join(' '),
    
    export: [
      'p-6 border border-[#f3e7e8] rounded-lg',
      'hover:bg-[#fcf8f8] transition-colors duration-200',
      'text-left focus-visible:ring-2 focus-visible:ring-[#994d51] focus-visible:ring-offset-2',
      'h-fit'
    ].join(' ')
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    icon: 'p-2',
    tab: 'px-4 py-3 text-sm',
    export: 'p-6 text-base'
  };

  const getSize = () => {
    if (variant === 'tab' || variant === 'tab-left' || variant === 'tab-right' || variant === 'tab-inner') return sizeClasses.tab;
    if (variant === 'icon') return sizeClasses.icon;
    if (variant === 'export') return sizeClasses.export;
    return sizeClasses[size] || sizeClasses.md;
  };

  const combinedClasses = [
    getBaseClasses(),
    variantClasses[variant] ?? variantClasses.primary,
    getSize() ?? sizeClasses.md,
    className
  ].filter(Boolean).join(' ');

  const buttonContent = (
    <>
      {loading && (
        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2 flex-shrink-0" />
      )}
      {leftIcon && !loading && (
        <span className="md:mr-2 flex-shrink-0">{leftIcon}</span>
      )}
      <span className={variant === 'export' ? '' : 'flex-1 text-center'}>{children}</span>
      {rightIcon && (
        <span className="ml-2 flex-shrink-0">{rightIcon}</span>
      )}
    </>
  );

  const buttonProps = {
    ref,
    type,
    disabled: disabled || loading,
    className: combinedClasses,
    ...props
  };

  if (animated) {
    return (
      <motion.button
        {...buttonProps}
        {...animationProps}
      >
        {buttonContent}
      </motion.button>
    );
  }

  return (
    <button {...buttonProps}>
      {buttonContent}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;