import clsx, { type ClassValue } from 'clsx';

/** Ghép className có điều kiện. */
export const cn = (...args: ClassValue[]) => clsx(args);
