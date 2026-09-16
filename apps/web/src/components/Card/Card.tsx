import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
}

export function Card({ title, className, children, ...rest }: CardProps) {
  const classNames = [styles.card, className].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...rest}>
      {title ? <h3 className={styles.title}>{title}</h3> : null}
      {children}
    </div>
  );
}

export default Card;
