/**
 * File type utilities for task parsing
 */

import { TFile } from "obsidian";

/**
 * Supported file types for task parsing
 */
export enum SupportedFileType {
    MARKDOWN = 'md',
    CANVAS = 'canvas'
}

/**
 * Check if a file is supported for task parsing
 */
export function isSupportedFile(file: TFile): boolean {
    return isSupportedFileExtension(file.extension);
}

/**
 * Check if a file extension is supported for task parsing
 */
export function isSupportedFileExtension(extension: string): boolean {
    return Object.values(SupportedFileType).includes(extension as SupportedFileType);
}

/**
 * Get the file type from a file
 */
export function getFileType(file: TFile): SupportedFileType | null {
    if (file.extension === SupportedFileType.MARKDOWN) {
        return SupportedFileType.MARKDOWN;
    }
    if (file.extension === SupportedFileType.CANVAS) {
        return SupportedFileType.CANVAS;
    }
    return null;
}

/**
 * Check if a file is a markdown file
 */
export function isMarkdownFile(file: TFile): boolean {
    return file.extension === SupportedFileType.MARKDOWN;
}

/**
 * Check if a file is a canvas file
 */
export function isCanvasFile(file: TFile): boolean {
    return file.extension === SupportedFileType.CANVAS;
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
    return Object.values(SupportedFileType);
}

/**
 * Create a file filter function for supported files
 */
export function createSupportedFileFilter() {
    return (file: TFile) => isSupportedFile(file);
}
