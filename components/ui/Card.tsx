import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

/** Standard padded surface panel. */
const Card: React.FC<CardProps> = ({ as: Tag = 'div', className, children, ...props }) => (
  <Tag className={cn('card-surface p-4', className)} {...props}>
    {children}
  </Tag>
);

export default Card;
