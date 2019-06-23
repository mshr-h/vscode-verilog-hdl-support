import { SymbolInformation, Location, Range, CancellationToken, workspace, TreeDataProvider, TreeItem, EventEmitter, Event, TreeItemCollapsibleState } from 'vscode';

export default class VerilogTreeDataProvider implements TreeDataProvider<TreeItem> {
    
    private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
    readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event

    public getTreeItem(element: TreeItem): Promise<TreeItem> {
        return new Promise((resolve, reject) => {
            resolve(element);
        });
    }
    
    public getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        return new Promise((resolve, reject) => {
            if (!element) {
                resolve([new TreeItem('testRoot', TreeItemCollapsibleState.Collapsed)])
            } else {
                resolve([new TreeItem('testChild')]);
            }
        });
    }
}
