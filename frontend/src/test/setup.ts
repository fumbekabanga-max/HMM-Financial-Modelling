import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock react-plotly.js as SVG/Canvas is not implemented in jsdom
vi.mock('react-plotly.js', () => ({
  default: () => React.createElement('div', { 'data-testid': 'mock-plotly-chart' }),
}));

