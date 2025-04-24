// Mock for Obsidian API

// Simple mock function implementation
function mockFn() {
  const fn = function() { return fn; };
  return fn;
}

export class App {
  vault = {
    getMarkdownFiles: function() { return []; },
    read: function() { return Promise.resolve(''); },
    create: function() { return Promise.resolve({}); },
    modify: function() { return Promise.resolve({}); },
  };
  
  workspace = {
    getLeaf: function() { 
      return {
        openFile: function() {}
      }; 
    },
  };
  
  fileManager = {
    generateMarkdownLink: function() { return '[[link]]'; },
  };
  
  metadataCache = {
    getFileCache: function() { 
      return {
        headings: []
      }; 
    },
  };
}

export class Editor {
  getValue = function() { return ''; };
  setValue = function() {};
  replaceRange = function() {};
  getLine = function() { return ''; };
  lineCount = function() { return 0; };
  getCursor = function() { return { line: 0, ch: 0 }; };
  setCursor = function() {};
  getSelection = function() { return ''; };
}

export class TFile {
  path: string;
  name: string;
  parent: any;
  
  constructor(path = '', name = '', parent = null) {
    this.path = path;
    this.name = name;
    this.parent = parent;
  }
}

export class Notice {
  constructor(message: string) {
    // Mock implementation
  }
}

export class MarkdownView {
  editor: Editor;
  file: TFile;
  
  constructor() {
    this.editor = new Editor();
    this.file = new TFile();
  }
}

export class MarkdownFileInfo {
  file: TFile;
  
  constructor() {
    this.file = new TFile();
  }
}

export class FuzzySuggestModal<T> {
  app: App;
  
  constructor(app: App) {
    this.app = app;
  }
  
  open() {}
  close() {}
  setPlaceholder() {}
  getItems() { return []; }
  getItemText() { return ''; }
  renderSuggestion() {}
  onChooseItem() {}
  getSuggestions() { return []; }
}

export class SuggestModal<T> {
  app: App;
  
  constructor(app: App) {
    this.app = app;
  }
  
  open() {}
  close() {}
  setPlaceholder() {}
  getSuggestions() { return Promise.resolve([]); }
  renderSuggestion() {}
  onChooseSuggestion() {}
}

export class MetadataCache {
  getFileCache() { return null; }
}

export class FuzzyMatch<T> {
  item: T;
  match: { score: number; matches: any[] };
  
  constructor(item: T) {
    this.item = item;
    this.match = { score: 0, matches: [] };
  }
}

// Mock moment function and its methods
function momentFn() {
  return {
    format: function() { return '2023-01-01 00:00:00'; },
    diff: function() { return 0; }
  };
}

// Add static methods to momentFn
(momentFn as any).utc = function() {
  return {
    format: function() { return '00:00:00'; }
  };
};

(momentFn as any).duration = function() {
  return {
    asMilliseconds: function() { return 0; }
  };
};

export const moment = momentFn as any;

// Add any other Obsidian classes or functions needed for tests