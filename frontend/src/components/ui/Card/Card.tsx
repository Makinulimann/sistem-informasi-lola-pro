import { type ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
    children: ReactNode;
    className?: string;
}

interface CardSectionProps {
    children: ReactNode;
    className?: string;
}

export function Card({ children, className }: CardProps) {
    const classes = [styles.card, className].filter(Boolean).join(' ');
    return <div className={classes}>{children}</div>;
}

export function CardHeader({ children, className }: CardSectionProps) {
    const classes = [styles.header, className].filter(Boolean).join(' ');
    return <div className={classes}>{children}</div>;
}

export function CardBody({ children, className }: CardSectionProps) {
    const classes = [styles.body, className].filter(Boolean).join(' ');
    return <div className={classes}>{children}</div>;
}

export function CardFooter({ children, className }: CardSectionProps) {
    const classes = [styles.footer, className].filter(Boolean).join(' ');
    return <div className={classes}>{children}</div>;
}
