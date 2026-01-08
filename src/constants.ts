// SPDX-License-Identifier: MIT

/**
 * Constants used throughout the extension.
 */

/**
 * Represents the end of a line when creating a Range.
 * Using Number.MAX_VALUE causes VS Code to clamp to the actual line length.
 * This is a common pattern for selecting an entire line without knowing its length.
 */
export const END_OF_LINE = Number.MAX_VALUE;
