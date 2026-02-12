import { type ReactNode } from 'react';
import styles from './Container.module.css';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl';

interface ContainerProps {
    children: ReactNode;
    size?: ContainerSize;
    className?: string;
}

export function Container({ children, size = 'xl', className }: ContainerProps) {
    const classes = [styles.container, styles[size], className].filter(Boolean).join(' ');
    return <div className={classes}>{children}</div>;
}
