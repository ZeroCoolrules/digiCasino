import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...rest
}: ButtonProps) {
  const variantClass = variant === 'primary' ? styles.primary : styles.secondary;
  const classNames = [styles.button, variantClass, className].filter(Boolean).join(' ');

  return (
    <button className={classNames} {...rest}>
      {children}
    </button>
  );
}

export default Button;
