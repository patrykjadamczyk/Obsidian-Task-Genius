#!/usr/bin/env node

/**
 * Script to run weekend hiding tests specifically
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Weekend Hiding Tests...\n');

try {
	// Run the specific test files for weekend hiding
	const testCommand = 'npx jest src/components/calendar/views/__tests__/month-view.test.ts src/components/calendar/views/__tests__/year-view.test.ts --verbose';
	
	console.log('Running command:', testCommand);
	console.log('─'.repeat(50));
	
	const result = execSync(testCommand, {
		stdio: 'inherit',
		cwd: process.cwd()
	});
	
	console.log('\n✅ All weekend hiding tests passed!');
	
} catch (error) {
	console.error('\n❌ Some tests failed:');
	console.error(error.message);
	process.exit(1);
}
