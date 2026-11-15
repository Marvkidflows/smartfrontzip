// Vitest setup: DOM matchers (toBeInTheDocument, toHaveAccessibleName, ...) and automatic cleanup between tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
