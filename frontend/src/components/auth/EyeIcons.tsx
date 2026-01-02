"use client";

interface IconProps {
  className?: string;
}

export function EyeFilledIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      className={className}
    >
      <path
        d="M21.25 9.15C18.94 5.52 15.56 3.43 12 3.43c-1.78 0-3.51.52-5.09 1.49-1.58.98-2.99 2.44-4.16 4.23-.78 1.19-.78 3.01 0 4.2 2.31 3.64 5.69 5.72 9.25 5.72 1.78 0 3.51-.52 5.09-1.49 1.58-.98 2.99-2.44 4.16-4.23.78-1.18.78-3 0-4.2zM12 16.04c-2.24 0-4.04-1.81-4.04-4.04S9.76 7.96 12 7.96s4.04 1.81 4.04 4.04-1.8 4.04-4.04 4.04z"
        fill="currentColor"
      />
      <path
        d="M12 9.14a2.855 2.855 0 000 5.71 2.855 2.855 0 000-5.71z"
        fill="currentColor"
      />
    </svg>
  );
}

export function EyeSlashFilledIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      className={className}
    >
      <path
        d="M21.27 9.18c-1.21-1.9-2.65-3.38-4.28-4.4a.75.75 0 00-.79 1.28c1.44.9 2.73 2.24 3.82 3.95.55.86.55 1.99 0 2.85-2.13 3.34-5.22 5.33-8.52 5.33-1.47 0-2.91-.38-4.28-1.12a.75.75 0 10-.68 1.34c1.56.84 3.18 1.28 4.96 1.28 3.82 0 7.33-2.28 9.67-6.27.77-1.2.77-2.98.1-4.24z"
        fill="currentColor"
      />
      <path
        d="M9.34 15.53a.75.75 0 00-1.06 1.06l1.06-1.06zm5.32-5.32l.53-.53-.53.53zM12 9.14c1.57 0 2.86 1.29 2.86 2.86h1.5c0-2.41-1.95-4.36-4.36-4.36v1.5zM14.86 12c0 .79-.32 1.5-.84 2.02l1.06 1.06A4.343 4.343 0 0016.36 12h-1.5zm-.84 2.02a2.85 2.85 0 01-2.02.84v1.5c1.2 0 2.29-.49 3.08-1.28l-1.06-1.06zM12 14.86c-.79 0-1.5-.32-2.02-.84l-1.06 1.06c.79.79 1.88 1.28 3.08 1.28v-1.5zm-2.02-.84a2.85 2.85 0 01-.84-2.02h-1.5c0 1.2.49 2.29 1.28 3.08l1.06-1.06zM9.14 12c0-1.57 1.29-2.86 2.86-2.86v-1.5c-2.41 0-4.36 1.95-4.36 4.36h1.5z"
        fill="currentColor"
      />
      <path
        d="M2 2l20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M9.77 4.87C10.47 4.67 11.22 4.57 12 4.57c3.3 0 6.39 1.99 8.52 5.33.28.44.44.91.48 1.39"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M5.83 7.16C4.39 8.17 3.12 9.53 2.1 11.14c-.55.86-.55 1.99 0 2.85 2.13 3.34 5.22 5.33 8.52 5.33"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
