// Mock for @codemirror/view

export class EditorView {
  state: any;
  
  constructor(config: any = {}) {
    this.state = config.state || null;
  }
  
  dispatch(transaction: any) {
    // Mock implementation
  }
}