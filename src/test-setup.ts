/**
 * Test setup file for Jest
 */

import './__mocks__/dom-helpers';

// jsdom is already set up by jest-environment-jsdom
// Just need to ensure our DOM helpers are loaded

// Mock console methods to reduce noise in tests
global.console = {
	...console,
	log: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

// Setup performance mock
global.performance = {
	now: jest.fn(() => Date.now()),
} as any;
