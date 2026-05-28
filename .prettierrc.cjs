/**
 * Prettier Configuration
 *
 * Specification: specs/002-code-quality-cicd/spec.md
 * - printWidth: 120 characters
 * - useTabs: true (accessibility - except YAML/MD/SH)
 * - singleQuote: true
 * - semi: false (relying on ASI)
 * - trailingComma: 'es5'
 */

module.exports = {
	// Core formatting rules
	printWidth: 120,
	tabWidth: 4,
	useTabs: true,
	semi: false,
	singleQuote: true,
	trailingComma: 'es5',
	bracketSpacing: true,
	arrowParens: 'avoid',

	// File type specific overrides
	overrides: [
		{
			// YAML files: 2 spaces, no tabs
			files: ['*.yml', '*.yaml'],
			options: {
				tabWidth: 2,
				useTabs: false,
			},
		},
		{
			// JSON files: tabs (consistent with TS/JS)
			files: ['*.json', '*.jsonc'],
			options: {
				useTabs: true,
				tabWidth: 4,
			},
		},
		{
			// Markdown: always wrap prose, 2 spaces
			files: ['*.md'],
			options: {
				proseWrap: 'always',
				tabWidth: 2,
				useTabs: false,
			},
		},
		{
			// Shell scripts: 2 spaces
			files: ['*.sh'],
			options: {
				tabWidth: 2,
				useTabs: false,
			},
		},
	],
}