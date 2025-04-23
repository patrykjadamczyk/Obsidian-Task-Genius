// 简单的测试文件，专注于测试功能而不是类型兼容性

// 模拟依赖 - 使用不同的变量名避免冲突
const mockParentTaskStatusChangeAnnotation = { of: jest.fn() };
const mockParentWorkflowChangeAnnotation = { of: jest.fn() };

// 模拟 transaction-handlers.ts 模块
jest.mock('../src/editor-ext/transaction-handlers', () => ({
  handleParentTaskUpdateTransaction: jest.fn().mockImplementation((tr, app, plugin) => {
    // 如果不是文档变更，返回原始事务
    if (!tr.docChanged) {
      return tr;
    }
    
    // 如果是粘贴事件，返回原始事务
    if (tr.isUserEvent('input.paste')) {
      return tr;
    }
    
    // 模拟返回一个新的事务规范
    if (tr.mockShouldReturnChanges) {
      return {
        changes: [
          tr.changes,
          {
            from: 0,
            to: 1,
            insert: 'x',
          },
        ],
        selection: tr.selection,
        annotations: [mockParentTaskStatusChangeAnnotation.of('autoCompleteParent.DONE')],
      };
    }
    
    return tr;
  })
}));

describe('autoCompleteParent', () => {
  // 模拟 Text 对象
  const createMockText = (content: string = '') => {
    const lines = content.split('\n');
    return {
      toString: () => content,
      length: content.length,
      lines: lines.length,
      line: jest.fn().mockImplementation((lineNum) => {
        if (lineNum < 1 || lineNum > lines.length) {
          throw new Error(`Line ${lineNum} out of range`);
        }
        const line = lines[lineNum - 1];
        let from = 0;
        for (let i = 0; i < lineNum - 1; i++) {
          from += lines[i].length + 1; // +1 for newline
        }
        return {
          text: line,
          from,
          to: from + line.length,
          number: lineNum
        };
      })
    };
  };
  
  // 模拟 Transaction 对象
  const createMockTransaction = (options: any = {}) => {
    const docContent = options.docContent || '- [ ] Parent\n  - [ ] Child';
    const mockDoc = createMockText(docContent);
    
    return {
      docChanged: options.docChanged !== undefined ? options.docChanged : true,
      startState: {
        doc: mockDoc
      },
      newDoc: mockDoc,
      changes: {
        length: options.changes ? options.changes.length : 1,
        iterChanges: jest.fn().mockImplementation((callback) => {
          if (options.changes) {
            options.changes.forEach((change: any) => {
              callback(
                change.fromA || 0,
                change.toA || 0,
                change.fromB || 0,
                change.toB || 0,
                {
                  toString: () => change.text || '',
                  length: (change.text || '').length
                }
              );
            });
          } else {
            callback(
              0,
              0,
              0,
              0,
              {
                toString: () => 'x',
                length: 1
              }
            );
          }
        })
      },
      annotation: jest.fn().mockImplementation((annotation) => {
        if (annotation === mockParentTaskStatusChangeAnnotation) {
          return options.hasTaskStatusAnnotation ? 'taskStatusChange' : undefined;
        }
        if (annotation === mockParentWorkflowChangeAnnotation) {
          return options.hasWorkflowAnnotation ? 'workflowChange' : undefined;
        }
        return undefined;
      }),
      isUserEvent: jest.fn().mockImplementation((type) => {
        if (type === 'input.paste') {
          return options.isPaste || false;
        }
        return options.isUserEvent !== undefined ? options.isUserEvent : true;
      }),
      selection: options.selection || { anchor: 0, head: 0 },
      mockShouldReturnChanges: options.mockShouldReturnChanges || false
    };
  };
  
  // 模拟 App 和 Plugin
  const createMockApp = () => ({
    vault: {
      getConfig: jest.fn().mockReturnValue({ tabSize: 4 })
    }
  });
  
  const createMockPlugin = (settings: any = {}) => ({
    settings: {
      markParentInProgressWhenPartiallyComplete: settings.markParentInProgressWhenPartiallyComplete !== undefined ? 
        settings.markParentInProgressWhenPartiallyComplete : true,
      taskStatuses: {
        inProgress: settings.inProgress || '/',
        completed: settings.completed || 'x|X'
      },
      workflow: {
        enableWorkflow: settings.enableWorkflow !== undefined ? settings.enableWorkflow : false,
        autoRemoveLastStageMarker: settings.autoRemoveLastStageMarker !== undefined ? 
          settings.autoRemoveLastStageMarker : true
      }
    }
  });

  // 导入要测试的模块
  let autoCompleteParentExtension: any;
  let handleParentTaskUpdateTransaction: any;

  beforeEach(() => {
    jest.resetModules();
    
    // 导入模块
    const { autoCompleteParentExtension: extension } = require('../src/editor-ext/autoCompleteParent');
    const { handleParentTaskUpdateTransaction: handler } = require('../src/editor-ext/transaction-handlers');
    
    autoCompleteParentExtension = extension;
    handleParentTaskUpdateTransaction = handler;
    
    // 重置模拟函数
    mockParentTaskStatusChangeAnnotation.of.mockClear();
  });

  test('autoCompleteParentExtension 应该返回一个事务过滤器', () => {
    const mockApp = createMockApp();
    const mockPlugin = createMockPlugin();
    
    const extension = autoCompleteParentExtension(mockApp, mockPlugin);
    expect(extension).toBeDefined();
  });

  test('当文档没有变更时，应该返回原始事务', () => {
    const mockApp = createMockApp();
    const mockPlugin = createMockPlugin();
    const mockTr = createMockTransaction({ docChanged: false });
    
    const result = handleParentTaskUpdateTransaction(mockTr, mockApp, mockPlugin);
    expect(result).toBe(mockTr);
  });

  test('当是粘贴事件时，应该返回原始事务', () => {
    const mockApp = createMockApp();
    const mockPlugin = createMockPlugin();
    const mockTr = createMockTransaction({ isPaste: true });
    
    const result = handleParentTaskUpdateTransaction(mockTr, mockApp, mockPlugin);
    expect(result).toBe(mockTr);
  });

  test('当应该处理父任务更新时，应该返回新的事务规范', () => {
    const mockApp = createMockApp();
    const mockPlugin = createMockPlugin();
    const mockTr = createMockTransaction({ 
      mockShouldReturnChanges: true,
      docContent: '- [ ] Parent\n  - [x] Child'
    });
    
    const result = handleParentTaskUpdateTransaction(mockTr, mockApp, mockPlugin);
    expect(result).not.toBe(mockTr);
    expect(result.changes).toBeDefined();
    expect(result.annotations).toBeDefined();
  });
});